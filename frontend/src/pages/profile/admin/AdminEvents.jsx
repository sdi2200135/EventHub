// src/pages/profile/admin/AdminEvents.jsx
import React, { useEffect, useState } from 'react';
import { eventService } from '../../../services/api';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import './AdminEvents.css';

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ============================================
  // ΦΟΡΤΩΣΗ ΟΛΩΝ ΤΩΝ EVENTS (όχι μόνο του organizer)
  // ============================================
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await eventService.getAllEvents();
      setEvents(response.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Could not load events. Please try again.');
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

    if (activeFilter !== 'ALL') {
      filtered = filtered.filter(e => e.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q) ||
        e.organizer?.username?.toLowerCase().includes(q) ||
        e.organizer?.first_name?.toLowerCase().includes(q) ||
        e.organizer?.last_name?.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const filteredEvents = getFilteredEvents();

  const counts = {
    ALL: events.length,
    PUBLISHED: events.filter(e => e.status === 'PUBLISHED').length,
    DRAFT: events.filter(e => e.status === 'DRAFT').length,
    COMPLETED: events.filter(e => e.status === 'COMPLETED').length,
    CANCELLED: events.filter(e => e.status === 'CANCELLED').length,
  };

  // ============================================
  // ACTIONS
  // ============================================
  const handleCancel = async (eventId) => {
    if (!window.confirm('Cancel this event? Attendees will still see it in their history.')) return;
    setActionLoading(true);
    try {
      await eventService.updateEventStatus(eventId, 'CANCELLED');
      setEvents(prev =>
        prev.map(e => e.id === eventId ? { ...e, status: 'CANCELLED' } : e)
      );
      setSelectedEvent(prev => prev ? { ...prev, status: 'CANCELLED' } : null);
    } catch (err) {
      console.error('Error cancelling event:', err);
      alert('Failed to cancel event.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Delete this event permanently? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await eventService.deleteEvent(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setSelectedEvent(null);
    } catch (err) {
      console.error('Error deleting event:', err);
      alert(err.message || 'Failed to delete event. It may have active bookings.');
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    if (actionLoading) return;
    setSelectedEvent(null);
  };

  // ============================================
  // HELPERS
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

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getOrganizerName = (ev) => {
    if (!ev.organizer) return '—';
    const f = ev.organizer.first_name || '';
    const l = ev.organizer.last_name || '';
    return (f + ' ' + l).trim() || ev.organizer.username || '—';
  };

  const canDelete = (ev) => ev.status === 'DRAFT' || !ev.bookings?.length;
  const canCancel = (ev) => ev.status !== 'CANCELLED' && ev.status !== 'COMPLETED';

  // ============================================
  // LOADING / ERROR
  // ============================================
  if (loading) {
    return (
      <div className="ae-loading">
        <div className="loading-spinner"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ae-error">
        <p>{error}</p>
        <button className="btn-retry" onClick={fetchEvents}>Try Again</button>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="ae-layout">
      {/* Στήλη 1: Filters */}
      <aside className="ae-sidebar">
        {filters.map(f => (
          <button
            key={f.id}
            className={`filter-btn ${activeFilter === f.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.id)}
          >
            <span>{f.label}</span>
            <span className="filter-count">{counts[f.id]}</span>
          </button>
        ))}
      </aside>

      {/* Στήλη 2: Events List */}
      <div className="ae-content">
        {/* Toolbar */}
        <div className="ae-toolbar">
          <div className="search-wrapper">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="Search by title, city or organizer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="events-search"
            />
          </div>
        </div>

        {/* List */}
        {filteredEvents.length === 0 ? (
          <div className="ae-empty">
            <p>No events found.</p>
          </div>
        ) : (
          <div className="ae-list">
            {filteredEvents.map(ev => (
              <div
                key={ev.id}
                className={`ae-item status-${(ev.status || '').toLowerCase()}`}
                onClick={() => setSelectedEvent(ev)}
              >
                <div className="ae-item-content">
                  <div className="ae-item-top">
                    <span className="ae-item-title">{ev.title}</span>
                    <span className={`ae-status status-${(ev.status || '').toLowerCase()}`}>
                      {getStatusLabel(ev.status)}
                    </span>
                  </div>
                  <div className="ae-item-bottom">
                    <span className="ae-item-meta">
                      📍 {ev.city || '—'}
                    </span>
                    <span className="ae-item-meta">
                      📅 {formatDate(ev.start_datetime)}
                    </span>
                    <span className="ae-item-meta ae-item-organizer">
                      👤 {getOrganizerName(ev)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================
          EVENT DETAILS MODAL
          ============================================ */}
      {selectedEvent && (
        <div className="ae-modal-overlay" onClick={closeModal}>
          <div className="ae-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="ae-modal-header">
              <div className="ae-modal-header-info">
                <h3>{selectedEvent.title}</h3>
                <p>
                  <span className={`ae-status status-${(selectedEvent.status || '').toLowerCase()}`}>
                    {getStatusLabel(selectedEvent.status)}
                  </span>
                  <span className="ae-modal-id"> • ID: {selectedEvent.event_id || selectedEvent.id}</span>
                </p>
              </div>
              <button
                className="btn-close-modal"
                onClick={closeModal}
                disabled={actionLoading}
              >
                <CloseIcon />
              </button>
            </div>

            {/* Body */}
            <div className="ae-modal-body">
              {/* Organizer */}
              <div className="ae-modal-section">
                <h4>Organizer</h4>
                <div className="ae-modal-row">
                  <span className="ae-modal-label">Name:</span>
                  <span className="ae-modal-value">{getOrganizerName(selectedEvent)}</span>
                </div>
                <div className="ae-modal-row">
                  <span className="ae-modal-label">Username:</span>
                  <span className="ae-modal-value">
                    @{selectedEvent.organizer?.username || '—'}
                  </span>
                </div>
              </div>

              {/* Event Info */}
              <div className="ae-modal-section">
                <h4>Event Info</h4>
                <div className="ae-modal-row">
                  <span className="ae-modal-label">Type:</span>
                  <span className="ae-modal-value">{selectedEvent.event_type || '—'}</span>
                </div>
                <div className="ae-modal-row">
                  <span className="ae-modal-label">Categories:</span>
                  <span className="ae-modal-value">
                    {selectedEvent.categories?.join(', ') || '—'}
                  </span>
                </div>
                <div className="ae-modal-row">
                  <span className="ae-modal-label">Venue:</span>
                  <span className="ae-modal-value">
                    {selectedEvent.venue || '—'}, {selectedEvent.city || '—'}
                  </span>
                </div>
                <div className="ae-modal-row">
                  <span className="ae-modal-label">Start:</span>
                  <span className="ae-modal-value">{formatDate(selectedEvent.start_datetime)}</span>
                </div>
                <div className="ae-modal-row">
                  <span className="ae-modal-label">Capacity:</span>
                  <span className="ae-modal-value">
                    {selectedEvent.capacity} seats ({selectedEvent.available_capacity ?? '—'} available)
                  </span>
                </div>
                <div className="ae-modal-row">
                  <span className="ae-modal-label">Bookings:</span>
                  <span className="ae-modal-value">
                    {selectedEvent.bookings?.filter(b => b.status !== 'CANCELLED').length || 0} active
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="ae-modal-footer">
              <button
                className="btn-modal-exit"
                onClick={closeModal}
                disabled={actionLoading}
              >
                Close
              </button>

              {canCancel(selectedEvent) && (
                <button
                  className="btn-modal-cancel"
                  onClick={() => handleCancel(selectedEvent.id)}
                  disabled={actionLoading}
                >
                  <CancelIcon /> Cancel Event
                </button>
              )}

              {canDelete(selectedEvent) && (
                <button
                  className="btn-modal-delete"
                  onClick={() => handleDelete(selectedEvent.id)}
                  disabled={actionLoading}
                >
                  <DeleteIcon /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;