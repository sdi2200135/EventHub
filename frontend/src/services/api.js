// src/services/api.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://localhost:8000/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// AXIOS INSTANCE
// ============================================
// a client for the whole app: it knows the base URL and attaches the JWT to every request.
// The access token lives 10 minutes and the refresh token 1 day.
//
// every request goes through `api`. when the backend answers 401
// interceptor catches it, asks for a new access token and retries the request once.
//
// The refresh request itself is sent with plain `axios`, not `api`, so it bypasses
// the interceptor: if the refresh token has expired too, that 401 is simply returned
// instead of triggering another refresh and waiting forever.

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// while a refresh is in flight, other 401s wait for the same promise
let refreshing = null;


// DRF sends an error either as { detail: "..." } or under the field it concerns,
// Turn it into one readable line, so a page only needs err.message
const errorMessage = (error) => {
  let data = error.response?.data;
  // a request made with responseType 'text' (the export) gets its error as text too
  if (typeof data === 'string') {
    try { data = JSON.parse(data); 

    } catch { }
  }
  if (!data || typeof data !== 'object') 
    return error.message;   

  // look inside lists and objects until the first message
  const firstString = (value) => {
    if (typeof value === 'string') return value;
    for (const item of Object.values(value || {})) {
      const found = firstString(item);
      if (found) return found;
    }
    return null;
  };

  for (const [field, value] of Object.entries(data)) {
    const message = firstString(value);
    if (message) 
      return ['detail', 'non_field_errors'].includes(field) ? message : `${field}: ${message}`;
  }
   return error.message;
};

// every failed request leaves `api` through here
const reject = (error) => {
  error.message = errorMessage(error);
  return Promise.reject(error);
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const refresh = sessionStorage.getItem('refresh_token');

    // only retry once, and never for the refresh call itself
    if (error.response?.status !== 401 || !refresh || original._retried) {
      return reject(error);
    }
    original._retried = true;

    try {
      refreshing = refreshing || axios
        .post(`${API_BASE}/auth/refresh/`, { refresh })
        .then((r) => r.data.access)
        .finally(() => { refreshing = null; });

      const access = await refreshing;
      sessionStorage.setItem('access_token', access);
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch (refreshError) {
      // refresh token expired, or the admin rejected the account meanwhile
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      return reject(refreshError);
    }
  }
);


// =====================================
//       HELPER FNUCTIONS
// =====================================

// The API paginates is paginated so in order to get all events, or categories, events users floow then next
// it is linked and returns the whole collection (like a linked list)
const fetchAll = async (path, params = {}) => {
  const rows = [];
  let response = await api.get(path, { params });
  for (;;) {
    const { data } = response;
    if (!data?.results) return Array.isArray(data) ? data : [];
    rows.push(...data.results);
    if (!data.next) return rows;
    // `next` is a full url, so it takes over from baseURL
    response = await api.get(data.next);
  }
};

// we need to match the categories with their ids as the api waits for the id
const resolveCategoryIds = async (names = []) => {
  const all = await fetchAll('/categories/');
  const ids = [];
  const unknown = [];
  for (const name of names) {
    const match = all.find((c) => c.name.toLowerCase() === String(name).trim().toLowerCase());
    if (match) ids.push(match.id);
    else unknown.push(name);
  }
  if (unknown.length) throw new Error(`Unknown category: ${unknown.join(', ')}`);
  return ids;
};

