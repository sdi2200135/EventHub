// src/services/api.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// Mock data
import {
  mockEvents,
  mockCategories,
  mockUsers,
  mockCurrentUser
} from './MockData';

const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// AUTH SERVICES
// ============================================
export const authService = {
  register: async (data) => {
    if (USE_MOCK) {
      await delay();
      const newUser = {
        id: mockUsers.length + 1,
        ...data,
        approval_status: 'PENDING'
      };
      mockUsers.push(newUser);
      return { data: newUser };
    }
    try {
      const response = await axios.post(`${API_BASE}/auth/register/`, data);
      return response;
    } catch (error) {
      console.error('Register API error:', error.response?.data);
      throw error;
    }
  },

  login: async (credentials) => {
    if (USE_MOCK) {
      await delay();
      const user = mockUsers.find(u => u.username === credentials.username);
      if (!user) {
        throw new Error('Invalid credentials');
      }
      if (user.approval_status === 'PENDING') {
        throw new Error('Your account is pending administrator approval.');
      }
      if (user.approval_status === 'REJECTED') {
        throw new Error('Your account registration was rejected.');
      }
      return {
        data: {
          access: 'mock_access_token',
          refresh: 'mock_refresh_token',
          user: user
        }
      };
    }
    const response = await axios.post(`${API_BASE}/auth/login/`, credentials);
    return response;
  },

  getProfile: async () => {
    if (USE_MOCK) {
      await delay();
      return { data: mockCurrentUser };
    }
    const response = await axios.get(`${API_BASE}/auth/me/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  }
};

// ============================================
// EVENT SERVICES
// ============================================
export const eventService = {
  getEvents: async () => {
    if (USE_MOCK) {
      await delay();
      return { data: mockEvents };
    }
    const response = await axios.get(`${API_BASE}/events/`);
    if (response.data && response.data.results) {
      return { data: response.data.results };
    }
    return response;
  },

  getEvent: async (id) => {
    if (USE_MOCK) {
      await delay();
      const event = mockEvents.find(e => e.id === Number(id) || e.event_id === id);
      if (!event) {
        throw new Error('Event not found');
      }
      return { data: event };
    }
    const response = await axios.get(`${API_BASE}/events/${id}/`);
    return response;
  },

  // ΠΡΟΣΘΗΚΗ: Λήψη διαθέσιμων θέσεων
  getAvailableSeats: async (eventId, ticketTypeId) => {
    if (USE_MOCK) {
      await delay();
      // Mock: Επιστρέφουμε όλες τις θέσεις από το venue
      const event = mockEvents.find(e => e.id === Number(eventId));
      if (!event) return { data: { available_seats: [] } };
      
      // Βρίσκουμε το venue
      const primaryCategory = event.categories?.[0] || '';
      const venue = mockVenues[primaryCategory];
      if (!venue || !venue.seats) return { data: { available_seats: [] } };
      
      // Μετατροπή των θέσεων σε array
      const seats = Object.keys(venue.seats).map(key => ({
        id: key,
        row: venue.seats[key].row,
        number: venue.seats[key].number,
        ticketType: venue.seats[key].ticketType,
        available: venue.seats[key].available
      }));
      
      return { data: { available_seats: seats } };
    }
    const response = await axios.get(
      `${API_BASE}/events/${eventId}/available_seats/?ticket_type=${ticketTypeId}`
    );
    return response;
  }
};

// ============================================
// CATEGORY SERVICES
// ============================================
export const categoryService = {
  getCategories: async () => {
    if (USE_MOCK) {
      await delay();
      return { data: mockCategories };
    }
    const response = await axios.get(`${API_BASE}/categories/`);
    if (response.data && response.data.results) {
      return { data: response.data.results };
    }
    return response;
  }
};

// ============================================
// BOOKING SERVICES - ΠΡΟΣΘΗΚΗ
// ============================================
export const bookingService = {
  createBooking: async (data) => {
    if (USE_MOCK) {
      await delay();
      console.log('Mock booking created:', data);
      // Mock: Μειώνουμε τα διαθέσιμα εισιτήρια στο mock event
      const event = mockEvents.find(e => e.id === Number(data.event));
      if (event) {
        event.available_capacity = Math.max(0, event.available_capacity - data.quantity);
        // Μείωση και στα ticket types
        if (event.ticket_types) {
          const ticketType = event.ticket_types.find(t => t.id === Number(data.ticket_type));
          if (ticketType) {
            ticketType.available = Math.max(0, ticketType.available - data.quantity);
          }
        }
      }
      return { 
        data: { 
          message: 'Booking confirmed!', 
          booking_id: Math.floor(Math.random() * 1000) 
        } 
      };
    }
    const response = await axios.post(`${API_BASE}/bookings/`, data, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  }
};