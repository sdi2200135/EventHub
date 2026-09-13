// src/pages/profile/organizer/EventDetailsOrganizer.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { eventService, messageService } from '../../../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import './EventDetailsOrganizer.css';

const EventDetailsOrganizer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Cancel Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelNotify, setCancelNotify] = useState(true);
  const [cancelSubject, setCancelSubject] = useState('');
  const [cancelBody, setCancelBody] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventRes, bookingsRes] = await Promise.all([
        eventService.getEvent(id),
        eventService.getEventBookings(id),
      ]);
      setEvent(eventRes.data);
      setBookings(bookingsRes.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching event:', err);
      setError('Could not load event details.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // DELETE EVENT
  // ============================================
  const handleDelete = async () => {
    // Έλεγχος: επιτρέπεται μόνο αν DRAFT ή χωρίς bookings
    const hasBookings = event?.bookings?.length > 0;
    if (event.status === 'PUBLISHED' && hasBookings) {
      alert('Cannot delete a published event that has bookings. Cancel it instead.');
      return;
    }

    if (!window.confirm(`Delete event "${event.title}"? This cannot be undone.`)) return;

    setActionLoading(true);
    try {
      await eventService.deleteEvent(id);
      navigate('/profile');
    } catch (err) {
      console.error('Error deleting event:', err);
      alert(err.message || 'Failed to delete event.');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================
  // CANCEL EVENT (open modal)
  // ============================================
  const openCancelModal = () => {
    // Pre-fill με default subject/body
    setCancelSubject(`Event Cancelled: ${event.title}`);
    setCancelBody(
      `We regret to inform you that the event "${event.title}" scheduled for ${formatDate(event.start_datetime)} has been cancelled.\n\nWe apologize for any inconvenience.`
    );
    setCancelNotify(true);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    if (actionLoading) return;
    setShowCancelModal(false);
  };

  // ============================================
  // CONFIRM CANCEL
  // ============================================
  const confirmCancel = async () => {
    setActionLoading(true);
    try {
      await eventService.cancelEvent(
        id,
        cancelNotify,
        cancelSubject,
        cancelBody
      );
      setShowCancelModal(false);
      // Refresh event
      await fetchData();
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
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div className="ed-organizer-loading">
        <div className="loading-spinner"></div>
        <p>Loading event...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="ed-organizer-error">
        <h2>Event not found</h2>
        <p>{error || 'The event you are looking for does not exist.'}</p>
        <Link to="/profile" className="btn-back-link">Back to Profile</Link>
      </div>
    );
  }

  const canDelete = event.status === 'DRAFT' || !event.bookings?.length;
  const canCancel = event.status !== 'CANCELLED' && event.status !== 'COMPLETED';
  const canEdit = event.status !== 'CANCELLED' && event.status !== 'COMPLETED';

  return (
    <div className="ed-organizer-page">
      <div className="ed-organizer-container">
        {/* Header */}
        <div className="ed-organizer-header">
          <button
            className="btn-back"
            onClick={() => navigate('/profile')}
          >
            <ArrowBackIcon />
          </button>
          <h1>Event Details</h1>
          <span className={`ed-status status-${event.status.toLowerCase()}`}>
            {getStatusLabel(event.status)}
          </span>
        </div>

        {/* Main Content */}
        <div className="ed-organizer-content">
          {/* Left: Event Info */}
          <div className="ed-info">
            <h2 className="ed-title">{event.title}</h2>

            <div className="ed-meta">
              <div className="ed-meta-item">
                <span className="meta-label">Type:</span>
                <span className="meta-value">{event.event_type || 'N/A'}</span>
              </div>
              <div className="ed-meta-item">
                <span className="meta-label">Categories:</span>
                <span className="meta-value">
                  {event.categories?.join(', ') || 'N/A'}
                </span>
              </div>
              <div className="ed-meta-item">
                <span className="meta-label">Venue:</span>
                <span className="meta-value">
                  {event.venue}, {event.city}, {event.country}
                </span>
              </div>
              <div className="ed-meta-item">
                <span className="meta-label">Address:</span>
                <span className="meta-value">{event.address}</span>
              </div>
              <div className="ed-meta-item">
                <span className="meta-label">Start:</span>
                <span className="meta-value">{formatDate(event.start_datetime)}</span>
              </div>
              <div className="ed-meta-item">
                <span className="meta-label">End:</span>
                <span className="meta-value">{formatDate(event.end_datetime)}</span>
              </div>
              <div className="ed-meta-item">
                <span className="meta-label">Capacity:</span>
                <span className="meta-value">{event.capacity} seats</span>
              </div>
              <div className="ed-meta-item">
                <span className="meta-label">Available:</span>
                <span className="meta-value">{event.available_capacity} seats</span>
              </div>
            </div>

            {event.description && (
              <div className="ed-description">
                <h3>Description</h3>
                <p>{event.description}</p>
              </div>
            )}
          </div>

          {/* Right: Actions + Bookings Summary */}
          <div className="ed-side">
            {/* Bookings Summary */}
            <div className="ed-bookings-card">
              <h3>Bookings</h3>
              <div className="ed-bookings-count">
                <span className="count-number">{bookings.length}</span>
                <span className="count-label">
                  {bookings.length === 1 ? 'reservation' : 'reservations'}
                </span>
              </div>
              {bookings.length > 0 && (
                <div className="ed-bookings-detail">
                  <span>Total tickets sold:</span>
                  <strong>
                    {bookings
                      .filter(b => b.status !== 'CANCELLED')
                      .reduce((sum, b) => sum + (b.quantity || 0), 0)}
                  </strong>
                </div>
              )}
              <button
                className="btn-view-reservations"
                onClick={() => navigate('/profile')}
              >
                View in Reservations Tab
              </button>
            </div>

            {/* Actions */}
            <div className="ed-actions-card">
              <h3>Actions</h3>

              {canEdit && (
                <button
                  className="btn-action-edit"
                  onClick={() => navigate(`/profile/events/edit/${event.id}`)}
                  disabled={actionLoading}
                >
                  <EditIcon /> Edit Event
                </button>
              )}

              {canCancel && (
                <button
                  className="btn-action-cancel"
                  onClick={openCancelModal}
                  disabled={actionLoading}
                >
                  <CancelIcon /> Cancel Event
                </button>
              )}

              {canDelete && (
                <button
                  className="btn-action-delete"
                  onClick={handleDelete}
                  disabled={actionLoading}
                >
                  <DeleteIcon /> Delete Event
                </button>
              )}

              {event.status === 'CANCELLED' && (
                <p className="status-note cancelled">
                  This event has been cancelled. No new bookings are allowed.
                </p>
              )}

              {event.status === 'COMPLETED' && (
                <p className="status-note completed">
                  This event has been completed.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================
          CANCEL MODAL
          ============================================ */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={closeCancelModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cancel Event</h2>
              <button
                className="btn-close-modal"
                onClick={closeCancelModal}
                disabled={actionLoading}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-warning">
                ⚠️ Are you sure you want to cancel <strong>"{event.title}"</strong>?
              </p>
              <p className="modal-subtext">
                The event status will change to <strong>CANCELLED</strong>. No new
                bookings will be allowed. Existing bookings will remain for historical
                purposes.
              </p>

              {bookings.filter(b => b.status !== 'CANCELLED').length > 0 && (
                <>
                  <div className="modal-checkbox-row">
                    <label className="modal-checkbox">
                      <input
                        type="checkbox"
                        checked={cancelNotify}
                        onChange={(e) => setCancelNotify(e.target.checked)}
                        disabled={actionLoading}
                      />
                      <span>
                        Send notification to all attendees
                        ({bookings.filter(b => b.status !== 'CANCELLED').length})
                      </span>
                    </label>
                  </div>

                  {cancelNotify && (
                    <div className="modal-notify-fields">
                      <div className="modal-field">
                        <label>Subject:</label>
                        <input
                          type="text"
                          value={cancelSubject}
                          onChange={(e) => setCancelSubject(e.target.value)}
                          disabled={actionLoading}
                          placeholder="Event Cancelled"
                        />
                      </div>
                      <div className="modal-field">
                        <label>Message:</label>
                        <textarea
                          value={cancelBody}
                          onChange={(e) => setCancelBody(e.target.value)}
                          rows={5}
                          disabled={actionLoading}
                          placeholder="Write a message to attendees..."
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {bookings.filter(b => b.status !== 'CANCELLED').length === 0 && (
                <p className="modal-no-attendees">
                  No attendees to notify (no active bookings).
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-modal-cancel"
                onClick={closeCancelModal}
                disabled={actionLoading}
              >
                Keep Event
              </button>
              <button
                className="btn-modal-confirm"
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

export default EventDetailsOrganizer;