// the from keeps photo as blob(url). read it back into a file and upload it, one request per photo in the correct order
const uploadEventPhotos = async (eventId, photos = []) => {
  for (const [index, photo] of photos.entries()) {
    const file = await fetch(photo.image).then((r) => r.blob());
    const form = new FormData();
    form.append('image', file, photo.name || `photo-${index + 1}.jpg`);
    form.append('caption', photo.caption || '');
    form.append('order', index);
    await api.post(`/events/${eventId}/photos/`, form);
  }
};


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
    const { ticket_types = [], photos = [], categories = [], status, organizer, event_id, ...fields } = data;

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

  // todo
  updateEvent: async (eventId, data) => {
    // if (USE_MOCK) {
    //   await delay();
    //   const event = mockEvents.find(e => e.id === Number(eventId));
    //   if (!event) throw new Error('Event not found');
    //   Object.assign(event, data);
    //   return { data: event };
    // }
    return  await api.patch(`/events/${eventId}/`, data)
  },

  // todo
  deleteEvent: async (eventId) => {
    // if (USE_MOCK) {
    //   await delay();
    //   const index = mockEvents.findIndex(e => e.id === Number(eventId));
    //   if (index === -1) throw new Error('Event not found');
    //   const event = mockEvents[index];
    //   if (event.status === 'PUBLISHED' && event.bookings?.length > 0) {
    //     throw new Error('Cannot delete a published event with bookings');
    //   }
    //   mockEvents.splice(index, 1);
    //   return { data: { success: true } };
    // }
    return await api.delete(`/events/${eventId}/`)
  },

  cancelEvent: async (eventId) => {
    return await api.post(`/events/${eventId}/cancel/`);
  },

  // ← ΕΜΠΛΟΥΤΙΣΜΕΝΟ: Επιστρέφει enriched bookings με ticket type + user info + total_price
  getEventBookings: async (eventId) => {
    // if (USE_MOCK) {
    //   await delay();
    //   const event = mockEvents.find(e => e.id === Number(eventId));
    //   if (!event) return { data: [] };

    //   const enriched = (event.bookings || []).map((b, idx) => {
    //     // ---- Ticket Type ----
    //     let ticketTypeId = 'T1';
    //     let ticketTypeName = 'Regular';
    //     let ticketPrice = 0;

    //     if (event.ticket_types && event.ticket_types.length > 0) {
    //       // Αν το booking έχει ticket_type_id, ψάξε το σωστό
    //       let tt = null;
    //       if (b.ticket_type_id) {
    //         tt = event.ticket_types.find(
    //           t => t.id === b.ticket_type_id || t.ticket_type_id === b.ticket_type_id
    //         );
    //       }
    //       // Αλλιώς round-robin
    //       if (!tt) tt = event.ticket_types[idx % event.ticket_types.length];

    //       ticketTypeId = tt.ticket_type_id || `T${idx + 1}`;
    //       ticketTypeName = tt.name || ticketTypeId;
    //       ticketPrice = Number(tt.price) || 0;
    //     }

    //     // ---- Total Price ----
    //     // 1. Αν το booking έχει total_price, χρησιμοποίησέ το
    //     // 2. Αλλιώς ψάξε στο standalone mockBookings
    //     // 3. Αλλιώς υπολόγισε price × quantity
    //     let totalPrice = b.total_price;
    //     if (totalPrice == null) {
    //       const standalone = mockBookings.find(mb => mb.id === b.id);
    //       if (standalone?.total_price != null) {
    //         totalPrice = standalone.total_price;
    //       } else {
    //         totalPrice = ticketPrice * (b.quantity || 0);
    //       }
    //     }

    //     // ---- Booking Date ----
    //     const bookingDate = b.booking_date
    //       || mockBookings.find(mb => mb.id === b.id)?.booking_date
    //       || event.start_datetime;

    //     // ---- User info ----
    //     const user = mockUsers.find(u => u.id === b.user_id);
    //     const userName = user
    //       ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
    //       : `User ${b.user_id}`;

    //     return {
    //       ...b,
    //       ticket_type_id: ticketTypeId,
    //       ticket_type_name: ticketTypeName,
    //       ticket_price: ticketPrice,
    //       total_price: totalPrice,
    //       booking_date: bookingDate,
    //       user_name: userName,
    //       user_username: user?.username || `user${b.user_id}`,
    //     };
    //   });

    //   return { data: enriched };
    // }
    const response = await axios.get(`${API_BASE}/events/${eventId}/bookings/`)
    return response;
  },

  // REMOVE LATER
