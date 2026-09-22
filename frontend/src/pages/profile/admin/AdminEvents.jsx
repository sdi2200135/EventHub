// src/pages/profile/admin/AdminEvents.jsx
import React, { useEffect, useState } from 'react';
import { eventService, userService } from '../../../services/api';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';
import './AdminEvents.css';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

// Helper: κατεβάζει string ως αρχείο
const downloadFile = (data, filename, mime) => {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Φιλτράρει το XML του backend ανά status (client-side)
const filterXmlByStatus = (xmlString, status) => {
  if (status === 'ALL') return xmlString;

  const match = xmlString.match(/^([\s\S]*?)(<Events[\s\S]*)$/);
  if (!match) throw new Error('Unexpected XML structure from server');
  const header = match[1];
  const body = match[2];

  const parser = new DOMParser();
  const doc = parser.parseFromString(body, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('Server returned invalid XML');

  const events = doc.querySelectorAll('Events > Event');
  events.forEach(ev => {
    const statusEl = Array.from(ev.children).find(c => c.tagName === 'Status');
    const evStatus = statusEl?.textContent?.trim();
    if (evStatus !== status) {
      ev.parentNode.removeChild(ev);
    }
  });

  const serializer = new XMLSerializer();
  const newBody = serializer.serializeToString(doc);
  return header + newBody;
};

// Φιλτράρει το JSON του backend ανά status (client-side)
const filterJsonByStatus = (jsonString, status) => {
  if (status === 'ALL') return jsonString;
  const parsed = JSON.parse(jsonString);
  const filtered = (parsed.Events || []).filter(ev => ev.Status === status);
  return JSON.stringify({ Events: filtered }, null, 2);
};

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);

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
  // EXPORT — όλα τα events από backend, φιλτράρουμε client-side ανά status
  // ============================================
  const handleExportEvents = async (format) => {
    setExporting(true);
    try {
      const response = await userService.exportEvents(format);

      let data = response.data;
      if (activeFilter !== 'ALL') {
        data = format === 'xml'
          ? filterXmlByStatus(data, activeFilter)
          : filterJsonByStatus(data, activeFilter);
      }

      const mime = format === 'xml' ? 'application/xml' : 'application/json';
      const filename = `events_${activeFilter.toLowerCase()}.${format}`;
      downloadFile(data, filename, mime);
    } catch (err) {
      console.error('Export events failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ============================================
  // ACTIONS
  // ============================================
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

  const openCancelModal = () => {
    if (!selectedEvent) return;
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    if (actionLoading) return;
    setShowCancelModal(false);
  };

  const confirmCancel = async () => {
    if (!selectedEvent) return;
    setActionLoading(true);

    try {
      // Το backend στέλνει αυτόματα τα μηνύματα σε όλους τους attendees
      await eventService.cancelEvent(selectedEvent.id);

      setEvents(prev =>
        prev.map(e =>
          e.id === selectedEvent.id ? { ...e, status: 'CANCELLED' } : e
        )
      );
      setSelectedEvent(prev => prev ? { ...prev, status: 'CANCELLED' } : null);
      setShowCancelModal(false);
    } catch (err) {
      console.error('Error cancelling event:', err);
      alert('Failed to cancel event. Please try again.');
    } finally {
      setActionLoading(false);
    }
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

  const getActiveBookingsCount = (ev) => {
    return ev.bookings?.filter(b => b.status !== 'CANCELLED').length || 0;
  };

  const canDelete = (ev) => ev.status === 'DRAFT' || !ev.bookings?.length;
  const canCancel = (ev) => ev.status !== 'CANCELLED' && ev.status !== 'COMPLETED';

  if (loading) {
    return <LoadingSpinner message="Loading events..." />;
  }

  if (error) {
    return (
      <div className="ae-error">
        <p>{error}</p>
        <button className="btn-retry" onClick={fetchEvents}>Try Again</button>
      </div>
    );
  }

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
                    <span className="ae-item-meta">📍 {ev.city || '—'}</span>
                    <span className="ae-item-meta">📅 {formatDate(ev.start_datetime)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Στήλη 3: Export Panel */}
      <aside className="ae-export-panel">
        <h4 className="ae-export-title">Export</h4>
        <p className="ae-export-subtitle">
          {activeFilter === 'ALL' ? 'All events' : `${getStatusLabel(activeFilter)} events`}
          <br />
          <span className="ae-export-count">({filteredEvents.length})</span>
        </p>

        <button
          className="btn-export"
          onClick={() => handleExportEvents('xml')}
          disabled={exporting || filteredEvents.length === 0}
        >
          <DownloadIcon /> {exporting ? 'Exporting...' : 'Export XML'}
        </button>

        <button
          className="btn-export"
          onClick={() => handleExportEvents('json')}
          disabled={exporting || filteredEvents.length === 0}
        >
          <DownloadIcon /> {exporting ? 'Exporting...' : 'Export JSON'}
        </button>
      </aside>

      {/* ============================================
          EVENT DETAILS MODAL
          ============================================ */}
      {selectedEvent && !showCancelModal && (
        <div className="ae-modal-overlay" onClick={closeModal}>
          <div className="ae-modal" onClick={(e) => e.stopPropagation()}>
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

            <div className="ae-modal-body">
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
                    {getActiveBookingsCount(selectedEvent)} active
                  </span>
                </div>
              </div>
            </div>

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
                  onClick={openCancelModal}
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

      {/* ============================================
          CANCEL MODAL
          ============================================ */}
      {showCancelModal && selectedEvent && (
        <div className="ae-modal-overlay" onClick={closeCancelModal}>
          <div className="ae-modal ae-cancel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ae-modal-header">
              <div className="ae-modal-header-info">
                <h3>Cancel Event</h3>
              </div>
              <button
                className="btn-close-modal"
                onClick={closeCancelModal}
                disabled={actionLoading}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="ae-modal-body">
              <p className="ae-cancel-warning">
                ⚠️ Are you sure you want to cancel <strong>"{selectedEvent.title}"</strong>?
              </p>
              <p className="ae-cancel-subtext">
                The event status will change to <strong>CANCELLED</strong>. No new
                bookings will be allowed. Existing bookings will remain for historical
                purposes.
              </p>

              {getActiveBookingsCount(selectedEvent) > 0 ? (
                <p className="ae-cancel-no-attendees">
                  📩 A notification will be automatically sent by the system to all{' '}
                  <strong>{getActiveBookingsCount(selectedEvent)}</strong> attendees
                  with active bookings.
                </p>
              ) : (
                <p className="ae-cancel-no-attendees">
                  This event has no active bookings.
                </p>
              )}
            </div>

            <div className="ae-modal-footer">
              <button
                className="btn-modal-exit"
                onClick={closeCancelModal}
                disabled={actionLoading}
              >
                Keep Event
              </button>
              <button
                className="btn-modal-confirm-cancel"
                onClick={confirmCancel}
                disabled={actionLoading}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;