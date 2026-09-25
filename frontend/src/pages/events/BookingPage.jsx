// src/pages/events/BookingPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { eventService, bookingService } from '../../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import './BookingPage.css';
import LoadingSpinner from '../../components/common/LoadingSpinner'; 

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

    if (ticketId) {
      const data = {
        eventId: id,
        ticketId: ticketId,
        quantity: parseInt(quantity) || 1,
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

  const [bookingData]  = useState(() => getBookingData() || {
    eventId: id,
    ticketId: null,
    quantity: 1,
  });

  const [event, setEvent] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ============================================
  // 2. ΕΛΕΓΧΟΣ AUTHENTICATION
  // ============================================
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      localStorage.setItem('bookingData', JSON.stringify(bookingData));
      navigate('/signin');
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
        const ev = response.data;

        // Έλεγχος κατάστασης
        if (ev.status !== 'PUBLISHED') {
          setError(
            ev.status === 'CANCELLED'
              ? 'This event has been cancelled. Bookings are no longer accepted.'
              : ev.status === 'COMPLETED'
              ? 'This event has already taken place.'
              : 'This event is not available for booking.'
          );
          setEvent(ev);
          setLoading(false);
          return;
        }

        if ((ev.available_capacity ?? 0) <= 0) {
          setError('This event is sold out. No more tickets are available.');
          setEvent(ev);
          setLoading(false);
          return;
        }

        if (new Date(ev.start_datetime) <= new Date()) {
          setError('This event has already started. Bookings are closed.');
          setEvent(ev);
          setLoading(false);
          return;
        }
        setEvent(ev);

        const foundTicket = ev.ticket_types?.find(
          t => t.id === parseInt(bookingData.ticketId)
        );
        if (!foundTicket) {
          setError('The selected ticket type is not available for this event.');
          setLoading(false);
          return;
        }
        setTicket(foundTicket);
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
  // 5. ΜΟΡΦΟΠΟΙΗΣΗ ΗΜΕΡΟΜΗΝΙΑΣ — 24h format
  // ============================================
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

  // ============================================
  // 6. ΥΠΟΛΟΓΙΣΜΟΣ ΣΥΝΟΛΟΥ
  // ============================================
  const getTotalCost = () => {
    if (!ticket) return 0;
    return ticket.price * bookingData.quantity;
  };

  // ============================================
  // 7. ΥΠΟΒΟΛΗ ΚΡΑΤΗΣΗΣ - ΜΕ CONFIRM DIALOG
  // ============================================
  const handleSubmitBooking = async () => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    // Guard: τελευταίος έλεγχος πριν το POST
    if (!event || event.status !== 'PUBLISHED') {
      setSubmitError('This event is no longer available for booking.');
      return;
    }

    if ((event.available_capacity ?? 0) <= 0) {
      setSubmitError('This event is sold out.');
      return;
    }

    // ============================================
    // CONFIRM DIALOG - ΑΠΑΙΤΕΙΤΑΙ ΑΠΟ ΤΗΝ ΕΚΦΩΝΗΣΗ
    // ============================================
    const confirmMessage = [
      '⚠️  Confirm this booking?',
      '',
      `Event:    ${event.title}`,
      `Ticket:   ${ticket?.name || 'N/A'}`,
      `Quantity: ${bookingData.quantity}`,
      `Total:    $${getTotalCost().toFixed(2)}`,
      '',
      'This action CANNOT be undone after submission.'
    ].filter(Boolean).join('\n');

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const bookingPayload = {
        event: parseInt(bookingData.eventId),
        ticket_type: parseInt(bookingData.ticketId),
        number_of_tickets: bookingData.quantity,
      };
      
      await bookingService.createBooking(bookingPayload);
      
      clearBookingData();
      setSuccess(true);
      
      // after 3 seconds go to my bookings
      setTimeout(() => {
        navigate('/profile?tab=bookings');
      }, 3000);
    } catch (err) {
      console.error('Booking error:', err);
      setSubmitError(err.message || 'Failed to complete booking. Please try again.');
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
    return <LoadingSpinner message="Loading booking details..." />;
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
        <div className="success-actions">
          <Link to="/profile?tab=bookings" className="btn-success">
            View My Bookings
          </Link>
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
          {submitError && <p className="booking-error-message">{submitError}</p>}
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