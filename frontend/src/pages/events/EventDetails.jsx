// src/pages/EventDetails.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { eventService } from '../../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import './EventDetails.css';
import BookTicket from '../../components/BookTicket';

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
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

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

  const getAvailabilityLabel = (status) => {
    switch(status) {
      case 'available': return 'Available';
      case 'limited': return 'Limited';
      case 'unavailable': return 'Not available';
      default: return 'Available';
    }
  };

  // Έλεγχος αν το event είναι αθλητικό
  const isSportsEvent = () => {
    return event?.categories?.some(cat => 
      ['Sports', 'Basketball Game', 'Football Game', 'Basketball', 'Football'].includes(cat)
    );
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

  if (loading) {
    return (
      <div className="event-details-loading">
        <AutorenewIcon className="loading-icon-spin" />
        <p>Loading event...</p>
      </div>
    );
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

  return (
    <div className="event-details-page">
      <div className="event-details-container">
        {/* ΑΡΙΣΤΕΡΗ ΣΤΗΛΗ: Εικόνα + When + Where */}
        <div className="event-left-column">
          <div className="event-image-wrapper">
            {event.photos && event.photos.length > 0 ? (
              <img src={event.photos[0].image} alt={event.title} />
            ) : (
              <div className="event-image-placeholder">🎉</div>
            )}
          </div>
          
          <div className="event-meta-info">
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
          <h1 className="event-title">{event.title}</h1>

          {/* Tabs */}
          <div className="event-tabs">
            <button 
              className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              Description
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
                <div className="event-description">
                  <p>{event.description || 'No description available.'}</p>
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
                <div className="organizer-info">
                  <div className="organizer-avatar">
                    {event.organizer?.first_name?.charAt(0) || 'O'}
                  </div>
                  <div className="organizer-details">
                    <h3>{event.organizer?.first_name} {event.organizer?.last_name}</h3>
                    <p className="organizer-username">@{event.organizer?.username}</p>
                    <p className="organizer-bio">Event Organizer</p>
                  </div>
                </div>

                {/* Δύο στήλες με πληροφορίες organizer */}
                <div className="organizer-details-grid">
                  {/* Στήλη 1: Email, Phone, Tax Registration Number */}
                  <div className="organizer-detail-column">
                    <h4>Contact Information</h4>
                    <div className="organizer-detail-item">
                      <span className="detail-label">Email</span>
                      <span className="detail-value">{event.organizer?.email || 'N/A'}</span>
                    </div>
                    <div className="organizer-detail-item">
                      <span className="detail-label">Phone</span>
                      <span className="detail-value">{event.organizer?.phone || 'N/A'}</span>
                    </div>
                    <div className="organizer-detail-item">
                      <span className="detail-label">Tax Registration Number</span>
                      <span className="detail-value">{event.organizer?.afm || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Στήλη 2: Location, Address */}
                  <div className="organizer-detail-column">
                    <h4>Location Details</h4>
                    <div className="organizer-detail-item">
                      <span className="detail-label">Location</span>
                      <span className="detail-value">{event.organizer?.city || event.organizer?.location || 'N/A'}</span>
                    </div>
                    <div className="organizer-detail-item">
                      <span className="detail-label">Address</span>
                      <span className="detail-value">{event.organizer?.address || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tickets Tab */}
            {activeTab === 'tickets' && (
              <div className="tab-panel tickets-panel">
                <div className="tickets-list">
                  {event.ticket_types && event.ticket_types.length > 0 ? (
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
                        {event.ticket_types.some(t => t.available > 0) && (
                          <button 
                            className="btn-ticket available"
                            onClick={() => openModal(null)}
                          >
                            Tickets →
                          </button>
                        )}
                      </div>
                    </div>
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