// src/pages/profile/participant/MyBookings.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../../../services/api';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import './MyBookings.css';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); 

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
  
  useEffect(() => {
    fetchBookings();
  }, []);


  // Ημερομηνία + ώρα σε 24ωρο format, ανεξαρτήτως locale
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');

    return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
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
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  const getFilteredBookings = () => {
    if (filter === 'all') return bookings;
    return bookings.filter(b => b.status === filter);
  };

  const filteredBookings = getFilteredBookings();

  const counts = {
    all: bookings.length,
    CONFIRMED: bookings.filter(b => b.status === 'CONFIRMED').length,
    CANCELLED: bookings.filter(b => b.status === 'CANCELLED').length,
  };

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return <LoadingSpinner message="Loading your bookings..." />;
  }

  // ============================================
  // ERROR
  // ============================================
  if (error) {
    return (
      <div className="my-bookings-error">
        <p>{error}</p>
        <button className="my-bookings-btn-retry" onClick={fetchBookings}>
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
      <div className="my-bookings-filters">
        <button
          className={`my-bookings-filter-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All <span className="my-bookings-chip-count">{counts.all}</span>
        </button>
        <button
          className={`my-bookings-filter-chip ${filter === 'CONFIRMED' ? 'active' : ''}`}
          onClick={() => setFilter('CONFIRMED')}
        >
          Confirmed <span className="my-bookings-chip-count">{counts.CONFIRMED}</span>
        </button>
        <button
          className={`my-bookings-filter-chip ${filter === 'CANCELLED' ? 'active' : ''}`}
          onClick={() => setFilter('CANCELLED')}
        >
          Cancelled <span className="my-bookings-chip-count">{counts.CANCELLED}</span>
        </button>
      </div>

      {/* ============================================
          EMPTY STATE
          ============================================ */}
      {filteredBookings.length === 0 ? (
        <div className="my-bookings-empty">
          <ConfirmationNumberIcon className="my-bookings-empty-icon" />
          <h3>No bookings found</h3>
          <p>
            {filter === 'all'
              ? "You haven't made any bookings yet."
              : `You don't have any ${filter.toLowerCase()} bookings.`}
          </p>
          {filter === 'all' && (
            <Link to="/events" className="my-bookings-btn-browse">
              Browse Events
            </Link>
          )}
        </div>
      ) : (
        /* ============================================
           BOOKINGS LIST
           ============================================ */
        <div className="my-bookings-list">
          {filteredBookings.map(booking => (
            <div
              key={booking.id}
              className={`my-bookings-card status-${booking.status.toLowerCase()}`}
            >
              {/* Left: Icon */}
              <div className="my-bookings-card-icon">
                <ConfirmationNumberIcon />
              </div>

              {/* Middle: Details */}
              <div className="my-bookings-card-body">
                <div className="my-bookings-card-header">
                  <h3 className="my-bookings-event-title">
                    {booking.event_title}
                  </h3>
                  <span className={`my-bookings-status status-${booking.status.toLowerCase()}`}>
                    {getStatusLabel(booking.status)}
                  </span>
                </div>

                <div className="my-bookings-meta">
                  <div className="my-bookings-meta-item">
                    <CalendarMonthIcon className="my-bookings-meta-icon" />
                    <span>{formatDate(booking.event_date)}</span>
                  </div>
                  <div className="my-bookings-meta-item">
                    <LocationOnIcon className="my-bookings-meta-icon" />
                    <span>{booking.venue}, {booking.city}</span>
                  </div>
                </div>

                <div className="my-bookings-details-row">
                  <div className="my-bookings-detail">
                    <span className="my-bookings-detail-label">Tickets:</span>
                    <span className="my-bookings-detail-value">{booking.number_of_tickets}</span>
                  </div>
                  <div className="my-bookings-detail">
                    <span className="my-bookings-detail-label">Total:</span>
                    <span className="my-bookings-detail-value total">
                      ${Number(booking.total_cost).toFixed(2)}
                    </span>
                  </div>
                  <div className="my-bookings-detail">
                    <span className="my-bookings-detail-label">Booked:</span>
                    <span className="my-bookings-detail-value">
                      {formatShortDate(booking.created_at)}
                    </span>
                  </div>
                  <div className="my-bookings-detail">
                    <span className="my-bookings-detail-label">Type:</span>
                    <span className="my-bookings-detail-value">{booking.ticket_type_name}</span>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="my-bookings-card-actions">
                <Link
                  to={`/events/details/${booking.event}`}
                  className="my-bookings-btn-view"
                >
                  <EventIcon />
                  View Event
                </Link>
                <Link
                  to={`/profile/messages/new?event=${booking.event}`}
                  className="my-bookings-btn-view"
                >
                  Message organizer
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;