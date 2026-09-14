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

      // ============================================
      // SYNC mockCurrentUser ΜΕ ΤΟΝ ΣΥΝΔΕΔΕΜΕΝΟ ΧΡΗΣΤΗ
      // ============================================
      // Χωρίς αυτό, το getProfile() (που καλείται στο page load
      // μέσω του AuthContext.loadUser) επιστρέφει πάντα τον
      // hardcoded participant, με αποτέλεσμα ο organizer/admin
      // να χάνει τον ρόλο του μετά από refresh ή απευθείας URL.
      Object.keys(mockCurrentUser).forEach(key => delete mockCurrentUser[key]);
      Object.assign(mockCurrentUser, user);

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
  },
    // ← ΝΕΟ: Events του συγκεκριμένου organizer
  getOrganizerEvents: async (organizerId) => {
    if (USE_MOCK) {
      await delay();
      const events = mockEvents.filter(e => e.organizer?.id === organizerId);
      return { data: events };
    }
    const response = await axios.get(`${API_BASE}/events/?organizer=${organizerId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    if (response.data && response.data.results) {
      return { data: response.data.results };
    }
    return response;
  },

  // ← ΝΕΟ: Δημιουργία event
  createEvent: async (data) => {
    if (USE_MOCK) {
      await delay();
      const newEvent = {
        id: mockEvents.length + 1,
        event_id: `EV${1000 + mockEvents.length + 1}`,
        ...data,
        status: data.status || 'DRAFT',
        available_capacity: data.capacity,
        bookings: [],
        photos: data.photos || [],
        ticket_types: (data.ticket_types || []).map((t, i) => ({
          id: mockEvents.length * 100 + i + 1,
          ticket_type_id: `T${mockEvents.length * 100 + i + 1}`,
          ...t,
          available: t.quantity
        }))
      };
      mockEvents.push(newEvent);
      return { data: newEvent };
    }
    const response = await axios.post(`${API_BASE}/events/`, data, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  // ← ΝΕΟ: Ενημέρωση event
  updateEvent: async (eventId, data) => {
    if (USE_MOCK) {
      await delay();
      const event = mockEvents.find(e => e.id === Number(eventId));
      if (!event) throw new Error('Event not found');
      Object.assign(event, data);
      return { data: event };
    }
    const response = await axios.patch(`${API_BASE}/events/${eventId}/`, data, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  // ← ΝΕΟ: Διαγραφή event (μόνο DRAFT ή χωρίς bookings)
  deleteEvent: async (eventId) => {
    if (USE_MOCK) {
      await delay();
      const index = mockEvents.findIndex(e => e.id === Number(eventId));
      if (index === -1) throw new Error('Event not found');
      const event = mockEvents[index];
      if (event.status === 'PUBLISHED' && event.bookings?.length > 0) {
        throw new Error('Cannot delete a published event with bookings');
      }
      mockEvents.splice(index, 1);
      return { data: { success: true } };
    }
    const response = await axios.delete(`${API_BASE}/events/${eventId}/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  // ← ΝΕΟ: Αλλαγή status (publish / cancel / complete)
  updateEventStatus: async (eventId, status) => {
    if (USE_MOCK) {
      await delay();
      const event = mockEvents.find(e => e.id === Number(eventId));
      if (!event) throw new Error('Event not found');
      event.status = status;
      return { data: event };
    }
    const response = await axios.patch(
      `${API_BASE}/events/${eventId}/`,
      { status },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      }
    );
    return response;
  },
    // ← ΝΕΟ: Ακύρωση event (status → CANCELLED)
  cancelEvent: async (eventId, notify = false, notifySubject = '', notifyBody = '') => {
    if (USE_MOCK) {
      await delay();
      const event = mockEvents.find(e => e.id === Number(eventId));
      if (!event) throw new Error('Event not found');
      event.status = 'CANCELLED';

      // Bulk notification προς attendees
      if (notify && event.bookings?.length > 0) {
        const attendees = event.bookings
          .filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING')
          .map(b => b.user_id);
        const uniqueAttendees = [...new Set(attendees)];

        uniqueAttendees.forEach((userId, idx) => {
          mockMessages.push({
            id: mockMessages.length + 1 + idx,
            sender_id: event.organizer?.id || 2,
            sender_username: event.organizer?.username || 'organizer',
            sender_name: `${event.organizer?.first_name || ''} ${event.organizer?.last_name || ''}`.trim() || 'Organizer',
            recipient_id: userId,
            recipient_username: '',
            subject: notifySubject || `Event Cancelled: ${event.title}`,
            body: notifyBody || `We regret to inform you that the event "${event.title}" has been cancelled.`,
            is_read: false,
            is_draft: false,
            is_trash: false,
            created_at: new Date().toISOString(),
            attachments: []
          });
        });
      }

      return { data: event };
    }
    const response = await axios.patch(
      `${API_BASE}/events/${eventId}/`,
      { status: 'CANCELLED' },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      }
    );
    return response;
  },

    // ← ΕΜΠΛΟΥΤΙΣΜΕΝΟ: Επιστρέφει enriched bookings με ticket type + user info + total_price
  getEventBookings: async (eventId) => {
    if (USE_MOCK) {
      await delay();
      const event = mockEvents.find(e => e.id === Number(eventId));
      if (!event) return { data: [] };

      const enriched = (event.bookings || []).map((b, idx) => {
        // ---- Ticket Type ----
        let ticketTypeId = 'T1';
        let ticketTypeName = 'Regular';
        let ticketPrice = 0;

        if (event.ticket_types && event.ticket_types.length > 0) {
          // Αν το booking έχει ticket_type_id, ψάξε το σωστό
          let tt = null;
          if (b.ticket_type_id) {
            tt = event.ticket_types.find(
              t => t.id === b.ticket_type_id || t.ticket_type_id === b.ticket_type_id
            );
          }
          // Αλλιώς round-robin
          if (!tt) tt = event.ticket_types[idx % event.ticket_types.length];

          ticketTypeId = tt.ticket_type_id || `T${idx + 1}`;
          ticketTypeName = tt.name || ticketTypeId;
          ticketPrice = Number(tt.price) || 0;
        }

        // ---- Total Price ----
        // 1. Αν το booking έχει total_price, χρησιμοποίησέ το
        // 2. Αλλιώς ψάξε στο standalone mockBookings
        // 3. Αλλιώς υπολόγισε price × quantity
        let totalPrice = b.total_price;
        if (totalPrice == null) {
          const standalone = mockBookings.find(mb => mb.id === b.id);
          if (standalone?.total_price != null) {
            totalPrice = standalone.total_price;
          } else {
            totalPrice = ticketPrice * (b.quantity || 0);
          }
        }

        // ---- Booking Date ----
        const bookingDate = b.booking_date
          || mockBookings.find(mb => mb.id === b.id)?.booking_date
          || event.start_datetime;

        // ---- User info ----
        const user = mockUsers.find(u => u.id === b.user_id);
        const userName = user
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
          : `User ${b.user_id}`;

        return {
          ...b,
          ticket_type_id: ticketTypeId,
          ticket_type_name: ticketTypeName,
          ticket_price: ticketPrice,
          total_price: totalPrice,
          booking_date: bookingDate,
          user_name: userName,
          user_username: user?.username || `user${b.user_id}`,
        };
      });

      return { data: enriched };
    }
    const response = await axios.get(`${API_BASE}/events/${eventId}/bookings/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  },
  // Μέσα στο eventService, μετά το getOrganizerEvents:
  getAllEvents: async () => {
    if (USE_MOCK) {
      await delay();
      return { data: mockEvents };
    }
    const response = await axios.get(`${API_BASE}/events/`, {
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
  },
    // ← ΝΕΟ: Approve booking (PENDING → CONFIRMED)
  approveBooking: async (bookingId) => {
    if (USE_MOCK) {
      await delay(300);
      // Ψάξε σε όλα τα events
      for (const event of mockEvents) {
        const booking = event.bookings?.find(b => b.id === Number(bookingId));
        if (booking) {
          booking.status = 'CONFIRMED';
          return { data: booking };
        }
      }
      throw new Error('Booking not found');
    }
    const response = await axios.patch(
      `${API_BASE}/bookings/${bookingId}/`,
      { status: 'CONFIRMED' },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      }
    );
    return response;
  },

  // ← ΝΕΟ: Reject booking (PENDING → CANCELLED + επιστροφή tickets)
  rejectBooking: async (bookingId) => {
    if (USE_MOCK) {
      await delay(300);
      for (const event of mockEvents) {
        const booking = event.bookings?.find(b => b.id === Number(bookingId));
        if (booking) {
          booking.status = 'CANCELLED';
          // Επιστροφή διαθεσιμότητας
          event.available_capacity = (event.available_capacity || 0) + (booking.quantity || 0);
          if (event.ticket_types && booking.ticket_type_id) {
            const tt = event.ticket_types.find(
              t => t.id === booking.ticket_type_id || t.ticket_type_id === booking.ticket_type_id
            );
            if (tt) tt.available = (tt.available || 0) + (booking.quantity || 0);
          }
          return { data: booking };
        }
      }
      throw new Error('Booking not found');
    }
    const response = await axios.patch(
      `${API_BASE}/bookings/${bookingId}/`,
      { status: 'CANCELLED' },
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
// MESSAGE SERVICES
// ============================================
export const messageService = {
  // Επιστρέφει ΟΛΑ τα μηνύματα (το filtering γίνεται στο component)
  getMyMessages: async () => {
    if (USE_MOCK) {
      await delay();
      return { data: mockMessages };
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

  getUnreadCount: async (userId = null) => {
    if (USE_MOCK) {
      await delay(200);
      let unread = mockMessages.filter(m => !m.is_read);
      if (userId !== null) {
        unread = unread.filter(m =>
          m.recipient_id === userId && !m.is_trash && !m.is_draft
        );
      }
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

  // Οριστική διαγραφή (μόνο από Trash)
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

  // ← ΝΕΟ: Soft delete → Trash
  moveToTrash: async (messageId) => {
    if (USE_MOCK) {
      await delay(200);
      const message = mockMessages.find(m => m.id === Number(messageId));
      if (message) {
        message.is_trash = true;
        message.is_draft = false;
      }
      return { data: { success: true } };
    }
    const response = await axios.patch(
      `${API_BASE}/messages/${messageId}/`,
      { is_trash: true, is_draft: false },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      }
    );
    return response;
  },

  // ← ΝΕΟ: Restore από Trash
  restoreFromTrash: async (messageId) => {
    if (USE_MOCK) {
      await delay(200);
      const message = mockMessages.find(m => m.id === Number(messageId));
      if (message) {
        message.is_trash = false;
      }
      return { data: { success: true } };
    }
    const response = await axios.patch(
      `${API_BASE}/messages/${messageId}/`,
      { is_trash: false },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      }
    );
    return response;
  },

  // ← ΕΝΗΜΕΡΩΜΕΝΟ: Υποστηρίζει draftId
  createMessage: async (data) => {
    if (USE_MOCK) {
      await delay();
      // Αν έχουμε draftId, μετατρέπουμε draft → sent
      if (data.draftId) {
        const existing = mockMessages.find(m => m.id === Number(data.draftId));
        if (existing) {
          Object.assign(existing, {
            recipient_id: data.recipient_id || null,
            recipient_username: data.recipient_username || '',
            subject: data.subject || '',
            body: data.body || '',
            is_draft: false,
            is_trash: false,
            is_read: false,
            created_at: new Date().toISOString()
          });
          return { data: existing };
        }
      }
      const newMessage = {
        id: mockMessages.length + 1,
        sender_id: data.sender_id || 3,
        sender_username: data.sender_username || 'user',
        sender_name: data.sender_name || 'User',
        recipient_id: data.recipient_id || 2,
        recipient_username: data.recipient_username || data.recipient || '',
        subject: data.subject || '',
        body: data.body || '',
        is_read: false,
        is_draft: false,
        is_trash: false,
        created_at: new Date().toISOString(),
        attachments: []
      };
      mockMessages.push(newMessage);
      return { data: newMessage };
    }
    // Backend
    if (data.draftId) {
      const response = await axios.patch(
        `${API_BASE}/messages/${data.draftId}/`,
        { ...data, is_draft: false },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );
      return response;
    }
    const response = await axios.post(`${API_BASE}/messages/`, data, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  // ← ΝΕΟ: Αποθήκευση ως Draft
  saveDraft: async (data) => {
    if (USE_MOCK) {
      await delay();
      // Αν υπάρχει draftId, ενημέρωσε το υπάρχον
      if (data.draftId) {
        const existing = mockMessages.find(m => m.id === Number(data.draftId));
        if (existing) {
          Object.assign(existing, {
            recipient_id: data.recipient_id || null,
            recipient_username: data.recipient_username || '',
            subject: data.subject || '',
            body: data.body || '',
            is_draft: true,
            is_trash: false,
            updated_at: new Date().toISOString()
          });
          return { data: existing };
        }
      }
      // Δημιούργησε νέο draft
      const newDraft = {
        id: mockMessages.length + 1,
        sender_id: data.sender_id || 3,
        sender_username: data.sender_username || 'user',
        sender_name: data.sender_name || 'User',
        recipient_id: data.recipient_id || null,
        recipient_username: data.recipient_username || '',
        subject: data.subject || '',
        body: data.body || '',
        is_read: true,
        is_draft: true,
        is_trash: false,
        created_at: new Date().toISOString(),
        attachments: []
      };
      mockMessages.push(newDraft);
      return { data: newDraft };
    }
    // Backend
    if (data.draftId) {
      const response = await axios.patch(
        `${API_BASE}/messages/${data.draftId}/`,
        { ...data, is_draft: true },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );
      return response;
    }
    const response = await axios.post(
      `${API_BASE}/messages/`,
      { ...data, is_draft: true },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      }
    );
    return response;
  },
    getRecipients: async (currentUserId = null) => {
    if (USE_MOCK) {
      await delay(200);

      if (!currentUserId) return { data: [] };

      const currentUser = mockUsers.find(u => u.id === currentUserId);
      if (!currentUser) return { data: [] };

      const isOrganizer = currentUser.role === 'ORGANIZER';
      const allowedUserIds = new Set();

      if (isOrganizer) {
        // ---- ORGANIZER: βρες participants που έχουν κάνει booking σε δικά του events ----
        const myEventIds = mockEvents
          .filter(e => e.organizer?.id === currentUserId)
          .map(e => e.id);

        const relevantBookings = mockBookings.filter(b =>
          myEventIds.includes(b.event_id) && b.status !== 'CANCELLED'
        );

        relevantBookings.forEach(b => allowedUserIds.add(b.user_id));
      } else {
        // ---- PARTICIPANT: βρες organizers των events στα οποία έχει κάνει booking ----
        const myBookings = mockBookings.filter(b =>
          b.user_id === currentUserId && b.status !== 'CANCELLED'
        );

        myBookings.forEach(b => {
          const event = mockEvents.find(e => e.id === b.event_id);
          if (event?.organizer?.id) {
            allowedUserIds.add(event.organizer.id);
          }
        });
      }

      // Φτιάξε τη λίστα recipients (εξαίρεσε τον εαυτό του + μόνο APPROVED users)
      const recipients = mockUsers
        .filter(u =>
          allowedUserIds.has(u.id) &&
          u.id !== currentUserId &&
          u.approval_status === 'APPROVED'
        )
        .map(u => ({
          id: u.id,
          username: u.username,
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
          role: u.role === 'ORGANIZER' ? 'Organizer' : 'Participant',
        }));

      return { data: recipients };
    }

    // Backend: το endpoint /api/messages/recipients/ θα φιλτράρει server-side
    const response = await axios.get(`${API_BASE}/messages/recipients/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    if (response.data && response.data.results) {
      return { data: response.data.results };
    }
    return response;
  },
    // ← ΝΕΟ: Mark as Junk
  markAsJunk: async (messageId) => {
    if (USE_MOCK) {
      await delay(200);
      const message = mockMessages.find(m => m.id === Number(messageId));
      if (message) {
        message.is_junk = true;
        message.is_read = true;
        message.is_trash = false;
      }
      return { data: { success: true } };
    }
    const response = await axios.patch(
      `${API_BASE}/messages/${messageId}/`,
      { is_junk: true, is_read: true, is_trash: false },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      }
    );
    return response;
  },

  // ← ΝΕΟ: Unmark Junk (Restore στο Inbox)
  unmarkJunk: async (messageId) => {
    if (USE_MOCK) {
      await delay(200);
      const message = mockMessages.find(m => m.id === Number(messageId));
      if (message) {
        message.is_junk = false;
      }
      return { data: { success: true } };
    }
    const response = await axios.patch(
      `${API_BASE}/messages/${messageId}/`,
      { is_junk: false },
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
// USER SERVICES (Admin only)
// ============================================
export const userService = {
  getAllUsers: async () => {
    if (USE_MOCK) {
      await delay();
      return { data: mockUsers };
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
  },

  getUser: async (userId) => {
    if (USE_MOCK) {
      await delay();
      const user = mockUsers.find(u => u.id === Number(userId));
      if (!user) throw new Error('User not found');
      return { data: user };
    }
    const response = await axios.get(`${API_BASE}/users/${userId}/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  approveUser: async (userId) => {
    if (USE_MOCK) {
      await delay();
      const user = mockUsers.find(u => u.id === Number(userId));
      if (user) user.approval_status = 'APPROVED';
      return { data: user };
    }
    const response = await axios.patch(
      `${API_BASE}/users/${userId}/`,
      { approval_status: 'APPROVED' },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      }
    );
    return response;
  },

  rejectUser: async (userId) => {
    if (USE_MOCK) {
      await delay();
      const user = mockUsers.find(u => u.id === Number(userId));
      if (user) user.approval_status = 'REJECTED';
      return { data: user };
    }
    const response = await axios.patch(
      `${API_BASE}/users/${userId}/`,
      { approval_status: 'REJECTED' },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      }
    );
    return response;
  },

  deleteUser: async (userId) => {
    if (USE_MOCK) {
      await delay();
      const index = mockUsers.findIndex(u => u.id === Number(userId));
      if (index !== -1) mockUsers.splice(index, 1);
      return { data: { success: true } };
    }
    const response = await axios.delete(`${API_BASE}/users/${userId}/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response;
  }
};