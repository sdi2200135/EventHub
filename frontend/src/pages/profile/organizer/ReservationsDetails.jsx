// src/pages/profile/organizer/ReservationsDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventService, bookingService } from '../../../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import './ReservationsDetails.css';

const ReservationsDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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
      console.error('Error fetching reservations:', err);
      setError('Could not load reservations.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'CONFIRMED': return 'Confirmed';
      case 'PENDING': return 'Pending';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  // ============================================
  // MODAL HANDLERS
  // ============================================
  const handleReservationClick = (booking) => {
    setSelectedBooking(booking);
  };

  const handleCloseModal = () => {
    if (actionLoading) return;
    setSelectedBooking(null);
  };

  const handleApprove = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);
    try {
      await bookingService.approveBooking(selectedBooking.id);
      // Update local state
      setBookings(prev =>
        prev.map(b => b.id === selectedBooking.id ? { ...b, status: 'CONFIRMED' } : b)
      );
      setSelectedBooking(null);
    } catch (err) {
      console.error('Error approving booking:', err);
      alert('Failed to approve booking.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBooking) return;
    if (!window.confirm('Reject this booking? The tickets will be released back.')) return;

    setActionLoading(true);
    try {
      await bookingService.rejectBooking(selectedBooking.id);
      setBookings(prev =>
        prev.map(b => b.id === selectedBooking.id ? { ...b, status: 'CANCELLED' } : b)
      );
      setSelectedBooking(null);
    } catch (err) {
      console.error('Error rejecting booking:', err);
      alert('Failed to reject booking.');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return (
      <div className="rd-loading">
        <div className="loading-spinner"></div>
        <p>Loading reservations...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="rd-error">
        <h2>Event not found</h2>
        <p>{error || 'The event you are looking for does not exist.'}</p>
        <Link to="/profile?tab=reservations" className="btn-back-link">Back to Profile</Link>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="rd-page">
      <div className="rd-container">
        {/* Header */}
        <div className="rd-header">
          <button className="btn-back" onClick={() => navigate('/profile?tab=reservations')}>
            <ArrowBackIcon />
          </button>
          <h1 className="rd-page-title">Event Details</h1>
        </div>

        {/* SECTION 1: EVENT DETAILS */}
        <section className="rd-details">
          <div className="rd-col">
            <div className="rd-row">
              <span className="rd-label">ID:</span>
              <span className="rd-value">{event.event_id || 'Default'}</span>
            </div>
            <div className="rd-row">
              <span className="rd-label">Title:</span>
              <span className="rd-value">{event.title || '—'}</span>
            </div>
            <div className="rd-row">
              <span className="rd-label">Type:</span>
              <span className="rd-value">{event.event_type || '—'}</span>
            </div>
            <div className="rd-row">
              <span className="rd-label">Capacity:</span>
              <span className="rd-value">{event.capacity}</span>
            </div>
            <div className="rd-row">
              <span className="rd-label">Venue:</span>
              <span className="rd-value">{event.venue || '—'}</span>
            </div>
            <div className="rd-row">
              <span className="rd-label">Address:</span>
              <span className="rd-value">{event.address || '—'}</span>
            </div>
            <div className="rd-row">
              <span className="rd-label">City:</span>
              <span className="rd-value">{event.city || '—'}</span>
            </div>
          </div>

          <div className="rd-col">
            <div className="rd-row">
              <span className="rd-label">Country:</span>
              <span className="rd-value">{event.country || '—'}</span>
            </div>
            <div className="rd-row-inline">
              <div className="rd-row-mini">
                <span className="rd-label">Latitude:</span>
                <span className="rd-value">{event.latitude ?? '—'}</span>
              </div>
              <div className="rd-row-mini">
                <span className="rd-label">Longitude:</span>
                <span className="rd-value">{event.longitude ?? '—'}</span>
              </div>
            </div>
            <div className="rd-row">
              <span className="rd-label">Date and Time:</span>
            </div>
            <div className="rd-row rd-row-indent">
              <span className="rd-label">Start:</span>
              <span className="rd-value">
                {formatDate(event.start_datetime)} &nbsp; {formatTime(event.start_datetime)}
              </span>
            </div>
            <div className="rd-row rd-row-indent">
              <span className="rd-label">End:</span>
              <span className="rd-value">
                {formatDate(event.end_datetime)} &nbsp; {formatTime(event.end_datetime)}
              </span>
            </div>
            <div className="rd-row">
              <span className="rd-label">Category:</span>
              <span className="rd-value">
                {event.categories?.join(', ') || '—'}
              </span>
            </div>
          </div>

          <div className="rd-tickets">
            <div className="rd-tickets-header">
              <span>Ticket Type</span>
              <span>Availability</span>
            </div>
            <div className="rd-tickets-list">
              {(event.ticket_types || []).length === 0 ? (
                <div className="rd-tickets-empty">No ticket types</div>
              ) : (
                event.ticket_types.map((tt, idx) => (
                  <div key={idx} className="rd-ticket-row">
                    <span className="rd-ticket-id">
                      {tt.name || tt.ticket_type_id || `T${idx + 1}`}
                    </span>
                    <span className="rd-ticket-avail">
                      {String(tt.available ?? 0).padStart(2, '0')} / {tt.quantity ?? 0}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* SECTION 2: RESERVATIONS */}
        <section className="rd-reservations">
          <h2 className="rd-section-title">Reservations</h2>

          {bookings.length === 0 ? (
            <div className="rd-no-reservations">
              <p>No reservations yet for this event.</p>
            </div>
          ) : (
            <div className="rd-res-grid">
              {bookings.map((booking, idx) => (
                <div
                  key={booking.id || idx}
                  className={`rd-res-card status-${(booking.status || '').toLowerCase()}`}
                  onClick={() => handleReservationClick(booking)}
                >
                  <span className="rd-res-user">
                    {booking.user_name || `User ${booking.user_id}`}
                  </span>
                  <span className="rd-res-ticket">
                    Ticket Type: {booking.ticket_type_name || 'Regular'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ============================================
          RESERVATION DETAILS MODAL
          ============================================ */}
      {selectedBooking && (
        <div className="rd-modal-overlay" onClick={handleCloseModal}>
          <div className="rd-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="rd-modal-header">
              <h3>Booking Id: {selectedBooking.id}</h3>
            </div>

            {/* Body */}
            <div className="rd-modal-body">
              <div className="rd-modal-grid">
                <div className="rd-modal-row">
                  <span className="rd-modal-label">Attendee:</span>
                  <span className="rd-modal-value">
                    {selectedBooking.user_name || `User ${selectedBooking.user_id}`}
                  </span>
                </div>
                <div className="rd-modal-row">
                  <span className="rd-modal-label">Date:</span>
                  <span className="rd-modal-value">
                    {formatDate(selectedBooking.booking_date || event.start_datetime)}
                  </span>
                </div>

                <div className="rd-modal-row">
                  <span className="rd-modal-label">Ticket Type:</span>
                  <span className="rd-modal-value">
                    {selectedBooking.ticket_type_name || 'Regular'}
                  </span>
                </div>
                <div className="rd-modal-row">
                  <span className="rd-modal-label">Time:</span>
                  <span className="rd-modal-value">
                    {formatTime(selectedBooking.booking_date || event.start_datetime)}
                  </span>
                </div>

                <div className="rd-modal-row">
                  <span className="rd-modal-label">Tickets Number:</span>
                  <span className="rd-modal-value">{selectedBooking.quantity}</span>
                </div>
                <div className="rd-modal-row">
                  <span className="rd-modal-label">Total Cost:</span>
                  <span className="rd-modal-value">
                    {Number(selectedBooking.total_price || 0).toFixed(2)}
                  </span>
                </div>

                <div className="rd-modal-row">
                  <span className="rd-modal-label">Booking Status:</span>
                  <span className={`rd-modal-value status-${(selectedBooking.status || '').toLowerCase()}`}>
                    {getStatusLabel(selectedBooking.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="rd-modal-footer">
              <button
                className="btn-modal-exit"
                onClick={handleCloseModal}
                disabled={actionLoading}
              >
                Exit
              </button>

              {selectedBooking.status === 'PENDING' && (
                <>
                  <button
                    className="btn-modal-approve"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    className="btn-modal-reject"
                    onClick={handleReject}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Rejecting...' : 'Reject'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationsDetails;