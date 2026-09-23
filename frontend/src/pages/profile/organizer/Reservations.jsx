// src/pages/profile/organizer/Reservations.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService } from '../../../services/api';
import './Reservations.css';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const Reservations = ({ user }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('day-release'); // 'day-release' | 'name' | 'reservations'

  useEffect(() => {
    if (user?.id) {
      fetchEvents();
    }
  }, [user?.id]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await eventService.getOrganizerEvents(user.id);
      const eventsList = response.data || [];

      // Για κάθε event, φέρνουμε τα bookings του (το list endpoint δεν τα περιλαμβάνει)
      const eventsWithBookings = await Promise.all(
        eventsList.map(async (event) => {
          try {
            const bookingsRes = await eventService.getEventBookings(event.id);
            const bookings = bookingsRes.data?.results || bookingsRes.data || [];
            return { ...event, bookings };
          } catch (err) {
            console.warn(`Could not load bookings for event ${event.id}:`, err);
            return { ...event, bookings: [] };
          }
        })
      );

      setEvents(eventsWithBookings);
      setError('');
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Could not load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SORTING
  // ============================================
  const sortedEvents = useMemo(() => {
    const list = [...events];

    switch (sortBy) {
      case 'name':
        return list.sort((a, b) =>
          (a.title || '').localeCompare(b.title || '')
        );

      case 'reservations':
        return list.sort((a, b) =>
          (b.bookings?.length || 0) - (a.bookings?.length || 0)
        );

      case 'day-release':
      default:
        return list.sort((a, b) =>
          new Date(b.start_datetime || 0) - new Date(a.start_datetime || 0)
        );
    }
  }, [events, sortBy]);

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return <LoadingSpinner message="Loading reservations..." />;
  }

  if (error) {
    return (
      <div className="reservations-error">
        <p>{error}</p>
        <button className="btn-retry" onClick={fetchEvents}>Try Again</button>
      </div>
    );
  }

  // ============================================
  // EMPTY STATE
  // ============================================
  if (sortedEvents.length === 0) {
    return (
      <div className="reservations-empty">
        <p>No events found.</p>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="reservations-container">
      {/* Sort Bar */}
      <div className="reservations-sort-bar">
        <span className="sort-label">Sort by :</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="day-release">Day Release</option>
          <option value="name">Name</option>
          <option value="reservations">Reservations</option>
        </select>
      </div>

      {/* Events List */}
      <div className="reservations-list">
        {sortedEvents.map(event => {
          const reservationsCount =
            event.bookings?.filter(b => b.status !== 'CANCELLED').length || 0;

          return (
            <div
              key={event.id}
              className="reservation-item"
              onClick={() => navigate(`/profile/reservations/${event.id}`)}
            >
              <span className="reservation-event-title">
                {event.title}
              </span>
              <span className="reservation-count">
                Reservations: {reservationsCount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Reservations;