// src/components/BookTicket.jsx 
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import { mockVenues } from '../services/MockData';
import './BookTicket.css';

const BookTicket = ({ event, ticket, isOpen, onClose }) => {
  const [selectedTicket, setSelectedTicket] = useState(ticket?.id || null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedBox, setSelectedBox] = useState(null);
  const [boxQuantity, setBoxQuantity] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setSelectedTicket(null);
      setQuantity(1);
      setSelectedSeats([]);
      setSelectedBox(null);
      setBoxQuantity(1);
    }
  }, [isOpen]);

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

  const getVenueForEvent = () => {
    if (!event || !event.categories || event.categories.length === 0) return null;
    const primaryCategory = event.categories[0];

    if (primaryCategory === 'Music' || primaryCategory === 'Stand Up Comedy') {
      return null;
    }

    const venue = mockVenues[primaryCategory];
    if (!venue) return null;

    return JSON.parse(JSON.stringify(venue));
  };

  const venue = getVenueForEvent();
  const venueType = venue?.type || null;

  const hasSeats = venueType === 'stage' || venueType === 'boxes';
  const isBoxes = venueType === 'boxes';
  const isStage = venueType === 'stage';

  const getModalWidthClass = () => {
    if (!venue) return 'no-seats-venue';
    if (venueType === 'stage') return 'stage-venue';
    if (venueType === 'boxes') return 'boxes-venue';
    return 'no-seats-venue';
  };

  const handleBooking = () => {
    if (!isEventBookable) {
      alert('This event is no longer available for booking.');
      onClose();
      return;
    }
    let seatsParam = '';
    let finalQuantity = quantity;

    if (isBoxes && selectedBox) {
      seatsParam = `${selectedBox}:${boxQuantity}`;
      finalQuantity = boxQuantity;
    } else if (isStage && selectedSeats.length > 0) {
      seatsParam = selectedSeats.join(',');
      finalQuantity = selectedSeats.length;
    }

    console.log('🚀 Booking Data:', {
      eventId: event.id,
      ticketId: selectedTicket,
      quantity: finalQuantity,
      seats: seatsParam,
      venueType: venueType,
      isBoxes: isBoxes,
      isStage: isStage,
      hasSeats: hasSeats
    });

    navigate(`/events/details/${event.id}/booking?ticketId=${selectedTicket}&quantity=${finalQuantity}&seats=${seatsParam}`);
    onClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
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

  const getTicketDescription = (name) => {
    const config = Object.values(ticketTypesConfig).find(
      (config, index) => Object.keys(ticketTypesConfig)[index] === name
    );
    return config?.description || 'Standard ticket';
  };

  const getAllSeats = () => {
    if (!venue || !venue.seats) return {};
    return venue.seats;
  };

  const allSeats = getAllSeats();

  const getSelectableSeats = () => {
    if (!allSeats || Object.keys(allSeats).length === 0) return {};
    const selectedTicketType = event.ticket_types?.find(t => t.id === selectedTicket);
    const ticketName = selectedTicketType?.name || null;

    if (!ticketName) {
      const all = {};
      Object.keys(allSeats).forEach(key => {
        all[key] = { ...allSeats[key], isSelectable: false };
      });
      return all;
    }

    const result = {};
    Object.keys(allSeats).forEach(key => {
      const seat = allSeats[key];
      result[key] = {
        ...seat,
        isSelectable: seat.ticketType === ticketName && seat.available
      };
    });
    return result;
  };

  const displaySeats = getSelectableSeats();

  const getAllBoxes = () => {
    if (!venue || !venue.boxes) return {};
    return venue.boxes;
  };

  const allBoxes = getAllBoxes();

  const getSelectableBoxes = () => {
    if (!allBoxes || Object.keys(allBoxes).length === 0) return {};
    const selectedTicketType = event.ticket_types?.find(t => t.id === selectedTicket);
    const ticketName = selectedTicketType?.name || null;

    if (!ticketName) {
      const all = {};
      Object.keys(allBoxes).forEach(key => {
        all[key] = { ...allBoxes[key], isSelectable: false };
      });
      return all;
    }

    const result = {};
    Object.keys(allBoxes).forEach(key => {
      const box = allBoxes[key];
      result[key] = {
        ...box,
        isSelectable: box.ticketType === ticketName && box.available > 0
      };
    });
    return result;
  };

  const displayBoxes = getSelectableBoxes();

  const getBoxesForEvent = () => {
    if (Object.keys(displayBoxes).length === 0) return {};

    const boxes = {};
    Object.keys(displayBoxes).forEach(key => {
      const box = displayBoxes[key];
      let available = box.available;
      if (event.id === 4) {
        available = box.available;
      } else if (event.id === 5) {
        if (key === 'Gate 1') available = 3;
        else if (key === 'Gate 2') available = 2;
        else if (key === 'Gate 4') available = 4;
        else if (key === 'Gate 6') available = 5;
        else available = box.available;
      }
      boxes[key] = {
        ...box,
        available: Math.max(0, available),
        isSelectable: box.isSelectable && Math.max(0, available) > 0
      };
    });
    return boxes;
  };

  const eventBoxes = getBoxesForEvent();
  const boxKeys = Object.keys(eventBoxes);

  const getOrderedBoxKeys = () => {
    if (boxKeys.length === 0) return [];
    const order = ['Gate 1', 'Gate 2', 'Gate 3', 'Gate 4', 'Gate 5', 'Gate 6', 'Gate 7', 'Gate 8'];
    return order.filter(key => eventBoxes[key]);
  };

  const orderedBoxKeys = getOrderedBoxKeys();

  const toggleSeat = (seatKey) => {
    if (!displaySeats || Object.keys(displaySeats).length === 0) return;
    const seat = displaySeats[seatKey];
    if (!seat || !seat.isSelectable) return;

    setSelectedSeats(prev =>
      prev.includes(seatKey)
        ? prev.filter(s => s !== seatKey)
        : [...prev, seatKey]
    );
  };

  const handleBoxSelect = (boxName) => {
    const box = eventBoxes[boxName];
    if (!box || !box.isSelectable) return;

    if (selectedBox === boxName) {
      setSelectedBox(null);
      setBoxQuantity(1);
    } else {
      setSelectedBox(boxName);
      setBoxQuantity(1);
    }
  };

  const getBoxCapacity = (boxName) => {
    if (!eventBoxes[boxName]) return 0;
    return eventBoxes[boxName].available;
  };

  const getTotalCost = () => {
    if (!selectedTicket) return 0;
    const ticket = event.ticket_types.find(t => t.id === selectedTicket);
    let totalQuantity = quantity;

    if (isBoxes && selectedBox) {
      totalQuantity = boxQuantity;
    } else if (isStage) {
      totalQuantity = selectedSeats.length || 1;
    }

    return ticket ? ticket.price * totalQuantity : 0;
  };

  const selectedTicketData = event.ticket_types?.find(t => t.id === selectedTicket);

  const getSeatsByRow = () => {
    if (!displaySeats || Object.keys(displaySeats).length === 0) return {};
    const rows = {};
    Object.keys(displaySeats).forEach(key => {
      const seat = displaySeats[key];
      if (!rows[seat.row]) rows[seat.row] = [];
      rows[seat.row].push({ key, ...seat });
    });
    return rows;
  };

  const seatsByRow = getSeatsByRow();
  const rowLabels = Object.keys(seatsByRow).sort();

  const isSelectionComplete = () => {
    if (!hasSeats) return true;
    if (isBoxes) {
      return selectedBox !== null && boxQuantity > 0;
    }
    if (isStage) {
      return selectedSeats.length > 0;
    }
    return selectedSeats.length === quantity;
  };

  const availableTicketTypes = event.ticket_types?.filter(t => t.available > 0) || [];

  return (
    <div className="bk-modal-overlay" onClick={onClose}>
      <div className={`bk-modal-content ${getModalWidthClass()}`} onClick={(e) => e.stopPropagation()}>
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
              <div className="bk-ticket-description">Select your ticket type and seat</div>
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
                  onClick={() => setSelectedTicket(t.id)}
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
        {selectedTicket && !hasSeats && (
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
                  const ticket = event.ticket_types.find(t => t.id === selectedTicket);
                  if (ticket && quantity < ticket.available) {
                    setQuantity(quantity + 1);
                  }
                }}
                disabled={
                  !selectedTicket ||
                  quantity >= (event.ticket_types.find(t => t.id === selectedTicket)?.available || 0)
                }
              >
                +
              </button>
            </div>
            <span className="bk-quantity-max">
              Max: {event.ticket_types.find(t => t.id === selectedTicket)?.available || 0}
            </span>
          </div>
        )}

        {/* Seat Selection - Stage Venues */}
        {selectedTicket && isStage && venue && Object.keys(displaySeats).length > 0 && (
          <div className="bk-modal-seat-selection">
            <div className="bk-seat-section">
              <label className="bk-seat-label">Venue: {venue.name}</label>
              <div className="bk-seat-map">
                <div className="bk-stage-indicator">🎭 Stage</div>

                <div className="bk-seats-grid-container">
                  {rowLabels.map((row) => (
                    <div key={row} className="bk-seat-row">
                      <span className="bk-row-label">{row}</span>
                      <div className="bk-seat-row-seats">
                        {seatsByRow[row].map((seat) => {
                          const isSelected = selectedSeats.includes(seat.key);
                          const isSelectable = seat.isSelectable;
                          const isAvailable = seat.available;
                          const isDisabled = !isSelectable || !isAvailable;

                          return (
                            <button
                              key={seat.key}
                              className={`bk-seat-btn ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''} ${!isSelectable && isAvailable ? 'not-selectable' : ''}`}
                              onClick={() => toggleSeat(seat.key)}
                              disabled={isDisabled}
                              title={`${seat.row}${seat.number}${!isSelectable && isAvailable ? ' (not available for your ticket type)' : ''}`}
                            >
                              {seat.number}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bk-seats-legend">
                <span className="bk-legend-item">
                  <span className="bk-legend-box available"></span> Available
                </span>
                <span className="bk-legend-item">
                  <span className="bk-legend-box selected"></span> Selected
                </span>
                <span className="bk-legend-item">
                  <span className="bk-legend-box unavailable"></span> Unavailable
                </span>
                <span className="bk-legend-item">
                  <span className="bk-legend-box not-selectable"></span> Not available for this ticket type
                </span>
              </div>

              <div className="bk-seats-info">
                <span>Selected: {selectedSeats.length} seats</span>
                <span className="bk-seats-hint">
                  {selectedSeats.length === 0 ? 'Select at least one seat' : `${selectedSeats.length} seats selected`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Box Selection - Sports Venues */}
        {selectedTicket && isBoxes && venue && orderedBoxKeys.length > 0 && (
          <div className="bk-modal-seat-selection">
            <div className="bk-seat-section">
              <label className="bk-seat-label">Venue: {venue.name}</label>
              <div className="bk-box-map">
                <div className={`bk-boxes-grid ${orderedBoxKeys.length === 8 ? 'has-8' : ''}`}>
                  <div className="bk-field-indicator">🏟️ Field</div>

                  {orderedBoxKeys.map((boxName) => {
                    const box = eventBoxes[boxName];
                    const isSelected = selectedBox === boxName;
                    const isSelectable = box.isSelectable;
                    const isAvailable = box.available > 0;
                    const capacity = getBoxCapacity(boxName);

                    return (
                      <div
                        key={boxName}
                        className={`bk-box-item ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''} ${!isSelectable && isAvailable ? 'not-selectable' : ''}`}
                        onClick={() => isSelectable && handleBoxSelect(boxName)}
                      >
                        <div className="bk-box-name">{box.label}</div>
                        <div className="bk-box-capacity">Capacity: {box.capacity}</div>
                        <div className="bk-box-available">Available: {box.available}</div>
                        {isSelected && isSelectable && (
                          <div className="bk-box-quantity-selector">
                            <button
                              className="bk-box-qty-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBoxQuantity(Math.max(1, boxQuantity - 1));
                              }}
                              disabled={boxQuantity <= 1}
                            >
                              -
                            </button>
                            <span className="bk-box-qty-value">{boxQuantity}</span>
                            <button
                              className="bk-box-qty-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (boxQuantity < capacity) {
                                  setBoxQuantity(boxQuantity + 1);
                                }
                              }}
                              disabled={boxQuantity >= capacity}
                            >
                              +
                            </button>
                            <span className="bk-box-qty-max">max: {capacity}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bk-seats-legend">
                <span className="bk-legend-item">
                  <span className="bk-legend-box available"></span> Available
                </span>
                <span className="bk-legend-item">
                  <span className="bk-legend-box selected"></span> Selected
                </span>
                <span className="bk-legend-item">
                  <span className="bk-legend-box unavailable"></span> Unavailable
                </span>
                <span className="bk-legend-item">
                  <span className="bk-legend-box not-selectable"></span> Not available for this ticket type
                </span>
              </div>

              {selectedBox && (
                <div className="bk-seats-info">
                  <span>Selected: {boxQuantity} / {getBoxCapacity(selectedBox)} tickets in {selectedBox}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Total */}
        {selectedTicket && (
          <div className="bk-modal-total">
            <div className="bk-total-row">
              <span className="bk-total-label">Total:</span>
              <span className="bk-total-amount">
                ${(getTotalCost()).toFixed(2)} ({selectedTicketData?.price.toFixed(2)} per person)
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
          disabled={!selectedTicket || !isSelectionComplete() || !isEventBookable}
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