# core/services/helper_recommendations.py

import csv, math, random
from core.models import Booking, EventView

# ===========================================
#   rating scale for recommendations
# ===========================================

"""
We read from the csv files if the user was interested or not interested for an event.
In the live site the users don't rate the events so for the creation of the ratin system
we consider the bookings which are made and the times they browsed an event.
"""

# based on event interest dataset
RATING_INTERESTED = 5.0    # flag intersted=1
RATING_NOT_INTERESTED = 1.0  # flag not_intrested=1
RATING_NEUTRAL = 3.0      # flag intrested=not_intrested=0 which means neutral

# rating from live site if a user has made a booking
RATING_CONFIRMED = 5.0    # booking made

# rating from live site if a user had viewed the event and also a weight for the amount of times
VIEW_BASE = 1.5  # event viewed 
VIEW_STEP = 0.5   # +0.5 every time he visits the event
VIEW_CEILING = 3.0  # max rating only to get from views


def view_rating(view_count):
    return min(VIEW_CEILING, VIEW_BASE + VIEW_STEP * view_count)


# from the event_interest_dataset create S (user_id, event_id, rating) which is the set of known ratings
def load_dataset_ratings(csv_path):

    # use dict in order to skip the double entries which may exist
    ratings = {}

    with open(csv_path, newline='') as handle:
        for row in csv.DictReader(handle):
            # an event id must exist
            try:
                user_id = int(row['user'])
                event_id = int(row['event'])
                interested = int(row['interested'])
                not_interested = int(row['not_interested'])
            except (TypeError, ValueError):
                continue

            if interested:
                rating = RATING_INTERESTED
            elif not_interested:
                rating = RATING_NOT_INTERESTED
            else:
                rating = RATING_NEUTRAL

            # some pairs might carry identical labels so overwriting doesn;t lose anything
            ratings[(user_id, event_id)] = rating

    return [(user_id, event_id, rating)
            for (user_id, event_id), rating in ratings.items()]

# build data from the users' live site interactions (bookings + count_views)
def build_interactions():
    ratings = {}

    # a rating from how many times an event page is opened
    for user_id, event_id, view_count in EventView.objects.values_list(
        'user_id', 'event_id', 'view_count'
    ):
        ratings[(user_id, event_id)] = view_rating(view_count)

    # get the rating from a booking
    for user_id, event_id in Booking.objects.filter(
        status=Booking.BookingStatus.CONFIRMED
    ).values_list('attendee_id', 'event_id'):
        # a confirmed booking outranks a viewed event, so it overrides the
        # view rating for the same event, and a second booking doesn't change anything
        ratings[(user_id, event_id)] = RATING_CONFIRMED

    return [(user_id, event_id, rating)
            for (user_id, event_id), rating in ratings.items()]


# ===========================================
#   Biased Matrix Factorization
# ===========================================
K = 2                   # how many dimensions describe each user and each event
LEARNING_RATE = 0.01    # eta - how far each step moves, if it is too big overshoots the minimum and bounces if it too small need many more epochs
                        # same accuracy as 0.05
REGULARIZATION = 0.005   # lambda - the penalty that keeps the weights small, slide 36(λ(Σ‖v‖² + Σ‖f‖² + Σb² + Σc²))
                        # minimum bracketed: 0.01/0.02 differ by 0.0001
MAX_EPOCHS = 17         # no validation slice is available when the live model is fitted, so the stopping rule cannot fire and this ceiling is what ends training
PATIENCE = 2            # stop after this many epochs with no improvement, taken from slides
SEED = 67               # fixes the randomness so two runs on the same data give the same model



# X_hat(i, j) = μ + b[i] + c[j] + V[i] . F[j]
#     μ    the mean of the known ratings - a baseline for everybody
#     b[i]  user bias
#     c[j]  event bias
#     V[i]  the user's K latent features
#     F[j]  the event's K latent features
#     V[i] * F[j] = interaction between users and events
# Trained with stochastic gradient descent over S only. A cell which doesn't belong in
# S is never a training row, it is a value to predict, not a zero to learn from.
class BiasedMF:

    def __init__(self, factors=K, learning_rate=LEARNING_RATE,
                 regularization=REGULARIZATION, max_epochs=MAX_EPOCHS,
                 patience=PATIENCE, seed=SEED):
        self.factors = factors
        self.learning_rate = learning_rate
        self.regularization = regularization
        self.max_epochs = max_epochs
        self.patience = patience
        self.seed = seed

        self.mu = 0.0      # μ
        self.user_index = {}
        self.event_index = {}
        self.b = []
        self.c = []
        self.V = []
        self.F = []
        self.rmse = None
        self.val_rmse = None
        self.epochs_run = 0

    def fit(self, S, validation=None):
        """
        Steps 1-4 of slide 38, plus the stopping rule from slide 29 from recommendations.pdf, eclass
        `validation` is a held-out slice of S; when it is given the stopping rule 
        watches the error on it rather than the training error, because the training error keeps 
        falling long after the model has stopped getting better.
        """
        if not S:
            return self

        # indexing: users are rows of V and b, events are rows of F and c
        # map users from 0 to N-1 and events from 0 to M-1 so V and F are plain lists
        self.user_index = {user_id: n for n, user_id
                           in enumerate(sorted({u for u, _, _ in S}))}
        self.event_index = {event_id: n for n, event_id
                            in enumerate(sorted({e for _, e, _ in S}))}

        # calc average of mu (step 1, slide 38)
        self.mu = sum(rating for _, _, rating in S) / len(S)

        # b, c initialization (step 2, slide 38)
        self.b = [0.0] * len(self.user_index)
        self.c = [0.0] * len(self.event_index)

        
        # V and F start at small random values centred on zero (mean 0, sd 0.1) (step 3, slide 38)
        # they must not be identical for this reason we use gauss
        rng = random.Random(self.seed)
        self.V = [[rng.gauss(0, 0.1) for _ in range(self.factors)]
                  for _ in self.user_index]
        self.F = [[rng.gauss(0, 0.1) for _ in range(self.factors)]
                  for _ in self.event_index]
        
        # samples is just S translated from ids into positions, so the lists can be indexed.
        samples = [(self.user_index[u], self.event_index[e], rating)
                   for u, e, rating in S]

        best = None
        stale = 0

        # for each epoch (step 4, slide 38)
        for epoch in range(1, self.max_epochs + 1):  
            # shuffle the samples each epoch so the row order doesn't bias the walk
            rng.shuffle(samples)                       
            squared_error = 0.0
            
            for i, j, rating in samples:                  
                V_i, F_j = self.V[i], self.F[j]

                # calc X_hat[i][j]  (step 4.1, slide 38)
                prediction = self.mu + self.b[i] + self.c[j] + sum(
                    V_i[k] * F_j[k] for k in range(self.factors)
                )

                # calc error (step 4.2, slide 38)
                error = rating - prediction
                squared_error += error * error

                # update b[i], c[j], V[i], F[j] (step 4.3, slide 38)
                self.b[i] += self.learning_rate * (error - self.regularization * self.b[i])
                self.c[j] += self.learning_rate * (error - self.regularization * self.c[j])
                for k in range(self.factors):
                    v_old = V_i[k]
                    V_i[k] += self.learning_rate * (error * F_j[k] - self.regularization * v_old)
                    F_j[k] += self.learning_rate * (error * v_old - self.regularization * F_j[k])

            # calc RMSE for this epoch (slide 29) 
            self.rmse = math.sqrt(squared_error / len(samples))
            self.epochs_run = epoch

            # in case RMSE is not decreased for two consecutive cycles stop (slide 29), training has to stop
            watched = self.rmse
            if validation:
                self.val_rmse = self.rmse_on(validation)
                watched = self.val_rmse

            if best is None or watched < best:
                best = watched
                stale = 0
            else:
                stale += 1
                if stale >= self.patience:
                    break

        return self

    # in case the user is a new acc it collapses to mu + c[j], which shows the popularity of the event
    def predict(self, user_id, event_id):
        i = self.user_index.get(user_id)
        j = self.event_index.get(event_id)

        score = self.mu
        if i is not None:
            score += self.b[i]
        if j is not None:
            score += self.c[j]
        if i is not None and j is not None:
            score += sum(self.V[i][k] * self.F[j][k]
                         for k in range(self.factors))
        return score
    
    # RMSE of this model over any set of known ratings
    def rmse_on(self, rows):

        if not rows:
            return None
        squared_error = sum(
            (rating - self.predict(user_id, event_id)) ** 2
            for user_id, event_id, rating in rows
        )
        return math.sqrt(squared_error / len(rows))



