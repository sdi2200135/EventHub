// src/pages/events/RecommendationsPage.jsx
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { eventService, categoryService } from '../../services/api';
import CloseIcon from '@mui/icons-material/Close';
import TuneIcon from '@mui/icons-material/Tune';
import RecommendIcon from '@mui/icons-material/Recommend';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './EventsPage.css';
import './RecommendationsPage.css';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ITEMS_PER_PAGE = 30;

const RecommendationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drawer
  const [showFilters, setShowFilters] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    region: searchParams.get('region') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    priceMin: searchParams.get('priceMin') || '',
    priceMax: searchParams.get('priceMax') || '',
  });

  // Ξεχωριστά states για τα UI controls
  const [selectedDateFrom, setSelectedDateFrom] = useState(
    filters.dateFrom ? new Date(filters.dateFrom) : null
  );
  const [selectedDateTo, setSelectedDateTo] = useState(
    filters.dateTo ? new Date(filters.dateTo) : null
  );

  // Temporary state για το drawer
  const [draftFilters, setDraftFilters] = useState(filters);
  const [draftDateFrom, setDraftDateFrom] = useState(selectedDateFrom);
  const [draftDateTo, setDraftDateTo] = useState(selectedDateTo);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ============================================
  // LOAD CATEGORIES (για το dropdown)
  // ============================================
  useEffect(() => {
    categoryService.getCategories()
      .then(({ data }) => setCategories(data))
      .catch((err) => console.error('Error fetching categories:', err));
  }, []);

  // ============================================
  // FETCH RECOMMENDATIONS
  // ============================================
  useEffect(() => {
    const params = { page: currentPage };
    if (filters.category) params.category = filters.category;
    if (filters.region) params.city = filters.region;
    if (filters.dateFrom) params.start_after = `${filters.dateFrom}T00:00:00`;
    if (filters.dateTo) params.start_before = `${filters.dateTo}T23:59:59`;
    if (filters.priceMin !== '') params.min_price = filters.priceMin;
    if (filters.priceMax !== '') params.max_price = filters.priceMax;

    setLoading(true);
    eventService.getRecommendations(params)
      .then(({ data, count }) => {
        setEvents(data || []);
        setTotalCount(count || 0);
      })
      .catch((err) => {
        console.error('Error fetching recommendations:', err);
        setEvents([]);
        setTotalCount(0);
      })
      .finally(() => setLoading(false));
  }, [filters, currentPage]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================
  // DRAWER HANDLERS
  // ============================================
  const openDrawer = () => {
    setDraftFilters(filters);
    setDraftDateFrom(selectedDateFrom);
    setDraftDateTo(selectedDateTo);
    setShowFilters(true);
  };

  const closeDrawer = () => setShowFilters(false);

  const handleDraftChange = (key, value) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }));
  };

  const toDateString = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const handleApplyFilters = () => {
    const newFilters = {
      ...draftFilters,
      dateFrom: draftDateFrom ? toDateString(draftDateFrom) : '',
      dateTo: draftDateTo ? toDateString(draftDateTo) : '',
    };
    setFilters(newFilters);
    setCurrentPage(1);
    setSelectedDateFrom(draftDateFrom);
    setSelectedDateTo(draftDateTo);

    const params = new URLSearchParams();
    Object.keys(newFilters).forEach(k => {
      if (newFilters[k]) params.append(k, newFilters[k]);
    });
    setSearchParams(params);

    setShowFilters(false);
  };

  const handleClearAll = () => {
    const empty = {
      category: '',
      region: '',
      dateFrom: '',
      dateTo: '',
      priceMin: '',
      priceMax: '',
    };
    setFilters(empty);
    setDraftFilters(empty);
    setSelectedDateFrom(null);
    setSelectedDateTo(null);
    setDraftDateFrom(null);
    setDraftDateTo(null);
    setSearchParams({});
    setCurrentPage(1);
  };

  const handleClearFromDrawer = () => {
    const empty = {
      category: '',
      region: '',
      dateFrom: '',
      dateTo: '',
      priceMin: '',
      priceMax: '',
    };
    setDraftFilters(empty);
    setDraftDateFrom(null);
    setDraftDateTo(null);
  };

  // ============================================
  // ACTIVE FILTER REMOVAL
  // ============================================
  const removeFilter = (key) => {
    const newFilters = { ...filters, [key]: '' };
    setFilters(newFilters);
    setCurrentPage(1);
    if (key === 'dateFrom') setSelectedDateFrom(null);
    if (key === 'dateTo') setSelectedDateTo(null);

    const params = new URLSearchParams();
    Object.keys(newFilters).forEach(k => {
      if (newFilters[k]) params.append(k, newFilters[k]);
    });
    setSearchParams(params);
  };

  const removeDateFilter = () => {
    const newFilters = { ...filters, dateFrom: '', dateTo: '' };
    setFilters(newFilters);
    setCurrentPage(1);
    setSelectedDateFrom(null);
    setSelectedDateTo(null);

    const params = new URLSearchParams();
    Object.keys(newFilters).forEach(k => {
      if (newFilters[k]) params.append(k, newFilters[k]);
    });
    setSearchParams(params);
  };

  // Μέτρημα ενεργών φίλτρων
  const hasSingleDate =
    filters.dateFrom && filters.dateTo && filters.dateFrom === filters.dateTo;

  const activeFilterCount = [
    filters.category,
    filters.region,
    filters.priceMin,
    filters.priceMax,
    hasSingleDate
      ? 'date'
      : [filters.dateFrom, filters.dateTo].filter(Boolean).length > 0
        ? 'dates'
        : null,
  ].filter(Boolean).length;

  // ============================================
  // HELPERS
  // ============================================
  const getAvailabilityStatus = (event) => {
    if (event.available_capacity === 0) return 'unavailable';
    if (event.available_capacity < event.capacity * 0.2) return 'limited';
    return 'available';
  };

  const getAvailabilityLabel = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'limited': return 'Limited';
      case 'unavailable': return 'Not available';
      default: return 'Available';
    }
  };

  const getAvailabilityColor = (status) => {
    switch (status) {
      case 'available': return '#1A782E';
      case 'limited': return '#AF7812';
      case 'unavailable': return '#981818';
      default: return '#1A782E';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getEventPhoto = (event) => {
    if (event.cover_photo) return event.cover_photo;
    if (event.photos && event.photos.length > 0) return event.photos[0].image;
    return null;
  };

  const getCategoriesText = (event) => {
    if (event.categories && event.categories.length > 0) {
      return event.categories.join(', ');
    }
    return 'Event';
  };

  // ============================================
  // PAGINATION UI
  // ============================================
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="pagination">
        <button
          className="pagination-btn"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ← Prev
        </button>

        {startPage > 1 && (
          <>
            <button
              className={`page-number ${currentPage === 1 ? 'active' : ''}`}
              onClick={() => handlePageChange(1)}
            >
              1
            </button>
            {startPage > 2 && <span className="pagination-dots">...</span>}
          </>
        )}

        {pageNumbers.map(page => (
          <button
            key={page}
            className={`page-number ${currentPage === page ? 'active' : ''}`}
            onClick={() => handlePageChange(page)}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="pagination-dots">...</span>}
            <button
              className={`page-number ${currentPage === totalPages ? 'active' : ''}`}
              onClick={() => handlePageChange(totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          className="pagination-btn"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next →
        </button>
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="events-page recommendations-page">
      {/* HERO / SEARCH */}
      <section className="events-hero">
        <h1>Recommended for You</h1>
        <p className="rec-subtitle">
          You must not miss these events. They are made for you!
        </p>

        <div className="rec-filter-bar">
          <button
            type="button"
            className={`btn-open-filters ${activeFilterCount > 0 ? 'has-filters' : ''}`}
            onClick={openDrawer}
          >
            <TuneIcon />
            Filters
            {activeFilterCount > 0 && (
              <span className="filters-badge">{activeFilterCount}</span>
            )}
          </button>
        </div>

      </section>

      {/* RESULTS */}
      <section className="events-results">
        <div className="results-header">
          <div className="results-info">
            <span className="results-label">
              {totalCount} {totalCount === 1 ? 'recommendation' : 'recommendations'}
              {totalCount > ITEMS_PER_PAGE && (
                <span className="results-page-info">
                  {' '}· Page {currentPage} of {totalPages}
                </span>
              )}
            </span>
          </div>
          {(activeFilterCount > 0 ) && (
            <button className="clear-all" onClick={handleClearAll}>
              Clear all
            </button>
          )}
        </div>

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="active-filters">
            {filters.category && (
              <span className="filter-tag">
                Category: {categories.find(c => String(c.id) === String(filters.category))?.name || filters.category}
                <CloseIcon className="remove-filter" onClick={() => removeFilter('category')} />
              </span>
            )}

            {filters.region && (
              <span className="filter-tag">
                Region: {filters.region}
                <CloseIcon
                  className="remove-filter"
                  onClick={() => removeFilter('region')}
                />
              </span>
            )}

            {hasSingleDate ? (
              <span className="filter-tag">
                Date: {new Date(filters.dateFrom).toLocaleDateString()}
                <CloseIcon
                  className="remove-filter"
                  onClick={removeDateFilter}
                />
              </span>
            ) : (
              <>
                {filters.dateFrom && (
                  <span className="filter-tag">
                    From: {new Date(filters.dateFrom).toLocaleDateString()}
                    <CloseIcon
                      className="remove-filter"
                      onClick={() => removeFilter('dateFrom')}
                    />
                  </span>
                )}
                {filters.dateTo && (
                  <span className="filter-tag">
                    To: {new Date(filters.dateTo).toLocaleDateString()}
                    <CloseIcon
                      className="remove-filter"
                      onClick={() => removeFilter('dateTo')}
                    />
                  </span>
                )}
              </>
            )}

            {filters.priceMin !== '' && (
              <span className="filter-tag">
                Min: ${filters.priceMin}
                <CloseIcon className="remove-filter" onClick={() => removeFilter('priceMin')} />
              </span>
            )}
            {filters.priceMax !== '' && (
              <span className="filter-tag">
                Max: ${filters.priceMax}
                <CloseIcon className="remove-filter" onClick={() => removeFilter('priceMax')} />
              </span>
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <LoadingSpinner message="Loading recommendations..." />
        ) : events.length === 0 ? (
          <div className="empty-state rec-empty">
            <RecommendIcon className="rec-empty-icon" />
            <p>
              { activeFilterCount > 0
                ? 'No recommendations match your criteria.'
                : "We don't have enough data yet to recommend events."}
            </p>
            <p className="rec-empty-hint">
              Book a ticket or browse a few events and we'll suggest things you might like.
            </p>
          </div>
        ) : (
          <>
            <div className="events-grid">
              {events.map((event) => {
                const availability = getAvailabilityStatus(event);
                const categoriesText = getCategoriesText(event);
                const photo = getEventPhoto(event);
                const availabilityColor = getAvailabilityColor(availability);
                const availabilityLabel = getAvailabilityLabel(availability);

                return (
                  <Link
                    key={event.id}
                    to={`/events/details/${event.id}`}
                    className="event-card-link"
                  >
                    <div className="event-card">
                      <div className="event-image">
                        {photo ? (
                          <img src={photo} alt={event.title} className="event-photo" />
                        ) : (
                          <span className="event-placeholder">🎉</span>
                        )}
                      </div>

                      <div className="event-body">
                        <h3 className="event-title">{event.title}</h3>

                        <p className="event-info">
                          <span className="info-label">Category: </span>
                          <span className="info-value">{categoriesText}</span>
                        </p>

                        <p className="event-info">
                          <span className="info-label">Region: </span>
                          <span className="info-value">{event.city}</span>
                        </p>

                        <p className="event-info">
                          <span className="info-label">Date: </span>
                          <span className="info-value">{formatDate(event.start_datetime)}</span>
                        </p>

                        <div className="event-availability">
                          <span className="info-label">Availability: </span>
                          <span
                            className="info-value availability-value"
                            style={{ color: availabilityColor, fontWeight: 700 }}
                          >
                            {availabilityLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {renderPagination()}
          </>
        )}
      </section>

      {/* FILTERS DRAWER */}
      {showFilters && (
        <div className="drawer-overlay" onClick={closeDrawer}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Filters</h2>
              <button className="btn-close-drawer" onClick={closeDrawer}>
                <CloseIcon />
              </button>
            </div>

            <div className="drawer-body">
              {/* Category */}
              <div className="filter-group">
                <label className="filter-group-label">Category</label>
                <select
                  value={draftFilters.category}
                  onChange={(e) => handleDraftChange('category', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Region */}
              <div className="filter-group">
                <label className="filter-group-label">Region</label>
                <input
                  type="text"
                  placeholder="e.g. Athens"
                  value={draftFilters.region}
                  onChange={(e) => handleDraftChange('region', e.target.value)}
                  className="filter-text-input"
                />
              </div>

              {/* Date Range */}
              <div className="filter-group">
                <label className="filter-group-label">Date Range</label>
                <div className="filter-row-2">
                  <DatePicker
                    selected={draftDateFrom}
                    onChange={(date) => setDraftDateFrom(date)}
                    placeholderText="From"
                    dateFormat="MMM d, yyyy"
                    className="filter-date-input"
                    isClearable
                  />
                  <DatePicker
                    selected={draftDateTo}
                    onChange={(date) => setDraftDateTo(date)}
                    placeholderText="To"
                    dateFormat="MMM d, yyyy"
                    minDate={draftDateFrom || undefined}
                    className="filter-date-input"
                    isClearable
                  />
                </div>
              </div>

              {/* Price Range */}
              <div className="filter-group">
                <label className="filter-group-label">Price Range ($)</label>
                <div className="filter-row-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={draftFilters.priceMin}
                    onChange={(e) => handleDraftChange('priceMin', e.target.value)}
                    className="filter-num-input"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={draftFilters.priceMax}
                    onChange={(e) => handleDraftChange('priceMax', e.target.value)}
                    className="filter-num-input"
                  />
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button className="btn-clear-drawer" onClick={handleClearFromDrawer}>
                Clear
              </button>
              <button className="btn-apply-drawer" onClick={handleApplyFilters}>
                Apply Filters
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default RecommendationsPage;