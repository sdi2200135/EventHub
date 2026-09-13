// src/pages/HomePage.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';  
import { useAuth } from '../context/AuthContext';
import { eventService, categoryService } from '../services/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './HomePage.css';

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SearchIcon from '@mui/icons-material/Search';
import AutorenewIcon from '@mui/icons-material/Autorenew';

const HomePage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();  // ← Πρόσθεσε αυτό
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Popular');

  // State για τα φίλτρα του search
  const [searchFilters, setSearchFilters] = useState({
    category: '',
    region: '',
    date: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, categoriesRes] = await Promise.all([
          eventService.getEvents(),
          categoryService.getCategories()
        ]);
        setEvents(eventsRes.data || []);
        setCategories(categoriesRes.data || []);
        
        const sortedByViews = [...(eventsRes.data || [])].sort((a, b) => 
          (b.views || 0) - (a.views || 0)
        );
        setFilteredEvents(sortedByViews);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    filterEventsByCategory(activeCategory);
  }, [activeCategory, events]);

  const filterEventsByCategory = (categoryName) => {
    if (categoryName === 'Popular') {
      const sorted = [...events].sort((a, b) => (b.views || 0) - (a.views || 0));
      setFilteredEvents(sorted);
    } else {
      const filtered = events.filter(event => 
        event.categories && event.categories.includes(categoryName)
      );
      setFilteredEvents(filtered);
    }
  };

  const handleCategoryClick = (categoryName) => {
    setActiveCategory(categoryName);
  };

  // ============================================
  // SEARCH HANDLER - ΠΗΓΑΙΝΕΙ ΣΤΗ ΣΕΛΙΔΑ EVENTS
  // ============================================
  const handleSearch = (e) => {
    e.preventDefault();
    
    // Δημιουργία των query parameters
    const params = new URLSearchParams();
    
    if (searchFilters.category) {
      params.append('category', searchFilters.category);
    }
    if (searchFilters.region) {
      params.append('region', searchFilters.region);
    }
    if (selectedDate) {
      // Μορφοποίηση της ημερομηνίας σε YYYY-MM-DD
      const dateStr = selectedDate.toISOString().split('T')[0];
      params.append('date', dateStr);
    }
    
    // Πλοήγηση στη σελίδα Events με τα φίλτρα
    navigate(`/events?${params.toString()}`);
  };

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
    <div>
      {/* ============================================
          HERO SECTION
          ============================================ */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-left">
            <h1>
              Live your next experience...
            </h1>
            <p className="hero-description">
              Make a reservation quickly and reliably
            </p>
          </div>

          <div className="hero-right">
            <form className="hero-search" onSubmit={handleSearch}>
              <select
                value={searchFilters.category}
                onChange={(e) => setSearchFilters({...searchFilters, category: e.target.value})}
              >
                <option value="">Type/Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              <select
                value={searchFilters.region}
                onChange={(e) => setSearchFilters({...searchFilters, region: e.target.value})}
              >
                <option value="">Region</option>
                <option value="Athens">Athens</option>
                <option value="Thessaloniki">Thessaloniki</option>
                <option value="OAKA">OAKA</option>
                <option value="Patras">Patras</option>
              </select>
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                placeholderText="Date"
                className="date-picker-input"
                dateFormat="MMMM d, yyyy"
                locale="en-US"
              />
              <button type="submit" className="btn-hero-search">
                <SearchIcon className="search-icon" />
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ============================================
          CATEGORIES BAR
          ============================================ */}
      <section className="categories-bar">
        <div className="categories-bar-container">
          <div className="categories-list">
            <span 
              className={`category-item ${activeCategory === 'Popular' ? 'active' : ''}`}
              onClick={() => handleCategoryClick('Popular')}
            >
              Popular
            </span>
            {categories.map((cat) => (
              <span 
                key={cat.id} 
                className={`category-item ${activeCategory === cat.name ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.name)}
              >
                {cat.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          EVENTS SECTION
          ============================================ */}
      <section className="events-section">
        <div className="events-header">
          <h2>
            {activeCategory === 'Popular' ? 'Popular Events' : `${activeCategory} Events`}
          </h2>
          <span className="events-count">{filteredEvents.length} events</span>
        </div>

        {loading ? (
          <div className="loading-state">
            <AutorenewIcon className="loading-icon" />
            <p>Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-state">
            <CalendarMonthIcon className="empty-icon" />
            <p>No events available for this category.</p>
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
                        <img 
                          src={photo} 
                          alt={event.title} 
                          className="event-photo"
                        />
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
                      
                      {/* AVAILABILITY - ΩΣ ΓΡΑΜΜΗ ΠΛΗΡΟΦΟΡΙΑΣ ΜΕ ΧΡΩΜΑ */}
                      <p className="event-info">
                        <span className="info-label">Availability: </span>
                        <span 
                          className="info-value availability-value"
                          style={{ color: availabilityColor, fontWeight: 700 }}
                        >
                          {availabilityLabel}
                        </span>
                      </p>
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

export default HomePage;