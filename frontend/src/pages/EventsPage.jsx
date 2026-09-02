// src/pages/EventsPage.jsx
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventService, categoryService } from '../services/api';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './EventsPage.css';

const EventsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    region: searchParams.get('region') || '',
    date: searchParams.get('date') || '',
    search: searchParams.get('search') || ''
  });
  const [searchInput, setSearchInput] = useState(filters.search);

  // Φόρτωση δεδομένων
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, categoriesRes] = await Promise.all([
          eventService.getEvents(),
          categoryService.getCategories()
        ]);
        setEvents(eventsRes.data || []);
        setCategories(categoriesRes.data || []);
        
        applyFilters(eventsRes.data || [], filters);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Εφαρμογή φίλτρων
  const applyFilters = (eventsList, filterValues) => {
    let filtered = [...eventsList];

    if (filterValues.category) {
      filtered = filtered.filter(event => 
        event.categories && event.categories.includes(filterValues.category)
      );
    }

    if (filterValues.region) {
      filtered = filtered.filter(event => 
        event.city && event.city.toLowerCase().includes(filterValues.region.toLowerCase())
      );
    }

    if (filterValues.date) {
      const filterDate = new Date(filterValues.date);
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.start_datetime);
        return eventDate.toDateString() === filterDate.toDateString();
      });
    }

    if (filterValues.search) {
      const search = filterValues.search.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(search) ||
        event.description?.toLowerCase().includes(search) ||
        event.categories?.some(cat => cat.toLowerCase().includes(search))
      );
    }

    filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
    setFilteredEvents(filtered);
  };

  // Χειρισμός αλλαγής φίλτρων
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    Object.keys(newFilters).forEach(k => {
      if (newFilters[k]) {
        params.append(k, newFilters[k]);
      }
    });
    setSearchParams(params);
    applyFilters(events, newFilters);
  };

  // Χειρισμός αλλαγής ημερομηνίας
  const handleDateChange = (date) => {
    setSelectedDate(date);
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      handleFilterChange('date', dateStr);
    } else {
      handleFilterChange('date', '');
    }
  };

  // Χειρισμός αναζήτησης
  const handleSearch = (e) => {
    e.preventDefault();
    handleFilterChange('search', searchInput);
  };

  // Καθαρισμός όλων των φίλτρων
  const clearAllFilters = () => {
    const newFilters = { category: '', region: '', date: '', search: '' };
    setFilters(newFilters);
    setSearchInput('');
    setSelectedDate(null);
    setSearchParams({});
    applyFilters(events, newFilters);
  };

  // Αφαίρεση μεμονωμένου φίλτρου
  const removeFilter = (key) => {
    handleFilterChange(key, '');
    if (key === 'search') setSearchInput('');
    if (key === 'date') setSelectedDate(null);
  };

  // Συνάρτηση για την κατάσταση διαθεσιμότητας
  const getAvailabilityStatus = (event) => {
    if (event.available_capacity === 0) return 'unavailable';
    if (event.available_capacity < event.capacity * 0.2) return 'limited';
    return 'available';
  };

  const getAvailabilityLabel = (status) => {
    switch(status) {
      case 'available': return 'Available';
      case 'limited': return 'Limited';
      case 'unavailable': return 'Not available';
      default: return 'Available';
    }
  };

  const getAvailabilityColor = (status) => {
    switch(status) {
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
      year: 'numeric'
    });
  };

  const getEventPhoto = (event) => {
    if (event.photos && event.photos.length > 0) {
      return event.photos[0].image;
    }
    return null;
  };

  const getPrimaryCategory = (event) => {
    if (event.categories && event.categories.length > 0) {
      return event.categories[0];
    }
    return 'Event';
  };

  return (
    <div className="events-page">
      {/* ============================================
          HERO / SEARCH SECTION
          ============================================ */}
      <section className="events-hero">
        <h1>Looking for an Event?</h1>
        <form className="events-search-bar" onSubmit={handleSearch}>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="">Type / Category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          <select
            value={filters.region}
            onChange={(e) => handleFilterChange('region', e.target.value)}
          >
            <option value="">Region</option>
            <option value="Athens">Athens</option>
            <option value="Thessaloniki">Thessaloniki</option>
            <option value="OAKA">OAKA</option>
            <option value="Patras">Patras</option>
          </select>
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            placeholderText="Date"
            className="date-picker-input"
            dateFormat="MMMM d, yyyy"
            locale="en-US"
            isClearable={true}
          />
          <input
            type="text"
            className="search-input"
            placeholder="Search events..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn-search">
            <SearchIcon />
            Search
          </button>
        </form>
      </section>

      {/* ============================================
          FILTERS / RESULTS
          ============================================ */}
      <section className="events-results">
        <div className="results-header">
          <div className="results-info">
            <span className="results-label">Results: {filteredEvents.length}</span>
          </div>
          <button className="clear-all" onClick={clearAllFilters}>
            Clear all
          </button>
        </div>

        {/* Active Filters */}
        <div className="active-filters">
          {filters.category && (
            <span className="filter-tag">
              {filters.category}
              <CloseIcon className="remove-filter" onClick={() => removeFilter('category')} />
            </span>
          )}
          {filters.region && (
            <span className="filter-tag">
              {filters.region}
              <CloseIcon className="remove-filter" onClick={() => removeFilter('region')} />
            </span>
          )}
          {filters.date && (
            <span className="filter-tag">
              {new Date(filters.date).toLocaleDateString()}
              <CloseIcon className="remove-filter" onClick={() => removeFilter('date')} />
            </span>
          )}
          {filters.search && (
            <span className="filter-tag">
              "{filters.search}"
              <CloseIcon className="remove-filter" onClick={() => removeFilter('search')} />
            </span>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="loading-state">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-state">
            <p>No events found matching your criteria.</p>
          </div>
        ) : (
          <div className="events-grid">
            {filteredEvents.map((event) => {
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
                    {/* ΦΩΤΟΓΡΑΦΙΑ */}
                    <div className="event-image">
                      {photo ? (
                        <img src={photo} alt={event.title} className="event-photo" />
                      ) : (
                        <span className="event-placeholder">🎉</span>
                      )}
                    </div>
                    
                    {/* ΠΛΗΡΟΦΟΡΙΕΣ - ΚΕΝΤΡΑΡΙΣΜΕΝΕΣ */}
                    <div className="event-body">                      
                      {/* ΤΙΤΛΟΣ */}
                      <h3 className="event-title">{event.title}</h3>
                      
                      {/* Category: Στοιχείο */}
                      <p className="event-info">
                        <span className="info-label">Category: </span>
                        <span className="info-value">{primaryCategory}</span>
                      </p>

                      {/* REGION: Στοιχείο */}
                      <p className="event-info">
                        <span className="info-label">Region: </span>
                        <span className="info-value">{event.city}</span>
                      </p>

                      {/* DATE: Στοιχείο */}
                      <p className="event-info">
                        <span className="info-label">Date: </span>
                        <span className="info-value">{formatDate(event.start_datetime)}</span>
                      </p>
                      
                      {/* AVAILABILITY */}
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
        )}
      </section>
    </div>
  );
};

export default EventsPage;