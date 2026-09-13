// src/pages/profile/EditEvent.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { eventService } from '../../../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import './CreateEvent.css';

const STEPS = [
  { id: 1, label: 'Event Details' },
  { id: 2, label: 'Tickets' },
  { id: 3, label: 'Photos & Description' },
];

const MAX_DESCRIPTION = 150;
const MAX_PHOTOS = 20;

// Μετατροπή ISO date → format για datetime-local input
const toDatetimeLocal = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const EditEvent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // ============================================
  // STEP 1: EVENT DETAILS STATE
  // ============================================
  const [formData, setFormData] = useState({
    event_id: '',
    title: '',
    event_type: '',
    venue: '',
    address: '',
    city: '',
    country: 'Greece',
    capacity: 150,
    latitude: '',
    longitude: '',
    start_datetime: '',
    end_datetime: '',
    categories: [],
  });

  const [newCategory, setNewCategory] = useState('');

  // ============================================
  // STEP 2: TICKETS STATE
  // ============================================
  const [ticketTypes, setTicketTypes] = useState([]);

  // ============================================
  // STEP 3: PHOTOS & DESCRIPTION
  // ============================================
  const [description, setDescription] = useState('');
  // photos: { id, url, name, file? (αν είναι νέα), isExisting? }
  const [photos, setPhotos] = useState([]);

  // ============================================
  // ΦΟΡΤΩΣΗ EVENT DATA
  // ============================================
  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      try {
        const response = await eventService.getEvent(id);
        const ev = response.data;

        // Step 1
        setFormData({
          event_id: ev.event_id || '',
          title: ev.title || '',
          event_type: ev.event_type || '',
          venue: ev.venue || '',
          address: ev.address || '',
          city: ev.city || '',
          country: ev.country || 'Greece',
          capacity: ev.capacity || 0,
          latitude: ev.latitude != null ? String(ev.latitude) : '',
          longitude: ev.longitude != null ? String(ev.longitude) : '',
          start_datetime: toDatetimeLocal(ev.start_datetime),
          end_datetime: toDatetimeLocal(ev.end_datetime),
          categories: ev.categories || [],
        });

        // Step 2
        const types = (ev.ticket_types || []).map((t, i) => ({
          id: t.ticket_type_id || `T${i + 1}`,
          name: t.name || 'Regular',
          price: t.price ?? 0,
          quantity: t.quantity ?? t.available ?? 0,
        }));
        setTicketTypes(
          types.length > 0
            ? types
            : [{ id: 'T1', name: 'Regular', price: 20, quantity: 50 }]
        );

        // Step 3
        setDescription(ev.description || '');
        const existingPhotos = (ev.photos || []).map((p, i) => ({
          id: `existing-${p.id || i}`,
          url: p.image,
          name: p.name || p.caption || `photo${i + 1}.png`,
          isExisting: true,
        }));
        setPhotos(existingPhotos);

        setError('');
      } catch (err) {
        console.error('Error loading event:', err);
        setError('Could not load event. It may not exist.');
      } finally {
        setLoading(false);
      }
    };

    if (id) loadEvent();
  }, [id]);

  // ============================================
  // STEP 1 HANDLERS
  // ============================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCapacityChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setFormData(prev => ({ ...prev, capacity: value }));
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (formData.categories.includes(trimmed)) {
      setError('Category already added');
      return;
    }
    setFormData(prev => ({
      ...prev,
      categories: [...prev.categories, trimmed]
    }));
    setNewCategory('');
    setError('');
  };

  const handleRemoveCategory = (cat) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== cat)
    }));
  };

  const handleCategoryKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCategory();
    }
  };

  // ============================================
  // STEP 2 HANDLERS
  // ============================================
  const handleAddTicketType = () => {
    setTicketTypes(prev => {
      const nextId = `T${prev.length + 1}`;
      return [
        ...prev,
        { id: nextId, name: 'Regular', price: 20, quantity: 50 }
      ];
    });
  };

  const handleRemoveTicketType = (index) => {
    setTicketTypes(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((t, i) => ({
        ...t,
        id: `T${i + 1}`
      }));
    });
  };

  const handleTicketChange = (index, field, value) => {
    setTicketTypes(prev => prev.map((t, i) => {
      if (i !== index) return t;
      if (field === 'price' || field === 'quantity') {
        return { ...t, [field]: value === '' ? '' : Number(value) };
      }
      return { ...t, [field]: value };
    }));
  };

  // ============================================
  // STEP 3 HANDLERS
  // ============================================
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    const newPhotos = filesToAdd.map((file, idx) => ({
      id: `new-${Date.now()}-${idx}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      isExisting: false,
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
    setError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (photoId) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      // Revoke μόνο αν είναι blob URL (νέο upload)
      if (photo?.url && photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
      return prev.filter(p => p.id !== photoId);
    });
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  // ============================================
  // VALIDATION
  // ============================================
  const validateStep1 = () => {
    if (!formData.title.trim()) return 'Title is required';
    if (!formData.event_type.trim()) return 'Event Type is required';
    if (!formData.venue.trim()) return 'Venue is required';
    if (!formData.address.trim()) return 'Address is required';
    if (!formData.city.trim()) return 'City is required';
    if (!formData.country.trim()) return 'Country is required';
    if (!formData.capacity || formData.capacity <= 0) return 'Capacity must be > 0';
    if (formData.categories.length === 0) return 'Add at least one category';
    if (!formData.start_datetime) return 'Start date is required';
    if (!formData.end_datetime) return 'End date is required';
    if (new Date(formData.start_datetime) >= new Date(formData.end_datetime)) {
      return 'End date must be after start date';
    }
    return null;
  };

  const validateStep2 = () => {
    if (ticketTypes.length === 0) return 'Add at least one ticket type';
    for (const t of ticketTypes) {
      if (!t.name?.trim()) return 'All ticket types need a name';
      if (!t.price || Number(t.price) <= 0) return 'Ticket price must be > 0';
      if (!t.quantity || Number(t.quantity) <= 0) return 'Ticket quantity must be > 0';
    }
    const totalTickets = ticketTypes.reduce(
      (sum, t) => sum + (Number(t.quantity) || 0), 0
    );
    if (totalTickets > formData.capacity) {
      return `Total tickets (${totalTickets}) exceed capacity (${formData.capacity})`;
    }
    return null;
  };

  // ============================================
  // NAVIGATION
  // ============================================
  const handleNext = () => {
    setError('');
    if (currentStep === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
      setCurrentStep(3);
      return;
    }
    if (currentStep === 3) {
      setIsPreview(true);
      return;
    }
  };

  const handleBack = () => {
    setError('');
    if (isPreview) {
      setIsPreview(false);
      setCurrentStep(3);
      return;
    }
    if (currentStep === 1) {
      navigate(`/profile/events/${id}`);
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  const handleStepClick = (stepId) => {
    if (stepId < currentStep || isPreview) {
      setError('');
      setIsPreview(false);
      setCurrentStep(stepId);
    }
  };

  const handleEditFromPreview = () => {
    setIsPreview(false);
    setCurrentStep(1);
  };

  // ============================================
  // SUBMIT (Update)
  // ============================================
  const handleSubmit = async (publish = false) => {
    setError('');
    const err1 = validateStep1();
    if (err1) {
      setError(err1);
      setIsPreview(false);
      setCurrentStep(1);
      return;
    }
    const err2 = validateStep2();
    if (err2) {
      setError(err2);
      setIsPreview(false);
      setCurrentStep(2);
      return;
    }

    setSubmitting(true);
    try {
      // Διατήρησε τις existing photos ως URLs, τα νέα ως blobs
      const photoPayload = photos.map((p, i) => ({
        id: i + 1,
        image: p.url,
        name: p.name,
        caption: ''
      }));

      const payload = {
        ...formData,
        title: formData.title.trim(),
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        description,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        organizer: {
          id: user?.id,
          username: user?.username,
          first_name: user?.first_name,
          last_name: user?.last_name
        },
        ticket_types: ticketTypes.map((t) => ({
          ticket_type_id: t.id,
          name: t.name,
          price: Number(t.price),
          quantity: Number(t.quantity),
          available: Number(t.quantity)
        })),
        photos: photoPayload,
      };

      await eventService.updateEvent(id, payload);
      navigate(`/profile/events/${id}`);
    } catch (err) {
      console.error('Error updating event:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  const renderStepper = () => {
    const displayStep = isPreview ? 4 : currentStep;

    return (
      <div className="stepper">
        {STEPS.map((step, idx) => {
          const isActive = !isPreview && step.id === currentStep;
          const isCompleted = isPreview || step.id < displayStep;
          const isClickable = isPreview || step.id < currentStep;

          return (
            <React.Fragment key={step.id}>
              <div
                className={`stepper-circle ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
                onClick={() => isClickable && handleStepClick(step.id)}
              >
                {isCompleted ? <CheckIcon className="stepper-check" /> : step.id}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`stepper-line ${isCompleted ? 'completed' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ============================================
  // RENDER STEP 1
  // ============================================
  const renderStep1 = () => (
    <div className="step-content">
      <h2 className="step-title">Event Details</h2>

      <div className="step-grid">
        <div className="step-column">
          <div className="form-row">
            <label>ID:</label>
            <input
              type="text"
              name="event_id"
              value={formData.event_id || 'Auto-generated'}
              disabled
              className="input-disabled"
            />
          </div>

          <div className="form-row">
            <label>Title:</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Title"
            />
          </div>

          <div className="form-row">
            <label>Type:</label>
            <input
              type="text"
              name="event_type"
              value={formData.event_type}
              onChange={handleChange}
              placeholder="Type"
            />
          </div>

          <div className="form-row">
            <label>Venue:</label>
            <input
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              placeholder="Venue"
            />
          </div>

          <div className="form-row">
            <label>Address:</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Address"
            />
          </div>

          <div className="form-row">
            <label>City:</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City"
            />
          </div>

          <div className="form-row">
            <label>Country:</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Country"
            />
          </div>

          <div className="form-row">
            <label>Capacity:</label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleCapacityChange}
              min="1"
              placeholder="150"
            />
          </div>
        </div>

        <div className="step-column">
          <div className="form-row two-inputs">
            <label>Latitude:</label>
            <input
              type="text"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="Latitude"
            />
          </div>

          <div className="form-row two-inputs">
            <label>Longitude:</label>
            <input
              type="text"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="Longitude"
            />
          </div>

          <div className="datetime-section">
            <div className="datetime-label">Date and Time:</div>

            <div className="form-row date-row">
              <label>START:</label>
              <input
                type="datetime-local"
                name="start_datetime"
                value={formData.start_datetime}
                onChange={handleChange}
                className="datetime-input"
              />
            </div>

            <div className="form-row date-row">
              <label>END:</label>
              <input
                type="datetime-local"
                name="end_datetime"
                value={formData.end_datetime}
                onChange={handleChange}
                className="datetime-input"
              />
            </div>
          </div>

          <div className="categories-section">
            <div className="form-row">
              <label>Category:</label>
              <div className="category-input-wrapper">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={handleCategoryKeyDown}
                  placeholder="Category"
                />
              </div>
            </div>

            {formData.categories.map((cat, idx) => (
              <div key={idx} className="category-tag-row">
                <div className="form-row category-display">
                  <label>Category:</label>
                  <div className="category-tag">
                    <span>{cat}</span>
                    <button
                      type="button"
                      className="btn-remove-category"
                      onClick={() => handleRemoveCategory(cat)}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="add-category-wrapper">
              <button
                type="button"
                className="btn-add-category"
                onClick={handleAddCategory}
                disabled={!newCategory.trim()}
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER STEP 2
  // ============================================
  const renderStep2 = () => {
    const totalTickets = ticketTypes.reduce(
      (sum, t) => sum + (Number(t.quantity) || 0),
      0
    );
    const remaining = formData.capacity - totalTickets;
    const isOverCapacity = remaining < 0;

    return (
      <div className="step-content">
        <h2 className="step-title">Ticket Types</h2>

        <div className={`capacity-info ${isOverCapacity ? 'over' : ''}`}>
          <span>Capacity: <strong>{formData.capacity}</strong></span>
          <span className="capacity-sep">•</span>
          <span>Tickets allocated: <strong>{totalTickets}</strong></span>
          <span className="capacity-sep">•</span>
          <span className={isOverCapacity ? 'capacity-error' : 'capacity-ok'}>
            {isOverCapacity
              ? `Over by ${Math.abs(remaining)}`
              : `Remaining: ${remaining}`}
          </span>
        </div>

        <div className="ticket-types-list">
          {ticketTypes.map((ticket, index) => (
            <div key={index} className="ticket-type-row">
              <div className="ticket-field id-field">
                <label>ID:</label>
                <input
                  type="text"
                  value={ticket.id}
                  disabled
                  className="input-disabled"
                />
              </div>

              <div className="ticket-field name-field">
                <label>Name:</label>
                <select
                  value={ticket.name}
                  onChange={(e) => handleTicketChange(index, 'name', e.target.value)}
                  className="ticket-select"
                >
                  <option value="Regular">Regular</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>

              <div className="ticket-field">
                <label>Price:</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ticket.price}
                  onChange={(e) => handleTicketChange(index, 'price', e.target.value)}
                  placeholder="20.00"
                />
              </div>

              <div className="ticket-field">
                <label>Quantity:</label>
                <input
                  type="number"
                  min="1"
                  value={ticket.quantity}
                  onChange={(e) => handleTicketChange(index, 'quantity', e.target.value)}
                  placeholder="50"
                />
              </div>

              <div className="ticket-field">
                <label>Available:</label>
                <input
                  type="number"
                  value={ticket.quantity}
                  disabled
                  className="input-disabled"
                />
              </div>

              {ticketTypes.length > 1 && (
                <button
                  type="button"
                  className="btn-remove-ticket"
                  onClick={() => handleRemoveTicketType(index)}
                  title="Remove ticket type"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="add-ticket-wrapper">
          <button
            type="button"
            className="btn-add-ticket"
            onClick={handleAddTicketType}
            disabled={remaining <= 0}
            title={remaining <= 0 ? 'Capacity is full' : 'Add another ticket type'}
          >
            Add Ticket Type
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER STEP 3
  // ============================================
  const renderStep3 = () => {
    const organizerName = user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || 'Organizer';

    return (
      <div className="step-content">
        <h2 className="step-title">Event Info</h2>

        <div className="event-info-grid">
          <div className="event-info-left">
            <div className="form-row">
              <label>Organizer:</label>
              <input
                type="text"
                value={organizerName}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="description-section">
              <label className="description-label">Description:</label>
              <div className="description-wrapper">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                  placeholder="Write a description for your event..."
                  className="description-textarea"
                  maxLength={MAX_DESCRIPTION}
                />
                <div className="char-counter">
                  {description.length} / {MAX_DESCRIPTION}
                </div>
              </div>
            </div>
          </div>

          <div className="event-info-right">
            <div className="media-header">
              <label className="media-label">Media / Photo:</label>
              <button
                type="button"
                className="btn-choose-file"
                onClick={handleChooseFileClick}
                disabled={photos.length >= MAX_PHOTOS}
              >
                Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            <div className="media-list-wrapper">
              {photos.length === 0 ? (
                <div className="media-empty">
                  <p>No files selected</p>
                  <p className="media-hint">Click "Choose File" to add images</p>
                </div>
              ) : (
                <div className="media-list">
                  {photos.map((photo) => (
                    <div key={photo.id} className="media-item">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="media-thumb"
                      />
                      <span className="media-name" title={photo.name}>
                        {photo.name}
                      </span>
                      <button
                        type="button"
                        className="btn-remove-photo"
                        onClick={() => handleRemovePhoto(photo.id)}
                        title="Remove"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="media-counter">
                {photos.length} / {MAX_PHOTOS}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER PREVIEW
  // ============================================
  const renderPreview = () => {
    const organizerName = user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || 'Organizer';

    return (
      <div className="preview-content">
        <section className="preview-section">
          <h2 className="preview-section-title">Event Details</h2>
          <div className="preview-details-grid">
            <div className="preview-col">
              <div className="preview-row">
                <span className="preview-label">ID:</span>
                <span className="preview-value">{formData.event_id || 'Default'}</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">Title:</span>
                <span className="preview-value">{formData.title || '—'}</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">Type:</span>
                <span className="preview-value">{formData.event_type || '—'}</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">Capacity:</span>
                <span className="preview-value">{formData.capacity}</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">Category:</span>
                <span className="preview-value">
                  {formData.categories.length > 0
                    ? formData.categories.join(', ')
                    : '—'}
                </span>
              </div>
            </div>

            <div className="preview-col">
              <div className="preview-row">
                <span className="preview-label">Venue:</span>
                <span className="preview-value">{formData.venue || '—'}</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">Address:</span>
                <span className="preview-value">{formData.address || '—'}</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">City:</span>
                <span className="preview-value">{formData.city || '—'}</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">Country:</span>
                <span className="preview-value">{formData.country || '—'}</span>
              </div>
            </div>

            <div className="preview-col">
              <div className="preview-row-inline">
                <div className="preview-row-mini">
                  <span className="preview-label">Latitude:</span>
                  <span className="preview-value">{formData.latitude || '—'}</span>
                </div>
                <div className="preview-row-mini">
                  <span className="preview-label">Longitude:</span>
                  <span className="preview-value">{formData.longitude || '—'}</span>
                </div>
              </div>
              <div className="preview-row">
                <span className="preview-label">Date and Time:</span>
              </div>
              <div className="preview-row preview-row-indent">
                <span className="preview-label">Start:</span>
                <span className="preview-value">{formatDateTime(formData.start_datetime)}</span>
              </div>
              <div className="preview-row preview-row-indent">
                <span className="preview-label">End:</span>
                <span className="preview-value">{formatDateTime(formData.end_datetime)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="preview-section">
          <h2 className="preview-section-title">Ticket Types</h2>
          <div className="preview-tickets">
            {ticketTypes.map((t, idx) => (
              <div key={idx} className="preview-ticket-row">
                <div className="preview-ticket-field">
                  <span className="preview-label">ID:</span>
                  <span className="preview-value">{t.id}</span>
                </div>
                <div className="preview-ticket-field">
                  <span className="preview-label">Name:</span>
                  <span className="preview-value">{t.name}</span>
                </div>
                <div className="preview-ticket-field">
                  <span className="preview-label">Price:</span>
                  <span className="preview-value">${Number(t.price).toFixed(2)}</span>
                </div>
                <div className="preview-ticket-field">
                  <span className="preview-label">Quantity:</span>
                  <span className="preview-value">{t.quantity}</span>
                </div>
                <div className="preview-ticket-field">
                  <span className="preview-label">Available:</span>
                  <span className="preview-value">{t.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="preview-section">
          <h2 className="preview-section-title">Event Info</h2>
          <div className="preview-info-grid">
            <div className="preview-info-left">
              <div className="preview-row">
                <span className="preview-label">Organizer:</span>
                <span className="preview-value">{organizerName}</span>
              </div>
              <div className="preview-description">
                <span className="preview-label">Description:</span>
                <p className="preview-description-text">
                  {description || 'No description provided.'}
                </p>
              </div>
            </div>

            <div className="preview-info-right">
              <span className="preview-label">Media / Photo:</span>
              {photos.length === 0 ? (
                <p className="preview-no-photos">No photos</p>
              ) : (
                <div className="preview-photo-list">
                  {photos.map((p) => (
                    <div key={p.id} className="preview-photo-item">
                      <img src={p.url} alt={p.name} className="preview-photo-thumb" />
                      <span className="preview-photo-name">{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  };

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return (
      <div className="create-event-page">
        <div className="create-event-container">
          <div className="new-message-loading" style={{ padding: '60px 0', textAlign: 'center', color: '#6c7a89' }}>
            <div className="loading-spinner" style={{
              width: 40, height: 40, border: '3px solid #333',
              borderTop: '3px solid #4a90d9', borderRadius: '50%',
              animation: 'spin 1s linear infinite', margin: '0 auto 16px'
            }}></div>
            <p>Loading event...</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="create-event-page">
      <div className="create-event-container">
        <div className="create-event-header">
          <button className="btn-back" onClick={handleBack}>
            <ArrowBackIcon />
          </button>
          <h1>{isPreview ? 'Preview Changes' : 'Edit Event'}</h1>

          {isPreview && (
            <button
              className="btn-edit-preview"
              onClick={handleEditFromPreview}
            >
              <EditIcon /> Edit
            </button>
          )}
        </div>

        {renderStepper()}

        {error && (
          <div className="create-event-error">
            {error}
          </div>
        )}

        <div className="step-content-wrapper">
          {!isPreview && currentStep === 1 && renderStep1()}
          {!isPreview && currentStep === 2 && renderStep2()}
          {!isPreview && currentStep === 3 && renderStep3()}
          {isPreview && renderPreview()}
        </div>

        <div className="create-event-actions">
          {isPreview && (
            <>
              <button
                type="button"
                className="btn-cancel-preview"
                onClick={() => navigate(`/profile/events/${id}`)}
                disabled={submitting}
              >
                Cancel
              </button>
              <div className="actions-right">
                <button
                  type="button"
                  className="btn-publish"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                >
                  {submitting ? 'Updating...' : 'Submit'}
                </button>
                <button
                  type="button"
                  className="btn-save-draft"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save as Draft'}
                </button>
              </div>
            </>
          )}

          {!isPreview && (
            <>
              {currentStep > 1 && (
                <button
                  type="button"
                  className="btn-prev"
                  onClick={handleBack}
                  disabled={submitting}
                >
                  Previous
                </button>
              )}

              <div className="actions-right">
                {currentStep < 3 ? (
                  <button
                    type="button"
                    className="btn-next"
                    onClick={handleNext}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-next"
                    onClick={handleNext}
                  >
                    Preview
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditEvent;