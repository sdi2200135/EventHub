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

  // Reset όλων των επιλογών όταν κλείνει το modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedTicket(null);
      setQuantity(1);
      setSelectedSeats([]);
      setSelectedBox(null);
      setBoxQuantity(1);
    }
  }, [isOpen]);

  // Όταν ανοίγει το modal, επιλέγουμε το πρώτο διαθέσιμο ticket type
  useEffect(() => {
    if (isOpen && event?.ticket_types) {
      const available = event.ticket_types.filter(t => t.available > 0);
      if (available.length > 0 && !selectedTicket) {
        setSelectedTicket(available[0].id);
      }
    }
  }, [isOpen, event, selectedTicket]);

  if (!isOpen || !event) return null;

  // ============================================
  // ΕΥΡΕΣΗ VENUE
  // ============================================
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

  // Έλεγχος αν η κατηγορία έχει θέσεις (stage/boxes)
  const hasSeats = venueType === 'stage' || venueType === 'boxes';
  
  // Έλεγχος αν είναι boxes (sports)
  const isBoxes = venueType === 'boxes';
  
  // Έλεγχος αν είναι stage (Theater/Cinema)
  const isStage = venueType === 'stage';

  // Υπολογισμός δυναμικού width για το modal
  const getModalWidthClass = () => {
    if (!venue) return 'no-seats-venue';
    if (venueType === 'stage') return 'stage-venue';
    if (venueType === 'boxes') return 'boxes-venue';
    return 'no-seats-venue';
  };

  // ============================================
  // HANDLE BOOKING - ΔΙΟΡΘΩΣΗ
  // ============================================
  const handleBooking = () => {
    let seatsParam = '';
    let finalQuantity = quantity; // Default: από το state quantity (για Music/Stand Up)
    
    if (isBoxes && selectedBox) {
      // SPORTS: Box selection - χρησιμοποιούμε το boxQuantity
      seatsParam = `${selectedBox}:${boxQuantity}`;
      finalQuantity = boxQuantity;
    } else if (isStage && selectedSeats.length > 0) {
      // THEATER/CINEMA: Seat selection - χρησιμοποιούμε τον αριθμό των θέσεων
      seatsParam = selectedSeats.join(',');
      finalQuantity = selectedSeats.length; // ← Ο αριθμός των επιλεγμένων θέσεων
    }
    // Music/Stand Up: παραμένει το quantity από το state
    
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

  // Λίστα με όλους τους πιθανούς τύπους εισιτηρίων
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

  const getTicketDescription = (name) => {
    const config = Object.values(ticketTypesConfig).find(
      (config, index) => Object.keys(ticketTypesConfig)[index] === name
    );
    return config?.description || 'Standard ticket';
  };

  // ============================================
  // ΠΑΙΡΝΟΥΜΕ ΟΛΕΣ ΤΙΣ ΘΕΣΕΙΣ ΑΠΟ ΤΟ VENUE
  // ============================================
  const getAllSeats = () => {
    if (!venue || !venue.seats) return {};
    return venue.seats;
  };

  const allSeats = getAllSeats();

  // ============================================
  // ΦΙΛΤΡΑΡΙΣΜΑ ΓΙΑ ΤΟ ΠΟΙΕΣ ΘΕΣΕΙΣ ΕΙΝΑΙ ΕΠΙΛΕΞΙΜΕΣ
  // ============================================
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

  // ============================================
  // ΦΙΛΤΡΑΡΙΣΜΑ BOXES
  // ============================================
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

  // ============================================
  // ΔΗΜΙΟΥΡΓΙΑ BOXES ΓΙΑ ΤΟ EVENT
  // ============================================
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

  // ============================================
  // ΠΡΟΣΔΙΟΡΙΣΜΟΣ ΣΩΣΤΗΣ ΣΕΙΡΑΣ ΓΙΑ ΤΑ BOXES
  // ============================================
  const getOrderedBoxKeys = () => {
    if (boxKeys.length === 0) return [];
    const order = ['Gate 1', 'Gate 2', 'Gate 3', 'Gate 4', 'Gate 5', 'Gate 6', 'Gate 7', 'Gate 8'];
    return order.filter(key => eventBoxes[key]);
  };

  const orderedBoxKeys = getOrderedBoxKeys();

  // ============================================
  // ΧΕΙΡΙΣΜΟΣ ΕΠΙΛΟΓΗΣ ΘΕΣΗΣ - ΓΙΑ THEATRE/CINEMA
  // ============================================
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

  // ============================================
  // ΧΕΙΡΙΣΜΟΣ ΕΠΙΛΟΓΗΣ BOX - ΓΙΑ SPORTS
  // ============================================
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

  // ============================================
  // ΥΠΟΛΟΓΙΣΜΟΣ ΔΙΑΘΕΣΙΜΗΣ ΧΩΡΗΤΙΚΟΤΗΤΑΣ BOX
  // ============================================
  const getBoxCapacity = (boxName) => {
    if (!eventBoxes[boxName]) return 0;
    return eventBoxes[boxName].available;
  };

  // ============================================
  // ΥΠΟΛΟΓΙΣΜΟΣ ΣΥΝΟΛΙΚΟΥ ΚΟΣΤΟΥΣ
  // ============================================
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

  // ============================================
  // ΟΜΑΔΟΠΟΙΗΣΗ ΘΕΣΕΩΝ ΑΝΑ ΣΕΙΡΑ
  // ============================================
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

  // ============================================
  // ΕΛΕΓΧΟΣ ΟΛΟΚΛΗΡΩΣΗΣ ΕΠΙΛΟΓΩΝ
  // ============================================
  const isSelectionComplete = () => {
    if (!hasSeats) return true;
    if (isBoxes) {
      return selectedBox !== null && boxQuantity > 0;
    }
    if (isStage) {
      // Για Theatre/Cinema: τουλάχιστον μία θέση επιλεγμένη
      return selectedSeats.length > 0;
    }
    return selectedSeats.length === quantity;
  };

  // ============================================
  // ΔΙΑΘΕΣΙΜΟΙ ΤΥΠΟΙ ΕΙΣΙΤΗΡΙΩΝ
  // ============================================
  const availableTicketTypes = event.ticket_types?.filter(t => t.available > 0) || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${getModalWidthClass()}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Title */}
        <h2 className="modal-title">Choose your ticket</h2>

        {/* Ticket Options - ΕΝΙΑΙΟ TICKET */}
        <div className="modal-tickets">
          <div className="modal-ticket-item selected">
            <div className="ticket-radio">
              <div className="radio-circle checked" />
            </div>
            <div className="ticket-info">
              <div className="ticket-name">Tickets</div>
              <div className="ticket-description">Select your ticket type and seat</div>
              <div className="ticket-price">
                {event.ticket_types && event.ticket_types.length > 0 && (
                  <>From ${Math.min(...event.ticket_types.map(t => t.price)).toFixed(2)}</>
                )}
              </div>
            </div>
            <div className="ticket-availability-info">
              <span className="ticket-available">
                {event.ticket_types && event.ticket_types.reduce((sum, t) => sum + t.available, 0)} available
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Type Selector - ΠΑΝΤΑ ΕΜΦΑΝΙΖΕΤΑΙ */}
        {availableTicketTypes.length > 0 && (
          <div className="ticket-type-selector">
            <label className="ticket-type-label">Select ticket type:</label>
            <div className="ticket-type-options">
              {availableTicketTypes.map((t) => (
                <button
                  key={t.id}
                  className={`ticket-type-btn ${selectedTicket === t.id ? 'active' : ''}`}
                  onClick={() => setSelectedTicket(t.id)}
                  style={{
                    borderColor: selectedTicket === t.id ? getTicketColor(t.name) : '#2A2A2A',
                    background: selectedTicket === t.id ? `rgba(${getTicketColor(t.name)}, 0.1)` : 'transparent'
                  }}
                >
                  <span className="ticket-type-name">{t.name}</span>
                  <span className="ticket-type-price">${t.price.toFixed(2)}</span>
                  <span className="ticket-type-available">{t.available} left</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity Selector - ΜΟΝΟ ΓΙΑ ΚΑΤΗΓΟΡΙΕΣ ΧΩΡΙΣ ΘΕΣΕΙΣ (Music, Stand Up Comedy) */}
        {selectedTicket && !hasSeats && (
          <div className="modal-quantity">
            <label className="quantity-label">Quantity:</label>
            <div className="quantity-controls">
              <button 
                className="quantity-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                -
              </button>
              <span className="quantity-value">{quantity}</span>
              <button 
                className="quantity-btn"
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
            <span className="quantity-max">
              Max: {event.ticket_types.find(t => t.id === selectedTicket)?.available || 0}
            </span>
          </div>
        )}

        {/* Seat Selection - Stage Venues (Theater, Cinema) - ΕΝΗΜΕΡΩΜΕΝΟ */}
        {selectedTicket && isStage && venue && Object.keys(displaySeats).length > 0 && (
          <div className="modal-seat-selection">
            <div className="seat-section">
              <label className="seat-label">Venue: {venue.name}</label>
              <div className="seat-map">
                <div className="stage-indicator">🎭 Stage</div>
                
                <div className="seats-grid-container">
                  {rowLabels.map((row) => (
                    <div key={row} className="seat-row">
                      <span className="row-label">{row}</span>
                      <div className="seat-row-seats">
                        {seatsByRow[row].map((seat) => {
                          const isSelected = selectedSeats.includes(seat.key);
                          const isSelectable = seat.isSelectable;
                          const isAvailable = seat.available;
                          // Αφαίρεση του περιορισμού quantity για Theatre/Cinema
                          const isDisabled = !isSelectable || !isAvailable;

                          return (
                            <button
                              key={seat.key}
                              className={`seat-btn ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''} ${!isSelectable && isAvailable ? 'not-selectable' : ''}`}
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

              <div className="seats-legend">
                <span className="legend-item">
                  <span className="legend-box available"></span> Available
                </span>
                <span className="legend-item">
                  <span className="legend-box selected"></span> Selected
                </span>
                <span className="legend-item">
                  <span className="legend-box unavailable"></span> Unavailable
                </span>
                <span className="legend-item">
                  <span className="legend-box not-selectable"></span> Not available for this ticket type
                </span>
              </div>

              <div className="seats-info">
                <span>Selected: {selectedSeats.length} seats</span>
                <span className="seats-hint">
                  {selectedSeats.length === 0 ? 'Select at least one seat' : `${selectedSeats.length} seats selected`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Box Selection - Sports Venues */}
        {selectedTicket && isBoxes && venue && orderedBoxKeys.length > 0 && (
          <div className="modal-seat-selection">
            <div className="seat-section">
              <label className="seat-label">Venue: {venue.name}</label>
              <div className="box-map">
                <div className={`boxes-grid ${orderedBoxKeys.length === 8 ? 'has-8' : ''}`}>
                  <div className="field-indicator">🏟️ Field</div>
                  
                  {orderedBoxKeys.map((boxName) => {
                    const box = eventBoxes[boxName];
                    const isSelected = selectedBox === boxName;
                    const isSelectable = box.isSelectable;
                    const isAvailable = box.available > 0;
                    const capacity = getBoxCapacity(boxName);

                    return (
                      <div 
                        key={boxName}
                        className={`box-item ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''} ${!isSelectable && isAvailable ? 'not-selectable' : ''}`}
                        onClick={() => isSelectable && handleBoxSelect(boxName)}
                      >
                        <div className="box-name">{box.label}</div>
                        <div className="box-capacity">Capacity: {box.capacity}</div>
                        <div className="box-available">Available: {box.available}</div>
                        {isSelected && isSelectable && (
                          <div className="box-quantity-selector">
                            <button 
                              className="box-qty-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBoxQuantity(Math.max(1, boxQuantity - 1));
                              }}
                              disabled={boxQuantity <= 1}
                            >
                              -
                            </button>
                            <span className="box-qty-value">{boxQuantity}</span>
                            <button 
                              className="box-qty-btn"
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
                            <span className="box-qty-max">max: {capacity}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="seats-legend">
                <span className="legend-item">
                  <span className="legend-box available"></span> Available
                </span>
                <span className="legend-item">
                  <span className="legend-box selected"></span> Selected
                </span>
                <span className="legend-item">
                  <span className="legend-box unavailable"></span> Unavailable
                </span>
                <span className="legend-item">
                  <span className="legend-box not-selectable"></span> Not available for this ticket type
                </span>
              </div>

              {selectedBox && (
                <div className="seats-info">
                  <span>Selected: {boxQuantity} / {getBoxCapacity(selectedBox)} tickets in {selectedBox}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Total - ΕΝΗΜΕΡΩΜΕΝΟ */}
        {selectedTicket && (
          <div className="modal-total">
            <div className="total-row">
              <span className="total-label">Total:</span>
              <span className="total-amount">
                ${(getTotalCost()).toFixed(2)} ({selectedTicketData?.price.toFixed(2)} per person)
              </span>
            </div>
          </div>
        )}

        {/* Where & When */}
        <div className="modal-event-info">
          <div className="info-row">
            <span className="info-label">Where →</span>
            <span className="info-value">{event.venue}, {event.city}</span>
          </div>
          <div className="info-row">
            <span className="info-label">When →</span>
            <span className="info-value">{formatDate(event.start_datetime)}</span>
          </div>
        </div>

        {/* Book Button */}
        <button 
          className="modal-book-btn"
          onClick={handleBooking}
          disabled={!selectedTicket || !isSelectionComplete()}
        >
          Payment
          <ArrowRightAltIcon className="arrow-icon" />
        </button>
      </div>
    </div>
  );
};

export default BookTicket;