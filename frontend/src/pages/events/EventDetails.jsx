// src/pages/events/EventDetails.jsx
import  { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import './EventDetails.css';
import BookTicket from '../../components/BookTicket';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Διόρθωση για τα εικονίδια του Leaflet (χρειάζεται για να δουλέψει με React)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const EventDetails = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await eventService.getEvent(id);
        setEvent(response.data);
        setLoading(false);
      } catch (err) {
        setError('Event not found');
        setLoading(false);
        console.error('Error fetching event:', err);
      }
    };
    fetchEvent();
  }, [id]);

  // Αρχικοποίηση χάρτη όταν φορτώσει το event και είναι ενεργή η καρτέλα description
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    if (activeTab === 'description' && event && event.latitude && event.longitude && mapContainerRef.current) {
      const lat = parseFloat(event.latitude);
      const lng = parseFloat(event.longitude);

      if (!isNaN(lat) && !isNaN(lng)) {
        setTimeout(() => {
          if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([lat, lng], 14);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxZoom: 19
            }).addTo(mapRef.current);

            L.marker([lat, lng]).addTo(mapRef.current)
              .bindPopup(`📍 ${event.venue || 'Event Location'}`)
              .openPopup();

            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.invalidateSize();
              }
            }, 200);
          }
        }, 100);
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [event, activeTab]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // 24h format ανεξαρτήτως locale
  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  // Επιστρέφει το κείμενο των κατηγοριών — υποστηρίζει strings και objects {id, name}
  const getCategoriesText = (ev) => {
    if (!ev?.categories || ev.categories.length === 0) return null;
    return ev.categories
      .map(c => (typeof c === 'string' ? c : c.name))
      .filter(Boolean)
      .join(', ');
  };

  // ============================================
  // BOOKING ELIGIBILITY
  // ============================================
  const canBook = (ev) => {
    if (!ev) return false;
    if (ev.status !== 'PUBLISHED') return false;
    if ((ev.available_capacity ?? 0) <= 0) return false;
    if (new Date(ev.start_datetime) <= new Date()) return false;

    const hasAvailableTicket = (ev.ticket_types || []).some(t => (t.available ?? 0) > 0);
    return hasAvailableTicket;
  };

  const getBookingBlockReason = (ev) => {
    if (!ev) return '';
    switch (ev.status) {
      case 'DRAFT': return 'This event is not yet published.';
      case 'COMPLETED': return 'This event has already taken place.';
      case 'CANCELLED': return 'This event has been cancelled.';
      case 'PUBLISHED':
        if ((ev.available_capacity ?? 0) <= 0) 
          return 'This event is sold out.';
        if (new Date(ev.start_datetime) <= new Date()) 
          return 'This event has already started.';
        return 'No tickets available.';

      default: return 'Bookings are not available.';
    }
  };

  // Άνοιγμα modal
  const openModal = (ticketId) => {
    setSelectedTicket(ticketId);
    setIsModalOpen(true);
  };

  // Κλείσιμο modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
  };

  // ============================================
  // CAROUSEL HANDLERS
  // ============================================
  const photos = event?.photos || [];
  const hasMultiplePhotos = photos.length > 1;

  const goToPrevPhoto = () => {
    setCurrentPhotoIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNextPhoto = () => {
    setCurrentPhotoIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const goToPhoto = (index) => {
    setCurrentPhotoIndex(index);
  };

  const currentPhoto = photos[currentPhotoIndex];

  if (loading) {
    return <LoadingSpinner message="Loading event..." fullHeight />;
  }

  if (error || !event) {
    return (
      <div className="event-details-error">
        <h2>Event not found</h2>
        <p>The event you are looking for does not exist.</p>
        <Link to="/events" className="btn-back">Back to Events</Link>
      </div>
    );
  }

  const categoriesText = getCategoriesText(event);

  return (
    <div className="event-details-page">
      <div className="event-details-container">
        {/* ΑΡΙΣΤΕΡΗ ΣΤΗΛΗ: Εικόνα + Category + When + Where */}
        <div className="event-left-column">
          <div className="event-image-wrapper">
            {photos.length > 0 ? (
              <>
                <img
                  src={currentPhoto?.image}
                  alt={currentPhoto?.caption || event.title}
                  className="carousel-image"
                />

                {hasMultiplePhotos && (
                  <>
                    {/* Αριστερό βελάκι */}
                    <button
                      className="carousel-arrow carousel-arrow-left"
                      onClick={goToPrevPhoto}
                      aria-label="Previous photo"
                    >
                      ‹
                    </button>

                    {/* Δεξί βελάκι */}
                    <button
                      className="carousel-arrow carousel-arrow-right"
                      onClick={goToNextPhoto}
                      aria-label="Next photo"
                    >
                      ›
                    </button>

                    {/* Dots indicators */}
                    <div className="carousel-dots">
                      {photos.map((_, idx) => (
                        <button
                          key={idx}
                          className={`carousel-dot ${idx === currentPhotoIndex ? 'active' : ''}`}
                          onClick={() => goToPhoto(idx)}
                          aria-label={`Go to photo ${idx + 1}`}
                        />
                      ))}
                    </div>

                    {/* Counter */}
                    <div className="carousel-counter">
                      {currentPhotoIndex + 1} / {photos.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="event-image-placeholder">🎉</div>
            )}
          </div>

          <div className="event-meta-info">
            {categoriesText && (
              <div className="meta-item">
                <span className="meta-label">Category</span>
                <ArrowRightAltIcon className="arrow-icon-small" />
                <span className="meta-value">{categoriesText}</span>
              </div>
            )}
            <div className="meta-item">
              <span className="meta-label">Where</span>
              <ArrowRightAltIcon className="arrow-icon-small" />
              <span className="meta-value">{event.venue}, {event.city}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">When</span>
              <ArrowRightAltIcon className="arrow-icon-small" />
              <span className="meta-value">{formatDate(event.start_datetime)}</span>
            </div>
          </div>
        </div>

        {/* ΔΕΞΙΑ ΣΤΗΛΗ: Τίτλος + Tabs + Περιεχόμενο */}
        <div className="event-right-column">
          <h1 className="event-title">
            {event.title}
            {event.status !== 'PUBLISHED' && (
              <span className={`event-status-badge status-${event.status.toLowerCase()}`}>
                {event.status}
              </span>
            )}
          </h1>

          {/* Tabs */}
          <div className="event-tabs">
            <button
              className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              Information
            </button>
            <button
              className={`tab-btn ${activeTab === 'organizer' ? 'active' : ''}`}
              onClick={() => setActiveTab('organizer')}
            >
              Organizer
            </button>
            <button
              className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
              onClick={() => setActiveTab('tickets')}
            >
              Tickets
            </button>
          </div>

          {/* Tab Content */}
          <div className="event-tab-content">
            {/* Description Tab */}
            {activeTab === 'description' && (
              <div className="tab-panel description-panel">
                {/* Event Info List — 2 στήλες */}
                <div className="event-info-list">
                  <div className="info-list-item">
                    <span className="info-list-label">Category</span>
                    <span className="info-list-value">{categoriesText || '—'}</span>
                  </div>

                  <div className="info-list-item">
                    <span className="info-list-label">Type</span>
                    <span className="info-list-value">{event.event_type || '—'}</span>
                  </div>

                  <div className="info-list-item">
                    <span className="info-list-label">Venue</span>
                    <span className="info-list-value">{event.venue || '—'}</span>
                  </div>

                  <div className="info-list-item">
                    <span className="info-list-label">Address</span>
                    <span className="info-list-value">{event.address || '—'}</span>
                  </div>

                  <div className="info-list-item">
                    <span className="info-list-label">City</span>
                    <span className="info-list-value">{event.city || '—'}</span>
                  </div>

                  <div className="info-list-item">
                    <span className="info-list-label">Country</span>
                    <span className="info-list-value">{event.country || '—'}</span>
                  </div>

                  <div className="info-list-item">
                    <span className="info-list-label">Starts</span>
                    <span className="info-list-value">{formatDateTime(event.start_datetime)}</span>
                  </div>

                  <div className="info-list-item">
                    <span className="info-list-label">Ends</span>
                    <span className="info-list-value">{formatDateTime(event.end_datetime)}</span>
                  </div>

                  <div className="info-list-item">
                    <span className="info-list-label">Capacity</span>
                    <span className="info-list-value">{event.capacity ?? '—'}</span>
                  </div>
                </div>

                <div className="event-description-box">
                  <h3 className="event-description-title">Description</h3>
                  <div className="event-description">
                    <p>{event.description || 'No description available.'}</p>
                  </div>
                </div>

                {/* Map */}
                <div className="event-map-container">
                  <div className="map-container" ref={mapContainerRef}></div>
                  <p className="map-address">{event.address}, {event.city}, {event.country}</p>
                </div>
              </div>
            )}

            {/* Organizer Tab - ΧΩΡΙΣ STATS */}
            {activeTab === 'organizer' && (
              <div className="tab-panel organizer-panel">
                {/* Όνομα χωρίς avatar */}
                <div className="organizer-header">
                  <h3 className="organizer-name">
                    {event.organizer?.first_name} {event.organizer?.last_name}
                  </h3>
                  <p className="organizer-username">@{event.organizer?.username}</p>
                </div>

                {/* Δύο στήλες με πληροφορίες organizer */}
                <div className="organizer-details-grid">
                  <div className="organizer-detail-column">
                    <h4>Contact Information</h4>
                    <div className="organizer-detail-item">
                      <span className="detail-label">Name</span>
                      <span className="detail-value">
                        {event.organizer?.first_name} {event.organizer?.last_name}
                      </span>
                    </div>
                    <div className="organizer-detail-item">
                      <span className="detail-label">Email</span>
                      <span className="detail-value">{event.organizer?.email || '—'}</span>
                    </div>
                  </div>

                  <div className="organizer-detail-column">
                    <h4>Message</h4>
                    <p className="organizer-contact-note">
                      Attendees can message the organizer about this event after booking.
                    </p>
                    {isAuthenticated && user?.id !== event.organizer?.id && (
                      <Link
                        to={`/profile/messages/new?event=${event.id}`}
                        className="btn-message-organizer"
                      >
                        Message organizer
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tickets Tab */}
            {activeTab === 'tickets' && (
              <div className="tab-panel tickets-panel">
                <div className="tickets-list">
                  {event.ticket_types && event.ticket_types.length > 0 ? (
                    <>
                      <div className="ticket-item-single">
                        <div className="ticket-date">
                          {formatDate(event.start_datetime)}
                        </div>
                        <div className="ticket-info-single">
                          <h4>{event.title}</h4>
                          <p className="ticket-available-total">
                            {event.ticket_types.reduce((sum, t) => sum + t.available, 0)} available
                          </p>
                        </div>
                        <div className="ticket-action">
                          {canBook(event) ? (
                            <button
                              className="btn-ticket available"
                              onClick={() => openModal(null)}
                            >
                              Tickets →
                            </button>
                          ) : (
                            <button
                              className="btn-ticket disabled"
                              disabled
                              title={getBookingBlockReason(event)}
                            >
                              Not available
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Μήνυμα αιτιολόγησης όταν δεν επιτρέπεται κράτηση */}
                      {!canBook(event) && (
                        <p className="booking-block-reason">
                          {getBookingBlockReason(event)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="no-tickets">No tickets available for this event.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookTicket
        event={event}
        ticket={event.ticket_types?.find(t => t.id === selectedTicket)}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
};

export default EventDetails;