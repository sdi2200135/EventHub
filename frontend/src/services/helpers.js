// src/services/helpers.js
import { api } from './client';


// =====================================
//       HELPER FUNCTIONS
// =====================================

// The API is paginated, so in order to get all events, or categories, or events users follow,
// the `next` link is followed and the whole collection is returned (like a linked list)
export const fetchAll = async (path, params = {}) => {
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
export const resolveCategoryIds = async (names = []) => {
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

// the form keeps the photo as a blob(url). read it back into a file and upload it, one request per photo in the correct order
export const uploadEventPhotos = async (eventId, photos = [], firstOrder = 0) => {
  for (const [index, photo] of photos.entries()) {
    const file = photo.file || await fetch(photo.image || photo.url).then((r) => r.blob());
    const form = new FormData();
    form.append('image', file, photo.name || `photo-${index + 1}.jpg`);
    form.append('caption', photo.caption || '');
    form.append('order', firstOrder + index);
    await api.post(`/events/${eventId}/photos/`, form);
  }
};

// make the saved ticket types match the form: delete the removed ones, update the changed ones, create the new ones.
export const syncTicketTypes = async (eventId, saved = [], wanted = []) => {
  const keep = new Set(wanted.filter((t) => t.pk).map((t) => t.pk));

  // ticket types to remove
  for (const t of saved) {
    if (!keep.has(t.id)) 
        await api.delete(`/ticket-types/${t.id}/`);
  }

  // update the ticket types which are changed
  // when there is a decrease in the number of tickets, decrease them first so each patch can stay within capacity
  const changed = wanted
    .filter((t) => t.pk)
    .map((t) => ({ form: t, old: saved.find((s) => s.id === t.pk) }))
    .filter(({ form, old }) => old && (
      form.name.trim() !== old.name ||
      Number(form.price) !== Number(old.price) ||
      Number(form.quantity) !== old.quantity
    ))
    .sort((a, b) => (a.form.quantity - a.old.quantity) - (b.form.quantity - b.old.quantity));

  for (const { form } of changed) {
    await api.patch(`/ticket-types/${form.pk}/`, {
      name: form.name,
      price: Number(form.price),
      quantity: Number(form.quantity),
    });
  }

  // create the new ticket types in bulk in one request
  const added = wanted.filter((t) => !t.pk);
  if (added.length) {
    await api.post('/ticket-types/bulk/', {
      event_id: eventId,
      ticket_types: added.map(({ name, price, quantity }) => ({ name, price, quantity })),
    });
  }
};

// update the event's photos
export const syncEventPhotos = async ( eventId, saved=[], wanted = []) => {
  const keep = new Set(wanted.filter((t) => t.pk).map((t) => t.pk));

  // remove old photos
  for (const p of saved) {
    if (!keep.has(p.id)) 
        await api.delete(`/events/${eventId}/photos/${p.id}/`);
  }

  // add the new photos
  const kept = saved.filter((p) => keep.has(p.id));
  const nextOrder = Math.max(-1, ...kept.map((p) => p.order)) + 1;
  await uploadEventPhotos(eventId, wanted.filter((p) => !p.pk), nextOrder);
}