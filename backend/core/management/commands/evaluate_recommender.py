# core/management/commands/evaluate_recommender.py
import math
import random
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from core.services.helper_recommendations import BiasedMF, load_dataset_ratings

# ==========================================================================================
#    Evaluation of the Biased Matrix  Factorization
# ==========================================================================================
#     Commands:
#     python manage.py evaluate_recommender
#     python manage.py evaluate_recommender --tune
# 
#     Two kinds of measurement, because they answer different questions (slide 50):
#   * MAE and RMSE say how close a predicted rating is to the real one.
#   * Precision@K and Recall@K say whether the events a user actually wanted
#     turn up near the top of the list, which is what a recommender is for.
# ===========================================================================================

DEFAULT_CSV = Path(settings.BASE_DIR).parent/'rel_event_csvs'/'event_interest.csv'

# a held-out rating counts as relevant from here up; 
# used to build T_u: on our scale only interested=1 (5.0) clears this line
RELEVANT_FROM = 4.0

# calculate MAE = (1/J) * sum |R_j - P_j| (slide 49)
def calc_mean_absolute_error(model, rows):
    return sum(abs(rating - model.predict(user_id, event_id))
               for user_id, event_id, rating in rows) / len(rows)

# calculate T_u which are the events the user really wanted to go, per user (slide 51)
def _relevant_per_user(held_out):
    relevant = {}
    for user_id, event_id, rating in held_out:
        if rating >= RELEVANT_FROM:
            relevant.setdefault(user_id, set()).add(event_id)
    return relevant

# what each user rated already so it won't be a part of the recommendations
def _rated_per_user(train_rows):
    rated = {}
    for user_id, event_id, _ in train_rows:
        rated.setdefault(user_id, set()).add(event_id)
    return rated

# for each user with at least one relevant event in the held-out fold, rank
# every event they did not rate during training and look at the top K
# Formulas: (slide 51)
# Precision@K = |L_u(K) and T_u| / K
# Recall@K    = |L_u(K) and T_u| / |T_u|
def ranking_metrics(model, train_rows, held_out, top_k):

    rated = _rated_per_user(train_rows)
    relevant = _relevant_per_user(held_out)
    if not relevant:
        return None, None

    all_events = list(model.event_index)
    precision_total = recall_total = 0.0

    for user_id, wanted in relevant.items():
        seen = rated.get(user_id, ())
        candidates = [e for e in all_events if e not in seen]
        ranked = sorted(candidates,
                        key=lambda e: (-model.predict(user_id, e), e))[:top_k]
        hits = len(set(ranked) & wanted)
        precision_total += hits / top_k
        recall_total += hits / len(wanted)

    # return the calc Precision@K and Recall@K
    return precision_total / len(relevant), recall_total / len(relevant)


# Precision@K from pure guessing: a user's relevant events over the events they could have been shown. 
# It is the baseline the real score is compared to.
def random_precision(model, train_rows, held_out):

    rated = _rated_per_user(train_rows)
    relevant = _relevant_per_user(held_out)
    if not relevant:
        return None

    total = len(model.event_index)
    return sum(len(wanted) / max(1, total - len(rated.get(user_id, ())))
                for user_id, wanted in relevant.items()) / len(relevant)

# the set of ratings are split into l roughly equal subsets
def make_folds(S, folds, seed):
    rows = S[:]
    random.Random(seed).shuffle(rows)
    return [rows[n::folds] for n in range(folds)]

