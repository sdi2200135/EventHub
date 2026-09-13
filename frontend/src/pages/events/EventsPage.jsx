// src/pages/events/EventsPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { eventService, categoryService } from '../../services/api';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import TuneIcon from '@mui/icons-material/Tune';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './EventsPage.css';

const ITEMS_PER_PAGE = 10;

const EventsPage = () => {
  const { user, isAuthenticated } = useAuth();
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
    search: searchParams.get('search') || '',
  });

  // Ξεχωριστά states για τα UI controls (γιατί τα DatePickers δουλεύουν με Date objects)
  const [selectedDateFrom, setSelectedDateFrom] = useState(
    filters.dateFrom ? new Date(filters.dateFrom) : null
  );
  const [selectedDateTo, setSelectedDateTo] = useState(
    filters.dateTo ? new Date(filters.dateTo) : null
  );
  const [searchInput, setSearchInput] = useState(filters.search);

  // Temporary state για το drawer (δεν εφαρμόζεται μέχρι το Apply)
  const [draftFilters, setDraftFilters] = useState(filters);
  const [draftDateFrom, setDraftDateFrom] = useState(selectedDateFrom);
  const [draftDateTo, setDraftDateTo] = useState(selectedDateTo);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // ============================================
  // ΦΟΡΤΩΣΗ ΔΕΔΟΜΕΝΩΝ
  // ============================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, categoriesRes] = await Promise.all([
          eventService.getEvents(),
          categoryService.getCategories(),
        ]);
        setEvents(eventsRes.data || []);
        setCategories(categoriesRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ============================================
  // ΥΠΟΛΟΓΙΣΜΟΣ ΕΛΑΧΙΣΤΗΣ ΤΙΜΗΣ EVENT
  // ============================================
  const getMinPrice = (event) => {
    if (!event.ticket_types || event.ticket_types.length === 0) return 0;
    return Math.min(...event.ticket_types.map(t => Number(t.price) || 0));
  };

  // ============================================
  // ΕΦΑΡΜΟΓΗ ΦΙΛΤΡΩΝ (useMemo για performance)
  // ============================================
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // ---- Category ----
    if (filters.category) {
      filtered = filtered.filter(e =>
        e.categories && e.categories.includes(filters.category)
      );
    }

    // ---- Region ----
    if (filters.region) {
      filtered = filtered.filter(e =>
        e.city && e.city.toLowerCase().includes(filters.region.toLowerCase())
      );
    }

    // ---- Date Range ----
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter(e => new Date(e.start_datetime) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => new Date(e.start_datetime) <= to);
    }

    // ---- Price Range ----
    if (filters.priceMin !== '' || filters.priceMax !== '') {
      const min = filters.priceMin !== '' ? Number(filters.priceMin) : 0;
      const max = filters.priceMax !== '' ? Number(filters.priceMax) : Infinity;
      filtered = filtered.filter(e => {
        const eventMinPrice = getMinPrice(e);
        return eventMinPrice >= min && eventMinPrice <= max;
      });
    }

    // ---- Free Text Search ----
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.categories?.some(cat => cat.toLowerCase().includes(q)) ||
        e.city?.toLowerCase().includes(q) ||
        e.venue?.toLowerCase().includes(q)
      );
    }

    // Sort by views
    filtered.sort((a, b) => (b.views || 0) - (a.views || 0));

    return filtered;
  }, [events, filters]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  // Reset page όταν αλλάζουν τα φίλτρα
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Scroll στο top όταν αλλάζει σελίδα
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================
  // DRAWER HANDLERS
  // ============================================
  const openDrawer = () => {
    // Sync draft με τα τρέχοντα φίλτρα
    setDraftFilters(filters);
    setDraftDateFrom(selectedDateFrom);
    setDraftDateTo(selectedDateTo);
    setShowFilters(true);
  };

  const closeDrawer = () => setShowFilters(false);

  const handleDraftChange = (key, value) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    const newFilters = {
      ...draftFilters,
      dateFrom: draftDateFrom ? draftDateFrom.toISOString().split('T')[0] : '',
      dateTo: draftDateTo ? draftDateTo.toISOString().split('T')[0] : '',
    };
    setFilters(newFilters);
    setSelectedDateFrom(draftDateFrom);
    setSelectedDateTo(draftDateTo);

    // Update URL params
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
      search: '',
    };
    setFilters(empty);
    setDraftFilters(empty);
    setSelectedDateFrom(null);
    setSelectedDateTo(null);
    setDraftDateFrom(null);
    setDraftDateTo(null);
    setSearchInput('');
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
      search: filters.search, // κρατάμε το search
    };
    setDraftFilters(empty);
    setDraftDateFrom(null);
    setDraftDateTo(null);
  };

  // ============================================
  // SEARCH HANDLERS
  // ============================================
  const handleSearch = (e) => {
    e.preventDefault();
    const newFilters = { ...filters, search: searchInput };
    setFilters(newFilters);

    const params = new URLSearchParams();
    Object.keys(newFilters).forEach(k => {
      if (newFilters[k]) params.append(k, newFilters[k]);
    });
    setSearchParams(params);
  };

  // ============================================
  // ACTIVE FILTER REMOVAL
  // ============================================
  const removeFilter = (key) => {
    const newFilters = { ...filters, [key]: '' };
    setFilters(newFilters);

    if (key === 'search') setSearchInput('');
    if (key === 'dateFrom') setSelectedDateFrom(null);
    if (key === 'dateTo') setSelectedDateTo(null);

    const params = new URLSearchParams();
    Object.keys(newFilters).forEach(k => {
      if (newFilters[k]) params.append(k, newFilters[k]);
    });
    setSearchParams(params);
  };

  // Μέτρημα ενεργών φίλτρων (για το badge)
  const activeFilterCount = [
    filters.category,
    filters.region,
    filters.dateFrom,
    filters.dateTo,
    filters.priceMin,
    filters.priceMax,
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
    if (event.photos && event.photos.length > 0) return event.photos[0].image;
    return null;
  };

  const getPrimaryCategory = (event) => {
    if (event.categories && event.categories.length > 0) return event.categories[0];
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
    <div className="events-page">
      {/* ============================================
          HERO / SEARCH SECTION
          ============================================ */}
      <section className="events-hero">
        <h1>Looking for an Event?</h1>
        <form className="events-search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            className="search-input"
            placeholder="Search events by title, description, city..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn-search">
            <SearchIcon />
            Search
          </button>
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
        </form>
      </section>

      {/* ============================================
          RESULTS SECTION
          ============================================ */}
      <section className="events-results">
        <div className="results-header">
          <div className="results-info">
            <span className="results-label">
              Results: {filteredEvents.length}
              {filteredEvents.length > ITEMS_PER_PAGE && (
                <span className="results-page-info">
                  {' '}· Page {currentPage} of {totalPages}
                </span>
              )}
            </span>
          </div>
          {activeFilterCount > 0 && (
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
                Category: {filters.category}
                <CloseIcon className="remove-filter" onClick={() => removeFilter('category')} />
              </span>
            )}
            {filters.region && (
              <span className="filter-tag">
                Region: {filters.region}
                <CloseIcon className="remove-filter" onClick={() => removeFilter('region')} />
              </span>
            )}
            {filters.dateFrom && (
              <span className="filter-tag">
                From: {new Date(filters.dateFrom).toLocaleDateString()}
                <CloseIcon className="remove-filter" onClick={() => removeFilter('dateFrom')} />
              </span>
            )}
            {filters.dateTo && (
              <span className="filter-tag">
                To: {new Date(filters.dateTo).toLocaleDateString()}
                <CloseIcon className="remove-filter" onClick={() => removeFilter('dateTo')} />
              </span>
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
            {filters.search && (
              <span className="filter-tag">
                "{filters.search}"
                <CloseIcon className="remove-filter" onClick={() => removeFilter('search')} />
              </span>
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="loading-state">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-state">
            <p>No events found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="events-grid">
              {paginatedEvents.map((event) => {
                const availability = getAvailabilityStatus(event);
                const primaryCategory = getPrimaryCategory(event);
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
                          <span className="info-value">{primaryCategory}</span>
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

      {/* ============================================
          FILTERS DRAWER
          ============================================ */}
      {showFilters && (
        <div className="drawer-overlay" onClick={closeDrawer}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="drawer-header">
              <h2>Filters</h2>
              <button className="btn-close-drawer" onClick={closeDrawer}>
                <CloseIcon />
              </button>
            </div>

            {/* Body */}
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
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Region */}
              <div className="filter-group">
                <label className="filter-group-label">Region</label>
                <select
                  value={draftFilters.region}
                  onChange={(e) => handleDraftChange('region', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Regions</option>
                  <option value="Athens">Athens</option>
                  <option value="Thessaloniki">Thessaloniki</option>
                  <option value="OAKA">OAKA</option>
                  <option value="Patras">Patras</option>
                </select>
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

            {/* Footer */}
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

export default EventsPage;