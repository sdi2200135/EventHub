// src/components/BookTicket.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import './BookTicket.css';

const BookTicket = ({ event, ticket, isOpen, onClose }) => {
  const [selectedTicket, setSelectedTicket] = useState(ticket?.id || null);
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();

  // Reset όταν κλείνει το modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedTicket(null);
      setQuantity(1);
    }
  }, [isOpen]);

  // Auto-select πρώτου διαθέσιμου ticket type
  useEffect(() => {
    if (isOpen && event?.ticket_types) {
      const available = event.ticket_types.filter(t => t.available > 0);
      if (available.length > 0 && !selectedTicket) {
        setSelectedTicket(available[0].id);
      }
    }
  }, [isOpen, event, selectedTicket]);

  if (!isOpen || !event) return null;

  const isEventBookable =
    event.status === 'PUBLISHED' &&
    (event.available_capacity ?? 0) > 0;

  if (!isEventBookable) {
    return null;
  }

  const handleBooking = () => {
    if (!isEventBookable) {
      alert('This event is no longer available for booking.');
      onClose();
      return;
    }

    console.log('🚀 Booking Data:', {
      eventId: event.id,
      ticketId: selectedTicket,
      quantity: quantity,
    });

    navigate(
      `/events/details/${event.id}/booking?ticketId=${selectedTicket}&quantity=${quantity}&seats=`
    );
    onClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const ticketTypesConfig = {
    'Regular': { color: '#4a90d9', description: 'Standard admission ticket' },
    'VIP': { color: '#9b59b6', description: 'Premium access with exclusive benefits' },
    'Premium': { color: '#f39c12', description: 'Top-tier experience with VIP lounge access' },
    'Student': { color: '#2ecc71', description: 'Discounted ticket for students (ID required)' },
    'Group': { color: '#1abc9c', description: 'Group discount for 5+ people' },
    'General Admission': { color: '#3498db', description: 'General admission to the event' },
    'Reduced': { color: '#e67e22', description: 'Reduced price ticket for eligible attendees' },
    'VVIP': { color: '#8e44ad', description: 'Ultimate VIP experience with all-access pass' }
  };

  const getTicketColor = (name) => {
    const config = Object.values(ticketTypesConfig).find(
      (config, index) => Object.keys(ticketTypesConfig)[index] === name
    );
    return config?.color || '#6c7a89';
  };

  const hexToRgb = (hex) => {
    if (!hex) return '108, 122, 137';
    const h = hex.replace('#', '');
    return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
  };

  const getTotalCost = () => {
    if (!selectedTicket) return 0;
    const t = event.ticket_types.find(x => x.id === selectedTicket);
    return t ? t.price * quantity : 0;
  };

  const selectedTicketData = event.ticket_types?.find(t => t.id === selectedTicket);
  const availableTicketTypes = event.ticket_types?.filter(t => t.available > 0) || [];
  const selectedTicketAvailable = selectedTicketData?.available || 0;

  return (
    <div className="bk-modal-overlay" onClick={onClose}>
      <div className="bk-modal-content no-seats-venue" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bk-modal-header">
          <button className="bk-modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Title */}
        <h2 className="bk-modal-title">Choose your ticket</h2>

        {/* Ticket Options */}
        <div className="bk-modal-tickets">
          <div className="bk-modal-ticket-item selected">
            <div className="bk-ticket-radio">
              <div className="bk-radio-circle checked" />
            </div>
            <div className="bk-ticket-info">
              <div className="bk-ticket-name">Tickets</div>
              <div className="bk-ticket-description">Select your ticket type and quantity</div>
              <div className="bk-ticket-price">
                {event.ticket_types && event.ticket_types.length > 0 && (
                  <>From ${Math.min(...event.ticket_types.map(t => t.price)).toFixed(2)}</>
                )}
              </div>
            </div>
            <div className="bk-ticket-availability-info">
              <span className="bk-ticket-available">
                {event.ticket_types && event.ticket_types.reduce((sum, t) => sum + t.available, 0)} available
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Type Selector */}
        {availableTicketTypes.length > 0 && (
          <div className="bk-ticket-type-selector">
            <label className="bk-ticket-type-label">Select ticket type:</label>
            <div className="bk-ticket-type-options">
              {availableTicketTypes.map((t) => (
                <button
                  key={t.id}
                  className={`bk-ticket-type-btn ${selectedTicket === t.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedTicket(t.id);
                    // Clamp quantity αν αλλάξει σε ticket type με λιγότερα διαθέσιμα
                    setQuantity(prev => Math.min(prev, t.available) || 1);
                  }}
                  style={{
                    borderColor: selectedTicket === t.id ? getTicketColor(t.name) : '#2A2A2A',
                    background: selectedTicket === t.id
                      ? `rgba(${hexToRgb(getTicketColor(t.name))}, 0.1)`
                      : 'transparent'
                  }}
                >
                  <span className="bk-ticket-type-name">{t.name}</span>
                  <span className="bk-ticket-type-price">${t.price.toFixed(2)}</span>
                  <span className="bk-ticket-type-available">{t.available} left</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity Selector */}
        {selectedTicket && (
          <div className="bk-modal-quantity">
            <label className="bk-quantity-label">Quantity:</label>
            <div className="bk-quantity-controls">
              <button
                className="bk-quantity-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                -
              </button>
              <span className="bk-quantity-value">{quantity}</span>
              <button
                className="bk-quantity-btn"
                onClick={() => {
                  if (quantity < selectedTicketAvailable) {
                    setQuantity(quantity + 1);
                  }
                }}
                disabled={quantity >= selectedTicketAvailable}
              >
                +
              </button>
            </div>
            <span className="bk-quantity-max">
              Max: {selectedTicketAvailable}
            </span>
          </div>
        )}

        {/* Total */}
        {selectedTicket && (
          <div className="bk-modal-total">
            <div className="bk-total-row">
              <span className="bk-total-label">Total:</span>
              <span className="bk-total-amount">
                ${getTotalCost().toFixed(2)} ({selectedTicketData?.price.toFixed(2)} per person)
              </span>
            </div>
          </div>
        )}

        {/* Where & When */}
        <div className="bk-modal-event-info">
          <div className="bk-info-row">
            <span className="bk-info-label">Where →</span>
            <span className="bk-info-value">{event.venue}, {event.city}</span>
          </div>
          <div className="bk-info-row">
            <span className="bk-info-label">When →</span>
            <span className="bk-info-value">{formatDate(event.start_datetime)}</span>
          </div>
        </div>

        {/* Book Button */}
        <button
          className="bk-modal-book-btn"
          onClick={handleBooking}
          disabled={!selectedTicket || quantity < 1 || !isEventBookable}
          title={!isEventBookable ? 'This event is no longer available for booking' : ''}
        >
          Payment
          <ArrowRightAltIcon className="bk-arrow-icon" />
        </button>
      </div>
    </div>
  );
};

export default BookTicket;