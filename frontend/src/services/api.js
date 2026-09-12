// src/services/api.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// Mock data
import {
  mockEvents,
  mockCategories,
  mockUsers,
  mockCurrentUser,
  mockBookings,
  mockVenues,
  mockMessages
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
      const user = mockUsers.find(
        u => u.username === credentials.username && u.password === credentials.password
      );
      if (!user) {
        throw new Error('Invalid username or password');
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
    try {
      const response = await axios.post(`${API_BASE}/auth/login/`, credentials);
      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password');
      }
      throw error;
    }
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
  },

  updateProfile: async (data) => {
    if (USE_MOCK) {
      await delay();
      Object.assign(mockCurrentUser, data);
      const userIndex = mockUsers.findIndex(u => u.id === mockCurrentUser.id);
      if (userIndex !== -1) {
        Object.assign(mockUsers[userIndex], data);
      }
      return { data: mockCurrentUser };
    }
    const response = await axios.patch(`${API_BASE}/auth/me/`, data, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  updateLastLogin: async () => {
    if (USE_MOCK) {
      await delay(100);
      if (mockCurrentUser) {
        mockCurrentUser.last_login = new Date().toISOString();
      }
      return { data: { success: true } };
    }
    const response = await axios.post(
      `${API_BASE}/auth/update_last_login/`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      }
    );
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

  getAvailableSeats: async (eventId, ticketTypeId) => {
    if (USE_MOCK) {
      await delay();
      const event = mockEvents.find(e => e.id === Number(eventId));
      if (!event) return { data: { available_seats: [] } };
      
      const primaryCategory = event.categories?.[0] || '';
      const venue = mockVenues[primaryCategory];
      if (!venue || !venue.seats) return { data: { available_seats: [] } };
      
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
// BOOKING SERVICES
// ============================================
export const bookingService = {
  createBooking: async (data) => {
    if (USE_MOCK) {
      await delay();
      console.log('Mock booking created:', data);
      
      const event = mockEvents.find(e => e.id === Number(data.event));
      let ticketType = null;
      
      if (event) {
        event.available_capacity = Math.max(0, event.available_capacity - data.quantity);
        
        if (event.ticket_types) {
          ticketType = event.ticket_types.find(t => t.id === Number(data.ticket_type));
          if (ticketType) {
            ticketType.available = Math.max(0, ticketType.available - data.quantity);
          }
        }
        
        const newBooking = {
          id: mockBookings.length + 1,
          user_id: 3,
          event_id: data.event,
          ticket_type_id: data.ticket_type,
          quantity: data.quantity,
          seats: data.seats || '',
          status: 'CONFIRMED',
          booking_date: new Date().toISOString(),
          total_price: ticketType?.price * data.quantity || 0,
          event_title: event.title,
          event_date: event.start_datetime,
          venue: event.venue,
          city: event.city
        };
        mockBookings.push(newBooking);
        event.bookings.push(newBooking);
      }
      
      return { 
        data: { 
          message: 'Booking confirmed!', 
          booking_id: mockBookings.length 
        } 
      };
    }
    const response = await axios.post(`${API_BASE}/bookings/`, data, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  getMyBookings: async () => {
    if (USE_MOCK) {
      await delay();
      const userBookings = mockBookings.filter(b => b.user_id === 3);
      return { data: userBookings };
    }
    const response = await axios.get(`${API_BASE}/bookings/me/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  // ← ΝΕΟ: Λήψη μίας κράτησης
  getBooking: async (bookingId) => {
    if (USE_MOCK) {
      await delay();
      const booking = mockBookings.find(b => b.id === Number(bookingId));
      if (!booking) throw new Error('Booking not found');
      return { data: booking };
    }
    const response = await axios.get(`${API_BASE}/bookings/${bookingId}/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  cancelBooking: async (bookingId) => {
    if (USE_MOCK) {
      await delay();
      const booking = mockBookings.find(b => b.id === Number(bookingId));
      if (booking) {
        booking.status = 'CANCELLED';
        const event = mockEvents.find(e => e.id === booking.event_id);
        if (event) {
          event.available_capacity += booking.quantity;
          if (event.ticket_types) {
            const ticketType = event.ticket_types.find(t => t.id === booking.ticket_type_id);
            if (ticketType) {
              ticketType.available += booking.quantity;
            }
          }
        }
      }
      return { data: { message: 'Booking cancelled successfully' } };
    }
    const response = await axios.delete(`${API_BASE}/bookings/${bookingId}/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  }
};

// ============================================
// MESSAGE SERVICES
// ============================================
export const messageService = {
  getMyMessages: async () => {
    if (USE_MOCK) {
      await delay();
      const userMessages = mockMessages.filter(m => m.recipient_id === 3);
      return { data: userMessages };
    }
    const response = await axios.get(`${API_BASE}/messages/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    if (response.data && response.data.results) {
      return { data: response.data.results };
    }
    return response;
  },

  getUnreadCount: async () => {
    if (USE_MOCK) {
      await delay(200);
      const unread = mockMessages.filter(m => m.recipient_id === 3 && !m.is_read);
      return { data: { count: unread.length } };
    }
    const response = await axios.get(`${API_BASE}/messages/unread_count/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  markAsRead: async (messageId) => {
    if (USE_MOCK) {
      await delay(200);
      const message = mockMessages.find(m => m.id === Number(messageId));
      if (message) message.is_read = true;
      return { data: { success: true } };
    }
    const response = await axios.patch(
      `${API_BASE}/messages/${messageId}/`,
      { is_read: true },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      }
    );
    return response;
  },

  getMessage: async (messageId) => {
    if (USE_MOCK) {
      await delay();
      const message = mockMessages.find(m => m.id === Number(messageId));
      if (!message) {
        throw new Error('Message not found');
      }
      return { data: message };
    }
    const response = await axios.get(`${API_BASE}/messages/${messageId}/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  deleteMessage: async (messageId) => {
    if (USE_MOCK) {
      await delay();
      const index = mockMessages.findIndex(m => m.id === Number(messageId));
      if (index !== -1) {
        mockMessages.splice(index, 1);
      }
      return { data: { success: true } };
    }
    const response = await axios.delete(`${API_BASE}/messages/${messageId}/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  createMessage: async (data) => {
    if (USE_MOCK) {
      await delay();
      const newMessage = {
        id: mockMessages.length + 1,
        sender_id: 3,
        sender_username: 'participant',
        sender_name: 'Jane Participant',
        recipient_id: data.recipient_id || 2,
        recipient_username: data.recipient_username || data.recipient || '',
        subject: data.subject || '',
        body: data.body || '',
        is_read: false,
        created_at: new Date().toISOString(),
        attachments: []
      };
      mockMessages.push(newMessage);
      return { data: newMessage };
    }
    const response = await axios.post(`${API_BASE}/messages/`, data, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  getRecipients: async () => {
    if (USE_MOCK) {
      await delay(200);
      const recipients = mockUsers
        .filter(u => u.id !== 3)
        .map(u => ({
          id: u.id,
          username: u.username,
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username
        }));
      return { data: recipients };
    }
    const response = await axios.get(`${API_BASE}/users/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    if (response.data && response.data.results) {
      return { data: response.data.results };
    }
    return response;
  }
};