class Command(BaseCommand):
    help = 'Evaluate the Biased MF recommender on the e-class dataset'

    # command's args
    def add_arguments(self, parser):
        parser.add_argument('--csv', default=str(DEFAULT_CSV), help='path to the event_interest.csv')
        parser.add_argument('--folds', type=int, default=5, help='number of l for l-fold cross-validation')
        parser.add_argument('--top_K', type=int, default=5, help='K for Precision@K and Recall@K (slide 51)')
        parser.add_argument('--seed', type=int, default=0, help='seed for the split, so a run reproduces')
        parser.add_argument('--tune', action='store_true', help='grid over K, lambda and eta')

    # l-fold cross-validation (slide 52)
    def cross_validate(self, S, options):

        # split the rating into l equal subsets (step 1 slide 52)
        folds = make_folds(S, options['folds'], options['seed'])
        top_k = options['top_K']
        self.stdout.write(f'\n{options["folds"]}-fold cross-validation, top-{top_k} for the ranking metrics. This takes a minute.\n')

        header = (f'{"fold":>4} {"epochs":>7} {"MAE":>8} {"RMSE":>8} '
                  f'{"RMSE(mu)":>9} {"P@" + str(top_k):>8} {"R@" + str(top_k):>8}')
        self.stdout.write(header)
        self.stdout.write('-' * len(header))

        sums = dict(mae=0.0, rmse=0.0, base=0.0, precision=0.0, recall=0.0, random=0.0)

        # for each fold (step 2 slide 52)
        for n, held_out in enumerate(folds, 1):
            # the rest subsets are used for training (step2.2 slide 52)
            train = [row for m, fold in enumerate(folds, 1) if m != n for row in fold]
            # one subset is kept for validation set (step2.1 slide 52)
            model = BiasedMF().fit(train, validation=held_out)

            
            # calc mae,rmse, mu, base, precision,recall (step2.3 slide 52)
            mae = calc_mean_absolute_error(model, held_out)
            rmse = model.rmse_on(held_out)
            mu = sum(rating for _, _, rating in train) / len(train)
            base = math.sqrt(sum((rating - mu) ** 2
                                 for _, _, rating in held_out) / len(held_out))
            precision, recall = ranking_metrics(model, train, held_out, top_k)

            sums['mae'] += mae
            sums['rmse'] += rmse
            sums['base'] += base
            sums['precision'] += precision
            sums['recall'] += recall
            sums['random'] += random_precision(model, train, held_out)

            self.stdout.write(f'{n:>4} {model.epochs_run:>7} {mae:>8.4f} {rmse:>8.4f} '
                              f'{base:>9.4f} {precision:>8.5f} {recall:>8.5f}')

        # print the average of metrics on l folds
        total_folds = len(folds)
        self.stdout.write('-' * len(header))
        self.stdout.write(f'{"mean":>4} {"":>7} {sums["mae"] / total_folds:>8.4f} '
                          f'{sums["rmse"] / total_folds:>8.4f} {sums["base"] / n:>9.4f} '
                          f'{sums["precision"] / total_folds:>8.5f} {sums["recall"] / n:>8.5f}')

        self.stdout.write(
            f'\nRMSE is {100 * (sums["base"] - sums["rmse"]) / sums["base"]:.1f}% below predicting mu for every cell.'
            f'\nPrecision@{top_k} is {sums["precision"] / sums["random"]:.0f}x what random '
            f'guessing gives ({sums["random"] / total_folds:.5f}).')

    # choose the model based on validation error (step 5 slide 38)
    # train/validate is 80/20 split
    def tune(self, S, options):
        rows = S[:]
        # 80/20 split
        random.Random(options['seed']).shuffle(rows)
        cut = int(0.8 * len(rows))
        train, validation = rows[:cut], rows[cut:]

        # calc mu, base
        mu = sum(rating for _, _, rating in train) / len(train)
        base = math.sqrt(sum((rating - mu) ** 2
                             for _, _, rating in validation) / len(validation))
        self.stdout.write(f'\ntrain {len(train)} / validation {len(validation)}, '
                          f'baseline RMSE {base:.4f}\n')

        header = f'{"K":>3} {"lambda":>7} {"eta":>6} {"epochs":>7} {"val RMSE":>9}'
        self.stdout.write(header)
        self.stdout.write('-' * len(header))

        # print data to decide the optimal
        for factors in (1, 2, 4, 8):
            for regularization in (0.01, 0.02, 0.05, 0.15):
                for learning_rate in (0.001, 0.002, 0.005, 0.01):
                    model = BiasedMF(factors=factors,
                                     regularization=regularization,
                                     learning_rate=learning_rate).fit(train, validation=validation)
                    self.stdout.write(f'{factors:>3} {regularization:>7.2f} '
                                      f'{learning_rate:>6.3f} {model.epochs_run:>7} '
                                      f'{model.val_rmse:>9.4f}')

        self.stdout.write('\nval RMSE is read at the stopping epoch, which is PATIENCE '
                          'epochs after the best - the same for every row, so the '
                          'comparison is fair.')

    def handle(self, *args, **options):
        try:
            S = load_dataset_ratings(options['csv'])
        except OSError as exc:
            raise CommandError(f'could not read {options["csv"]}: {exc}')
        if not S:
            raise CommandError(f'no usable ratings in {options["csv"]}')

        users = len({u for u, _, _ in S})
        events = len({e for _, e, _ in S})
        self.stdout.write(f'dataset : {options["csv"]}')
        self.stdout.write(f'|S|     : {len(S)}   ({users} users x {events} events, '
                          f'{100 * len(S) / (users * events):.3f}% dense)')

        if options['tune']:
            self.tune(S, options)
        else:
            self.cross_validate(S, options)

