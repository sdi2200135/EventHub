// src/pages/BookingPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventService, bookingService } from '../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import './BookingPage.css';

const BookingPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ============================================
  // 1. ΦΟΡΤΩΣΗ/ΑΠΟΘΗΚΕΥΣΗ ΔΕΔΟΜΕΝΩΝ
  // ============================================
  const getBookingData = () => {
    const ticketId = searchParams.get('ticketId');
    const quantity = searchParams.get('quantity');
    const seats = searchParams.get('seats');

    if (ticketId) {
      const data = {
        eventId: id,
        ticketId: ticketId,
        quantity: parseInt(quantity) || 1,
        seats: seats || '',
        timestamp: Date.now()
      };
      localStorage.setItem('bookingData', JSON.stringify(data));
      return data;
    }

    const saved = localStorage.getItem('bookingData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.eventId === id && (Date.now() - parsed.timestamp < 600000)) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing booking data:', e);
      }
    }

    return null;
  };

  const [bookingData, setBookingData] = useState(() => getBookingData() || {
    eventId: id,
    ticketId: null,
    quantity: 1,
    seats: '',
  });

  const [event, setEvent] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // ============================================
  // 2. ΕΛΕΓΧΟΣ AUTHENTICATION
  // ============================================
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      localStorage.setItem('bookingData', JSON.stringify(bookingData));
      const currentUrl = `/events/details/${id}/booking`;
      navigate(`/signin?redirect=${encodeURIComponent(currentUrl)}`);
    }
  }, [authLoading, isAuthenticated, navigate, id, bookingData]);

  // ============================================
  // 3. ΦΟΡΤΩΣΗ ΣΤΟΙΧΕΙΩΝ EVENT
  // ============================================
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!bookingData.eventId || !isAuthenticated) return;

      try {
        setLoading(true);
        const response = await eventService.getEvent(bookingData.eventId);
        setEvent(response.data);

        const foundTicket = response.data.ticket_types?.find(
          t => t.id === parseInt(bookingData.ticketId)
        );
        setTicket(foundTicket);

        console.log('Booking Data:', bookingData);
        console.log('Found Ticket:', foundTicket);

        setError(null);
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Could not load event details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [bookingData.eventId, bookingData.ticketId, isAuthenticated]);

  // ============================================
  // 4. ΚΑΘΑΡΙΣΜΟΣ LOCALSTORAGE
  // ============================================
  const clearBookingData = () => {
    localStorage.removeItem('bookingData');
  };

  // ============================================
  // 5. ΜΟΡΦΟΠΟΙΗΣΗ ΗΜΕΡΟΜΗΝΙΑΣ
  // ============================================
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ============================================
  // 6. ΥΠΟΛΟΓΙΣΜΟΣ ΣΥΝΟΛΟΥ
  // ============================================
  const getTotalCost = () => {
    if (!ticket) return 0;
    return ticket.price * bookingData.quantity;
  };

  // ============================================
  // 7. ΥΠΟΒΟΛΗ ΚΡΑΤΗΣΗΣ - ΕΝΗΜΕΡΩΜΕΝΗ
  // ============================================
  const handleSubmitBooking = async () => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const bookingPayload = {
        event: parseInt(bookingData.eventId),
        ticket_type: parseInt(bookingData.ticketId),
        quantity: bookingData.quantity,
        seats: bookingData.seats || '',
      };
      
      console.log('Submitting booking:', bookingPayload);
      
      const response = await bookingService.createBooking(bookingPayload);
      console.log('Booking response:', response.data);

      clearBookingData();
      setSuccess(true);
      
      // Αλλαγή: Μετά από 3 δευτερόλεπτα πάει στην αρχική σελίδα
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      console.error('Booking error:', err);
      const errorMsg = err.response?.data?.error || 
                       err.response?.data?.detail || 
                       err.response?.data?.message ||
                       'Failed to complete booking. Please try again.';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // 8. ΕΛΕΓΧΟΣ ΑΝ ΥΠΑΡΧΟΥΝ ΔΕΔΟΜΕΝΑ
  // ============================================
  if (!bookingData.ticketId) {
    return (
      <div className="booking-error">
        <h2>No booking data found</h2>
        <p>Please select your tickets first.</p>
        <Link to={`/events/details/${id}`} className="btn-back">
          Back to Event
        </Link>
      </div>
    );
  }

  // ============================================
  // 9. ΦΟΡΤΩΣΗ
  // ============================================
  if (authLoading || loading) {
    return (
      <div className="booking-loading">
        <div className="loading-spinner"></div>
        <p>Loading booking details...</p>
      </div>
    );
  }

  // ============================================
  // 10. ERROR
  // ============================================
  if (error) {
    return (
      <div className="booking-error">
        <h2>Oops! Something went wrong</h2>
        <p>{error}</p>
        <Link to="/events" className="btn-back">
          Back to Events
        </Link>
      </div>
    );
  }

  // ============================================
  // 11. SUCCESS - ΜΕ ΚΟΥΜΠΙ ΓΙΑ ΕΠΙΣΤΡΟΦΗ ΣΤΗΝ ΑΡΧΙΚΗ
  // ============================================
  if (success) {
    return (
      <div className="booking-success">
        <CheckCircleIcon className="success-icon" />
        <h2>Booking Confirmed! 🎉</h2>
        <p>Your tickets have been reserved successfully.</p>
        <p className="success-detail">
          You will receive a confirmation email shortly.
        </p>
        <div className="success-actions">
          <Link to="/" className="btn-success">
            Return to Home
          </Link>
          {/* Το κουμπί για τις κρατήσεις υπάρχει αλλά δεν φαίνεται ακόμα
          <Link to="/profile/bookings" className="btn-success-secondary">
            View My Bookings
          </Link>
          */}
        </div>
      </div>
    );
  }

  // ============================================
  // 12. RENDER BOOKING PAGE
  // ============================================
  return (
    <div className="booking-page">
      <div className="booking-container">
        <div className="booking-header">
          <button onClick={() => navigate(-1)} className="btn-back">
            <ArrowBackIcon /> Back
          </button>
          <h1>Complete Your Booking</h1>
        </div>

        {event && (
          <div className="booking-event-summary">
            <div className="event-image">
              {event.photos && event.photos.length > 0 ? (
                <img src={event.photos[0].image} alt={event.title} />
              ) : (
                <div className="event-placeholder">🎉</div>
              )}
            </div>
            <div className="event-details">
              <h2>{event.title}</h2>
              <p className="event-location">
                📍 {event.venue}, {event.city}
              </p>
              <p className="event-date">
                📅 {formatDate(event.start_datetime)}
              </p>
            </div>
          </div>
        )}

        <div className="booking-user-info">
          <h3>Booking Details</h3>
          <div className="user-info-card">
            <div className="user-avatar">
              {user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </div>
            <div className="user-details">
              <p className="user-name">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="user-email">{user?.email}</p>
              <p className="user-username">@{user?.username}</p>
            </div>
          </div>
        </div>

        <div className="booking-ticket-summary">
          <h3>Ticket Summary</h3>
          <div className="ticket-summary-card">
            <div className="ticket-row">
              <span className="ticket-label">Ticket Type</span>
              <span className="ticket-value">{ticket?.name || 'N/A'}</span>
            </div>
            <div className="ticket-row">
              <span className="ticket-label">Quantity</span>
              <span className="ticket-value">{bookingData.quantity}</span>
            </div>
            {bookingData.seats && (
              <div className="ticket-row">
                <span className="ticket-label">Seats</span>
                <span className="ticket-value">{bookingData.seats}</span>
              </div>
            )}
            <div className="ticket-row">
              <span className="ticket-label">Price per ticket</span>
              <span className="ticket-value">${ticket?.price?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="ticket-row total">
              <span className="ticket-label">Total</span>
              <span className="ticket-value">
                ${getTotalCost().toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="booking-actions">
          <button
            className="btn-confirm-booking"
            onClick={handleSubmitBooking}
            disabled={submitting}
          >
            {submitting ? 'Processing...' : 'Confirm Booking'}
          </button>
          {error && <p className="booking-error-message">{error}</p>}
        </div>

        <p className="booking-terms">
          By confirming your booking, you agree to our Terms & Conditions
          and Cancellation Policy.
        </p>
      </div>
    </div>
  );
};

export default BookingPage;