// src/pages/profile/admin/ExportData.jsx
import { useEffect, useState, useMemo } from 'react';
import { eventService, userService } from '../../../services/api';
import CloseIcon from '@mui/icons-material/Close';
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

// Robust categories: strings ή objects {id, name, slug}
const getCategoriesText = (ev) => {
  if (!ev?.categories || ev.categories.length === 0) return '—';
  const result = ev.categories
    .map(c => {
      if (typeof c === 'string') return c;
      if (typeof c === 'number') return String(c);
      return c?.name || c?.category_name || c?.category?.name || c?.label || null;
    })
    .filter(Boolean)
    .join(', ');
  return result || '—';
};

// Robust organizer username
const getOrganizerUsername = (ev) =>
  ev?.organizer_username || ev?.organizer?.username || '—';

// export can be done only if there is 1+ category and 1+ ticket type as the DTD requires
const canExportEvent = (ev) =>
  (ev?.categories?.length ?? 0) > 0 && ev?.min_price != null;

const ExportData = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [exporting, setExporting] = useState(false);

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

  useEffect(() => {
    fetchEvents();
  }, []);

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

  const filteredEvents = useMemo(() => {
    if (activeFilter === 'ALL') return events;
    return events.filter(e => e.status === activeFilter);
  }, [events, activeFilter]);

  // ============================================
  // SORTING (πάντα by day — χωρίς UI)
  // ============================================
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort(
      (a, b) =>
        new Date(b.start_datetime || 0) - new Date(a.start_datetime || 0)
    );
  }, [filteredEvents]);

  const counts = {
    ALL: events.length,
    PUBLISHED: events.filter(e => e.status === 'PUBLISHED').length,
    DRAFT: events.filter(e => e.status === 'DRAFT').length,
    COMPLETED: events.filter(e => e.status === 'COMPLETED').length,
    CANCELLED: events.filter(e => e.status === 'CANCELLED').length,
  };

  // ============================================
  // EXPORT
  // ============================================
  const handleExportEvents = async (format) => {
    setExporting(true);
    try {
      const response = await userService.exportEvents(format);

      let data = response.data;
      if (activeFilter !== 'ALL') {
        data =
          format === 'xml'
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

  const handleExportSingle = async (format) => {
    if (!selectedEvent) return;
    setExporting(true);
    try {
      const response = await userService.exportEvents(format, undefined, selectedEvent.id);
      const mime = format === 'xml' ? 'application/xml' : 'application/json';
      downloadFile(response.data, `event_${selectedEvent.event_id}.${format}`, mime);
    } catch (err) {
      console.error('Export event failed:', err);
      alert(err.message || 'Export failed. Please try again.');
    } finally {
      setExporting(false);
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
      year: 'numeric',
    });
  };

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
    <div className="ae-layout ae-layout--3col">
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

      {/* Στήλη 2: Events List (χωρίς search / sort) */}
      <div className="ae-content">
        {sortedEvents.length === 0 ? (
          <div className="ae-empty">
            <p>No events found.</p>
          </div>
        ) : (
          <div className="ae-list">
            {sortedEvents.map(ev => (
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
          <span className="ae-export-count">({sortedEvents.length})</span>
        </p>

        <button
          className="btn-export"
          onClick={() => handleExportEvents('xml')}
          disabled={exporting || sortedEvents.length === 0}
        >
          <DownloadIcon /> {exporting ? 'Exporting...' : 'Export XML'}
        </button>

        <button
          className="btn-export"
          onClick={() => handleExportEvents('json')}
          disabled={exporting || sortedEvents.length === 0}
        >
          <DownloadIcon /> {exporting ? 'Exporting...' : 'Export JSON'}
        </button>
      </aside>

      {/* ============================================
          EVENT DETAILS MODAL (read-only)
          ============================================ */}
      {selectedEvent && (
        <div className="ae-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="ae-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ae-modal-header">
              <div className="ae-modal-header-info">
                <h3>{selectedEvent.title}</h3>
                <p>
                  <span className={`ae-status status-${(selectedEvent.status || '').toLowerCase()}`}>
                    {getStatusLabel(selectedEvent.status)}
                  </span>
                  <span className="ae-modal-id">
                    {' '}• ID: {selectedEvent.event_id || selectedEvent.id}
                  </span>
                </p>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setSelectedEvent(null)}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="ae-modal-body">
              <div className="ae-modal-section">
                <h4>Event Info</h4>
                <div className="ae-modal-row">
                  <span className="ae-modal-label">Organizer:</span>
                  <span className="ae-modal-value">{getOrganizerUsername(selectedEvent)}</span>
                </div>
                <div className="ae-modal-row">
                  <span className="ae-modal-label">Type:</span>
                  <span className="ae-modal-value">{selectedEvent.event_type || '—'}</span>
                </div>
                <div className="ae-modal-row">
                  <span className="ae-modal-label">Categories:</span>
                  <span className="ae-modal-value">{getCategoriesText(selectedEvent)}</span>
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
              </div>
            </div>

            <div className="ae-modal-footer">
              <button
                className="btn-modal-export"
                onClick={() => handleExportSingle('xml')}
                disabled={exporting || !canExportEvent(selectedEvent)}
                title={canExportEvent(selectedEvent)
                  ? 'Export this event as XML'
                  : 'This event has no ticket type or category, so it cannot be exported'}
              >
                <DownloadIcon /> {exporting ? '...' : 'XML'}
              </button>
              <button
                className="btn-modal-export"
                onClick={() => handleExportSingle('json')}
                disabled={exporting || !canExportEvent(selectedEvent)}
                title={canExportEvent(selectedEvent)
                  ? 'Export this event as JSON'
                  : 'This event has no ticket type or category, so it cannot be exported'}
              >
                <DownloadIcon /> {exporting ? '...' : 'JSON'}
              </button>

              <button
                className="btn-modal-exit"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportData;