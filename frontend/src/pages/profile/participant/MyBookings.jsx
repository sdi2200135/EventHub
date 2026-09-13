// src/pages/profile/participant/MyBookings.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../../../services/api';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteIcon from '@mui/icons-material/Delete';
import './MyBookings.css';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'CONFIRMED' | 'PENDING' | 'CANCELLED'
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await bookingService.getMyBookings();
      setBookings(response.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Could not load your bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancellingId(bookingId);
    try {
      await bookingService.cancelBooking(bookingId);
      // Update local state
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: 'CANCELLED' } : b)
      );
    } catch (err) {
      console.error('Error cancelling booking:', err);
      alert('Failed to cancel booking. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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

  const getFilteredBookings = () => {
    if (filter === 'all') return bookings;
    return bookings.filter(b => b.status === filter);
  };

  const filteredBookings = getFilteredBookings();

  // Counts ανά status
  const counts = {
    all: bookings.length,
    CONFIRMED: bookings.filter(b => b.status === 'CONFIRMED').length,
    PENDING: bookings.filter(b => b.status === 'PENDING').length,
    CANCELLED: bookings.filter(b => b.status === 'CANCELLED').length,
  };

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return (
      <div className="my-bookings-loading">
        <div className="loading-spinner"></div>
        <p>Loading your bookings...</p>
      </div>
    );
  }

  // ============================================
  // ERROR
  // ============================================
  if (error) {
    return (
      <div className="my-bookings-error">
        <p>{error}</p>
        <button className="btn-retry" onClick={fetchBookings}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="my-bookings-container">
      {/* ============================================
          FILTERS
          ============================================ */}
      <div className="bookings-filters">
        <button
          className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All <span className="chip-count">{counts.all}</span>
        </button>
        <button
          className={`filter-chip ${filter === 'CONFIRMED' ? 'active' : ''}`}
          onClick={() => setFilter('CONFIRMED')}
        >
          Confirmed <span className="chip-count">{counts.CONFIRMED}</span>
        </button>
        <button
          className={`filter-chip ${filter === 'PENDING' ? 'active' : ''}`}
          onClick={() => setFilter('PENDING')}
        >
          Pending <span className="chip-count">{counts.PENDING}</span>
        </button>
        <button
          className={`filter-chip ${filter === 'CANCELLED' ? 'active' : ''}`}
          onClick={() => setFilter('CANCELLED')}
        >
          Cancelled <span className="chip-count">{counts.CANCELLED}</span>
        </button>
      </div>

      {/* ============================================
          EMPTY STATE
          ============================================ */}
      {filteredBookings.length === 0 ? (
        <div className="bookings-empty">
          <ConfirmationNumberIcon className="empty-icon" />
          <h3>No bookings found</h3>
          <p>
            {filter === 'all'
              ? "You haven't made any bookings yet."
              : `You don't have any ${filter.toLowerCase()} bookings.`}
          </p>
          {filter === 'all' && (
            <Link to="/events" className="btn-browse-events">
              Browse Events
            </Link>
          )}
        </div>
      ) : (
        /* ============================================
           BOOKINGS LIST
           ============================================ */
        <div className="bookings-list">
          {filteredBookings.map(booking => (
            <div
              key={booking.id}
              className={`booking-card status-${booking.status.toLowerCase()}`}
            >
              {/* Left: Icon */}
              <div className="booking-card-icon">
                <ConfirmationNumberIcon />
              </div>

              {/* Middle: Details */}
              <div className="booking-card-body">
                <div className="booking-card-header">
                  <h3 className="booking-event-title">
                    {booking.event_title}
                  </h3>
                  <span className={`booking-status status-${booking.status.toLowerCase()}`}>
                    {getStatusLabel(booking.status)}
                  </span>
                </div>

                <div className="booking-meta">
                  <div className="booking-meta-item">
                    <CalendarMonthIcon className="meta-icon" />
                    <span>{formatDate(booking.event_date)}</span>
                  </div>
                  <div className="booking-meta-item">
                    <LocationOnIcon className="meta-icon" />
                    <span>{booking.venue}, {booking.city}</span>
                  </div>
                </div>

                <div className="booking-details-row">
                  <div className="booking-detail">
                    <span className="detail-label">Tickets:</span>
                    <span className="detail-value">{booking.quantity}</span>
                  </div>
                  <div className="booking-detail">
                    <span className="detail-label">Total:</span>
                    <span className="detail-value total">
                      ${booking.total_price?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="booking-detail">
                    <span className="detail-label">Booked:</span>
                    <span className="detail-value">
                      {formatShortDate(booking.booking_date)}
                    </span>
                  </div>
                  {booking.seats && (
                    <div className="booking-detail">
                      <span className="detail-label">Seats:</span>
                      <span className="detail-value">{booking.seats}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="booking-card-actions">
                <Link
                  to={`/events/details/${booking.event_id}`}
                  className="btn-view-event"
                >
                  <EventIcon />
                  View Event
                </Link>

                {booking.status === 'CONFIRMED' && (
                  <button
                    className="btn-cancel-booking"
                    onClick={() => handleCancelBooking(booking.id)}
                    disabled={cancellingId === booking.id}
                    title="Cancel booking"
                  >
                    <DeleteIcon />
                    {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;