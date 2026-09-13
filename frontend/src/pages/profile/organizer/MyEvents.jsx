// src/pages/profile/organizer/MyEvents.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService } from '../../../services/api';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import './MyEvents.css';

const MyEvents = ({ user }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchEvents();
    }
  }, [user?.id]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await eventService.getOrganizerEvents(user.id);
      setEvents(response.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Could not load your events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTERS
  // ============================================
  const filters = [
    { id: 'ALL', label: 'All' },
    { id: 'PUBLISHED', label: 'Published' },
    { id: 'DRAFT', label: 'Draft' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'CANCELLED', label: 'Cancelled' },
  ];

  const getFilteredEvents = () => {
    let filtered = [...events];

    // Filter κατά status
    if (activeFilter !== 'ALL') {
      filtered = filtered.filter(e => e.status === activeFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const filteredEvents = getFilteredEvents();

  // Counts ανά filter
  const counts = {
    ALL: events.length,
    PUBLISHED: events.filter(e => e.status === 'PUBLISHED').length,
    DRAFT: events.filter(e => e.status === 'DRAFT').length,
    COMPLETED: events.filter(e => e.status === 'COMPLETED').length,
    CANCELLED: events.filter(e => e.status === 'CANCELLED').length,
  };

  // ============================================
  // SELECTION
  // ============================================
  const handleSelectEvent = (eventId) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEvents.length === filteredEvents.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(filteredEvents.map(e => e.id));
    }
  };

  // ============================================
  // DELETE (bulk)
  // ============================================
  const handleDeleteSelected = async () => {
    if (selectedEvents.length === 0) return;
    if (!window.confirm(`Delete ${selectedEvents.length} event(s)? This cannot be undone.`)) return;

    try {
      await Promise.all(
        selectedEvents.map(id => eventService.deleteEvent(id))
      );
      setSelectedEvents([]);
      fetchEvents();
    } catch (err) {
      console.error('Error deleting events:', err);
      alert(err.message || 'Failed to delete events. Some events may have bookings.');
    }
  };

  // ============================================
  // NEW EVENT
  // ============================================
  const handleNewEvent = () => {
    navigate('/profile/events/new');
  };

  // ============================================
  // STATUS STYLING
  // ============================================
  const getStatusLabel = (status) => {
    switch (status) {
      case 'PUBLISHED': return 'Published';
      case 'DRAFT': return 'Draft';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return (
      <div className="my-events-loading">
        <div className="loading-spinner"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-events-error">
        <p>{error}</p>
        <button className="btn-retry" onClick={fetchEvents}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="my-events-layout">
      {/* Στήλη 1: Filters */}
      <aside className="my-events-sidebar">
        {filters.map(f => (
          <button
            key={f.id}
            className={`filter-btn ${activeFilter === f.id ? 'active' : ''}`}
            onClick={() => {
              setActiveFilter(f.id);
              setSelectedEvents([]);
            }}
          >
            <span>{f.label}</span>
            <span className="filter-count">{counts[f.id]}</span>
          </button>
        ))}
      </aside>

      {/* Στήλη 2: Events List */}
      <div className="my-events-content">
        {/* Toolbar */}
        <div className="my-events-toolbar">
          <div className="toolbar-left">
            <label className="checkbox-wrapper">
              <input
                type="checkbox"
                checked={
                  filteredEvents.length > 0 &&
                  selectedEvents.length === filteredEvents.length
                }
                onChange={handleSelectAll}
              />
            </label>
            <button
              className="btn-delete"
              disabled={selectedEvents.length === 0}
              onClick={handleDeleteSelected}
            >
              Delete
            </button>
          </div>

          <div className="search-wrapper">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="events-search"
            />
          </div>

          <button className="btn-new-event" onClick={handleNewEvent}>
            <AddIcon />
            New Event
          </button>
        </div>

        {/* Events List */}
        {filteredEvents.length === 0 ? (
          <div className="my-events-empty">
            <p>No events found.</p>
            {activeFilter === 'ALL' && (
              <button className="btn-create-first" onClick={handleNewEvent}>
                Create your first event
              </button>
            )}
          </div>
        ) : (
          <div className="my-events-list">
            {filteredEvents.map(event => (
              <div
                key={event.id}
                className={`event-item status-${event.status.toLowerCase()} ${selectedEvents.includes(event.id) ? 'selected' : ''}`}
                onClick={() => navigate(`/profile/events/${event.id}`)}
              >
                <label
                  className="checkbox-wrapper"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event.id)}
                    onChange={() => handleSelectEvent(event.id)}
                  />
                </label>

                <div className="event-item-content">
                  <span className="event-item-title">{event.title}</span>
                </div>

                <span className={`event-status status-${event.status.toLowerCase()}`}>
                  {getStatusLabel(event.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyEvents;