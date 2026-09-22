// src/services/client.js

import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'https://localhost:8000/api';


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

    } catch { /*  not JSON, keep the text */}
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