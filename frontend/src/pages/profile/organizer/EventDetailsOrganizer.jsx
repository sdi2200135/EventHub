// src/pages/profile/organizer/EventDetailsOrganizer.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventService } from '../../../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import './EventDetailsOrganizer.css';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const EventDetailsOrganizer = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Cancel Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);


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
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ============================================
  // DELETE EVENT
  // ============================================
  const handleDelete = async () => {
    // Only when nothing is booked — otherwise the backend refuses it
    const hasBookings = bookings.length > 0;
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
      await eventService.cancelEvent(id);
      setShowCancelModal(false);
      // Refresh event
      await fetchData();
    } catch (err) {
      console.error('Error cancelling event:', err);
      alert(err.message || 'Failed to cancel event. Please try again.');
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
    if (isNaN(date.getTime())) return '';

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');

    return `${dayName}, ${dd}/${mm}/${yyyy}, ${hh}:${min}`;
  };

  // Robust categories: strings, numbers, objects {id, name, slug}
  const getCategoriesText = (ev) => {
    if (!ev?.categories || ev.categories.length === 0) return 'N/A';
    const result = ev.categories
      .map(c => {
        if (typeof c === 'string') return c;
        if (typeof c === 'number') return String(c);
        return c?.name || c?.category_name || c?.category?.name || c?.label || null;
      })
      .filter(Boolean)
      .join(', ');
    return result || 'N/A';
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
    return <LoadingSpinner message="Loading event..." />;
  }

  if (error || !event) {
    return (
      <div className="ed-organizer-error">
        <h2>Event not found</h2>
        <p>{error || 'The event you are looking for does not exist.'}</p>
        <Link to="/profile?tab=events" className="btn-back-link">Back to Profile</Link>
      </div>
    );
  }

  const canDelete = event.status === 'DRAFT' || bookings.length === 0;
  const canCancel = event.status === 'PUBLISHED';
  const canEdit = event.status !== 'CANCELLED' && event.status !== 'COMPLETED';

  return (
    <div className="ed-organizer-page">
      <div className="ed-organizer-container">
        {/* Header */}
        <div className="ed-organizer-header">
          <button
            className="btn-back"
            onClick={() => navigate('/profile?tab=events')}
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
                  {getCategoriesText(event)}
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
                      .reduce((sum, b) => sum + (b.number_of_tickets || 0), 0)}
                  </strong>
                </div>
              )}
              <button
                className="btn-view-reservations"
                onClick={() => navigate(`/profile/reservations/${event.id}`)}
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
                The event status will change to <strong>CANCELLED</strong>. All bookings will be
                cancelled and every attendee will automatically receive a message about it.
              </p>
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