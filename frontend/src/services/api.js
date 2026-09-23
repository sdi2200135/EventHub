// src/services/api.js

import { api } from './client';
import { fetchAll, resolveCategoryIds, uploadEventPhotos, syncTicketTypes, syncEventPhotos } from './helpers';
// ============================================
// AUTH SERVICES
// ============================================
export const authService = {
  register: async (data) => {
    try {
      return  await api.post(`/auth/register/`, data);
    } catch (error) {
      console.error('Register API error:', error.response?.data);
      throw error;
    }
  },

  login: async (credentials) => {
    // clean possible tokens from previous session
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    try {
      const {data} = await api.post(`/auth/login/`, credentials);
      // save new tokens in session storage
      sessionStorage.setItem('access_token', data.access);
      sessionStorage.setItem('refresh_token', data.refresh);

      // get user's info from backend using the token
      const { data: user } = await api.get('/auth/me/');
      return { data: { ...data, user } };
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password', { cause: error });
      }
      throw error;
    }
  },

  getProfile: async () => {
    return  await api.get(`/auth/me/`)
  },

  updateProfile: async (data) => {
    return await api.patch(`/auth/me/`, data);
  },

};

// ============================================
// EVENT SERVICES
// ============================================

//  it works with pagination which is set on services of backend
export const eventService = {
  getEvents: async (params={}) => {
    const { data } = await api.get('/events/', { params: { status: 'PUBLISHED', ...params } });
    return { data: data.results, count: data.count };
  },

  getEvent: async (id) => {
    return await api.get(`/events/${id}/`);
  },

  // events of a particlar organizer 
  // My events
  getOrganizerEvents: async (organizerId) => ({
    data: await fetchAll('/events/', { organizer: organizerId }),
  }),

  createEvent: async (data) => {
    const { ticket_types = [], photos = [], categories = [], status, ...fields } = data;

    const { data: event } = await api.post('/events/', {
      ...fields,
      event_type: fields.event_type || 'OTHER',
      categories: await resolveCategoryIds(categories),
    });
    try{
      // create tickets
      if (ticket_types.length) {
        await api.post('/ticket-types/bulk/', {
          event_id: event.id,
          ticket_types: ticket_types.map(({ name, price, quantity }) => ({ name, price, quantity })),
        });
      }  
      // upload the photos
      await uploadEventPhotos(event.id, photos);

    }catch(err){
      // the event exists but is incomplete due to some fault in ticket type creation so delete so a duplicate won't exist
      await api.delete(`/events/${event.id}/`).catch(() => {});
      throw err;
    }
    
    if (status === 'PUBLISHED') {
      return api.post(`/events/${event.id}/publish/`);
    }
    return api.get(`/events/${event.id}/`);
  },

  // take the information about the event from the backend and compare to the crrent changes
  updateEvent: async (eventId, data) => {
    const { ticket_types = [], photos = [], categories = [], status, ...fields } = data;

    // current data in backend
    const { data: current } = await api.get(`/events/${eventId}/`);
    const categoryIds = await resolveCategoryIds(categories);
    const saveFields = () => api.patch(`/events/${eventId}/`, { ...fields, categories: categoryIds });

    // the backend checks capacity against the ticket quantities it already has:
    // when capacity shrinks, shrink the tickets first; otherwise raise the capacity first
    if (Number(fields.capacity) < current.capacity) {
      await syncTicketTypes(eventId, current.ticket_types, ticket_types);
      await saveFields();
    } 
    else {
      await saveFields();
      await syncTicketTypes(eventId, current.ticket_types, ticket_types);
    }

    await syncEventPhotos(eventId, current.photos, photos);

    if (status === 'PUBLISHED' && current.status === 'DRAFT') {
      await api.post(`/events/${eventId}/publish/`);
    }
    return api.get(`/events/${eventId}/`);
  },

  deleteEvent: async (eventId) => {
    return await api.delete(`/events/${eventId}/`)
  },

  cancelEvent: async (eventId) => {
    return await api.post(`/events/${eventId}/cancel/`);
  },

  // get all events for the admin
  getAllEvents: async () => ({
    data : await fetchAll(`/events/`)
  }),

  getEventBookings: async (eventId) => ({
    data: await fetchAll(`/bookings/`, { event: eventId})
  }),

};

// ============================================
// CATEGORY SERVICES
// ============================================
export const categoryService = {
  getCategories: async () => ({
    data : await fetchAll(`/categories/`) 
  }),
};

// ============================================
// BOOKING SERVICES
// ============================================
export const bookingService = {
  createBooking: async ({event, ticket_type,number_of_tickets}) => {

    const { data: booking } = await api.post('/bookings/', { event, ticket_type, number_of_tickets });
    return await api.post(`/bookings/${booking.id}/confirm/`);
  },

  getMyBookings: async () => ({
      data: await fetchAll('/bookings/me/'),
  }),

  getAllBookings: async () => ({
     data: await fetchAll('/bookings/') 
  }),
  
};
// ============================================
// MESSAGE SERVICES
// ============================================

export const messageService = {

  // messages received, newest first 
  getInbox: async () => ({
    data: await fetchAll('/messages/inbox/'),
  }),

  // messages sent, newest first
  getSent: async () => ({
    data: await fetchAll('/messages/sent/') 
  }),

  // for navbar to show how many unread messages
  getUnreadCount: async () => {
    return await api.get(`/messages/unread_summary/`)
  },

  // the whole chat will appear
  getConversation: async (conversationId) => ({
    data: await fetchAll('/messages/', { conversation: conversationId }),
  }),

  // mark every message i received in this conversation as read
  markConversationRead: (conversationId) => {
   return api.post(`/conversations/${conversationId}/mark_read/`)
  }, 

  getMessage: async (messageId) => {
    return await api.get(`/messages/${messageId}/`)
  },

  // first message about an event: attendee/organizer send new message
  // the backend reuses the conversation if it already exists
  sendNewMessage: async ({ event, attendee, body }) => {
    const { data: conversation } = await api.post('/conversations/', { event, attendee });
    return await api.post('/messages/', { conversation: conversation.id, body });
  },
  // reply to a message 
  sendMessage: async ({ conversation, body }) => {
    return await api.post('/messages/', { conversation, body })
  },

  // delete message
  deleteMessage: async (messageId) => {
    return  await api.delete(`/messages/${messageId}/`)
  },

  // delete the whole conversation
  deleteConversation: async (conversationId) => {
    return await api.delete(`/conversations/${conversationId}/`)
  },

};

// ============================================
// USER SERVICES (Admin only)
// ============================================
export const userService = {
  getAllUsers: async () => ({
    data: await fetchAll('/admin/users/')
  }),

  approveUser: async (userId) => {
    return await api.post(`/admin/users/${userId}/approve/`);
  },

  rejectUser: async (userId) => {
    return await api.post(`/admin/users/${userId}/reject/`);
  },

  exportEvents: async (format, organizerId) => {
    const { data } = await api.get(`/admin/events/export/${format}/`, {
      params: { organizer: organizerId },
      responseType: 'text',
    });
    return { data };
  },
};