//   // Μέσα στο eventService, μετά το getOrganizerEvents:
//   getAllEvents: async () => {
//     if (USE_MOCK) {
//       await delay();
//       return { data: applyComputedStatusToList(mockEvents) };
//     }
//     const response = await axios.get(`${API_BASE}/events/`, {
//       headers: {
//         Authorization: `Bearer ${sessionStorage.getItem('access_token')}`
//       }
//     });
//     if (response.data && response.data.results) {
//       return { data: applyComputedStatusToList(response.data.results) };
//     }
//     return {
//       ...response,
//       data: applyComputedStatusToList(response.data),
//     };
//   }
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

      // Πάρε τον πραγματικό logged-in user
      const uid = getCurrentMockUserId();
      if (uid == null) throw new Error('No logged-in user');
      
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
          user_id: uid,                                  // ← FIX: dynamic user
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
    // transform payload for backend
    const backendPayload = {
      event: data.event,
      ticket_type: data.ticket_type,
      number_of_tickets: data.quantity,
      // seats-> δεν στέλνεται στο backend
    };

    const response = await axios.post(`${API_BASE}/bookings/`, backendPayload, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  getMyBookings: async () => {
    if (USE_MOCK) {
      await delay();

      // Πάρε τον πραγματικό logged-in user
      const uid = getCurrentMockUserId();
      if (uid == null) return { data: [] };

      const userBookings = mockBookings.filter(b => b.user_id === uid);
      return { data: userBookings };
    }

    // 1. Παίρνουμε το τρέχον user id για filtering
    const meRes = await axios.get(`${API_BASE}/auth/me/`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('access_token')}` }
    });
    const userId = meRes.data.id;

    // 2. Φιλτράρουμε μόνο τις δικές μας κρατήσεις
    const response = await axios.get(
      `${API_BASE}/bookings/?attendee=${userId}`,
      { headers: { Authorization: `Bearer ${sessionStorage.getItem('access_token')}` } }
    );

    const raw = response.data.results || response.data;

    // 3. Μετατρέπουμε τα ονόματα πεδίων
    const data = raw.map(b => ({
      id: b.id,
      event_id: b.event,
      ticket_type_id: b.ticket_type,
      quantity: b.number_of_tickets,
      total_price: parseFloat(b.total_cost),
      booking_date: b.created_at,
      status: b.status,
      // event_title, event_date, venue, city, seats → λείπουν (βλ. Επίπεδο Β)
    }));

    return { data };
  },
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
        Authorization: `Bearer ${sessionStorage.getItem('access_token')}`
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
      // if (userId !== null) {
      //   unread = unread.filter(m =>
      //     m.recipient_id === userId && !m.is_trash && !m.is_draft
      //   );
      // }
      return { data: { count: unread.length } };
    }
    // const response = await axios.get(`${API_BASE}/messages/unread_count/`, {
    //   headers: {
    //     Authorization: `Bearer ${sessionStorage.getItem('access_token')}`
    //   }
    // });
    const response = await axios.get(`${API_BASE}/messages/unread_summary/`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('access_token')}` }
    });
    return response;
  },

  // REMOVE LATER
  // markAsRead: async (messageId) => {
  //   if (USE_MOCK) {
  //     await delay(200);
  //     const message = mockMessages.find(m => m.id === Number(messageId));
  //     if (message) message.is_read = true;
  //     return { data: { success: true } };
  //   }
  //   const response = await axios.patch(
  //     `${API_BASE}/messages/${messageId}/`,
  //     { is_read: true },
  //     {
  //       headers: {
  //         Authorization: `Bearer ${sessionStorage.getItem('access_token')}`
  //       }
  //     }
  //   );
  //   return response;
  // },

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
        Authorization: `Bearer ${sessionStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  // DELETE OLO CHECK IT 
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
        Authorization: `Bearer ${sessionStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  // ← ΝΕΟ: Soft delete → Trash
  // moveToTrash: async (messageId) => {
  //   if (USE_MOCK) {
  //     await delay(200);
  //     const message = mockMessages.find(m => m.id === Number(messageId));
  //     if (message) {
  //       message.is_trash = true;
  //       message.is_draft = false;
  //     }
  //     return { data: { success: true } };
  //   }
  //   const response = await axios.patch(
  //     `${API_BASE}/messages/${messageId}/`,
  //     { is_trash: true, is_draft: false },
  //     {
  //       headers: {
  //         Authorization: `Bearer ${sessionStorage.getItem('access_token')}`
  //       }
  //     }
  //   );
  //   return response;
  // },

  // // ← ΝΕΟ: Restore από Trash
  // restoreFromTrash: async (messageId) => {
  //   if (USE_MOCK) {
  //     await delay(200);
  //     const message = mockMessages.find(m => m.id === Number(messageId));
  //     if (message) {
  //       message.is_trash = false;
  //     }
  //     return { data: { success: true } };
  //   }
  //   const response = await axios.patch(
  //     `${API_BASE}/messages/${messageId}/`,
  //     { is_trash: false },
  //     {
  //       headers: {
  //         Authorization: `Bearer ${sessionStorage.getItem('access_token')}`
  //       }
  //     }
  //   );
  //   return response;
  // },

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
        sender_id: data.sender_id || getCurrentMockUserId() || 3,
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
            Authorization: `Bearer ${sessionStorage.getItem('access_token')}`
          }
        }
      );
      return response;
    }
    const response = await axios.post(`${API_BASE}/messages/`, data, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('access_token')}`
      }
    });
    return response;
  },

  // ← ΕΝΗΜΕΡΩΜΕΝΟ: Υποστηρίζει dual-role (organizer + participant)
  getRecipients: async (currentUserId = null) => {
    if (USE_MOCK) {
      await delay(200);

      if (!currentUserId) return { data: [] };

      const currentUser = mockUsers.find(u => u.id === currentUserId);
      if (!currentUser) return { data: [] };

      const allowedUserIds = new Set();

      // ============================================
      // (1) ORGANIZER SIDE:
      //     Users που έχουν κάνει κράτηση σε events που ΕΓΩ διοργανώνω
      // ============================================
      const myEventIds = mockEvents
        .filter(e => e.organizer?.id === currentUserId)
        .map(e => e.id);

      const relevantBookings = mockBookings.filter(b =>
        myEventIds.includes(b.event_id) && b.status !== 'CANCELLED'
      );

      relevantBookings.forEach(b => allowedUserIds.add(b.user_id));

      // ============================================
      // (2) PARTICIPANT SIDE:
      //     Organizers των events που ΕΓΩ έχω κάνει κράτηση
      // ============================================
      const myBookings = mockBookings.filter(b =>
        b.user_id === currentUserId && b.status !== 'CANCELLED'
      );

      myBookings.forEach(b => {
        const event = mockEvents.find(e => e.id === b.event_id);
        if (event?.organizer?.id) {
          allowedUserIds.add(event.organizer.id);
        }
      });

      // ============================================
      // Build recipients list
      // (εξαίρεσε τον εαυτό του + μόνο APPROVED users)
      // ============================================
      const recipients = mockUsers
        .filter(u =>
          allowedUserIds.has(u.id) &&
          u.id !== currentUserId &&
          u.approval_status === 'APPROVED'
        )
        .map(u => {
          // Role label: μόνο Admin vs User (2-role μοντέλο)
          const isAdmin = u.is_staff || u.is_superuser || u.role === 'ADMIN';
          return {
            id: u.id,
            username: u.username,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
            role: isAdmin ? 'Admin' : 'User',
          };
        });

      return { data: recipients };
    }

    // Backend: το endpoint /api/messages/recipients/ θα φιλτράρει server-side
    const response = await axios.get(`${API_BASE}/messages/recipients/`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('access_token')}`
      }
    });
    if (response.data && response.data.results) {
      return { data: response.data.results };
    }
    return response;
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