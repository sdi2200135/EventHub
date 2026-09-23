// src/pages/HomePage.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';  
import { eventService, categoryService } from '../services/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './HomePage.css';

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SearchIcon from '@mui/icons-material/Search';
import AutorenewIcon from '@mui/icons-material/Autorenew';

const HomePage = () => {
  const navigate = useNavigate();  
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [totalCount, setTotalCount] = useState(0);

  // State για τα φίλτρα του search
  const [searchFilters, setSearchFilters] = useState({
    category: '',
    region: ''
  });

  // the categories are needed once, for the tabs and the search box
  useEffect(() => {
    categoryService.getCategories()
      .then(({ data }) => setCategories(data))
      .catch((err) => console.error('Error fetching categories:', err));
  }, []);

  // the events of the selected tab come from the backend
  useEffect(() => {
    const category = categories.find((c) => c.name === activeCategory);
    const params = category ? { category: category.id } : {};
    setLoading(true);
    eventService.getEvents(params)
      .then(({ data, count }) => { setEvents(data); setTotalCount(count); })
      .catch((err) => console.error('Error fetching events:', err))
      .finally(() => setLoading(false));
  }, [activeCategory, categories]);


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
    
    if (searchFilters.category && searchFilters.category !== 'all') {
      params.append('category', searchFilters.category);
    }
    if (searchFilters.region) {
      params.append('region', searchFilters.region);
    }
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      params.append('dateFrom', dateStr);
      params.append('dateTo', dateStr);
    }
    
    // Πλοήγηση στη σελίδα Events με τα φίλτρα
    navigate(`/events?${params.toString()}`);
  };

  const getAvailabilityStatus = (event) => {
    if (event.available_capacity === 0) return 'unavailable';
    const totalTickets = event.available_capacity + (event.total_booked ?? 0);
    if (event.available_capacity <= 10 || event.available_capacity < totalTickets * 0.2) 
      return 'limited';
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
    // endpoind sends image 0 as cover photo
      return event.cover_photo || event.photos?.[0]?.image || null
  };

  const getCategoriesText = (event) => {
    if (event.categories && event.categories.length > 0) {
      return event.categories.join(', ');
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
                <option value="" disabled hidden>Type/Category</option>
                <option value="all">All categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Region"
                value={searchFilters.region}
                onChange={(e) => setSearchFilters({...searchFilters, region: e.target.value})}
                className="region-input"
              />
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
              className={`category-item ${activeCategory === 'All' ? 'active' : ''}`}
              onClick={() => handleCategoryClick('All')}
            >
              All
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
            {activeCategory === 'All' ? 'All categories' : `${activeCategory} Events`}
          </h2>
          <span className="events-count">{events.length} events</span>
        </div>

        {loading ? (
          <div className="loading-state">
            <AutorenewIcon className="loading-icon" />
            <p>Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <CalendarMonthIcon className="empty-icon" />
            <p>No events available for this category.</p>
          </div>
        ) : (
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
                        <span className="info-value">{categoriesText}</span>
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
          { totalCount > events.length && (
          <div className="events-more">
            <Link
              to={activeCategory === 'All'
                ? '/events'
                : `/events?category=${categories.find(c => c.name === activeCategory)?.id ?? ''}`}
              className="btn-see-all"
            >
              See all {totalCount} events
            </Link>
          </div>
        )}
    </div>
  );
};

export default HomePage;