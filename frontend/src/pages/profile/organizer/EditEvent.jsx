// src/pages/profile/organizer/EditEvent.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { eventService, categoryService } from '../../../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './CreateEvent.css';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const STEPS = [
  { id: 1, label: 'Event Details' },
  { id: 2, label: 'Tickets' },
  { id: 3, label: 'Photos & Description' },
];

const MAX_DESCRIPTION = 4096;  // set max limit of charactes to 4096
const MAX_PHOTOS = 20;

const EVENT_TYPES = [
  { value: 'CONCERT',    label: 'Concert' },
  { value: 'SEMINAR',    label: 'Seminar' },
  { value: 'THEATER',    label: 'Theater' },
  { value: 'CONFERENCE', label: 'Conference' },
  { value: 'SPORTS',     label: 'Sports' },
  { value: 'OTHER',      label: 'Other' },
];

const getEventTypeLabel = (value) =>
  EVENT_TYPES.find(t => t.value === value)?.label || value || '—';

const dateStrToObj = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

const dateObjToStr = (date) => {
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const splitDateTime = (value) => {
  if (!value) return { date: '', hour: '', minute: '' };
  const d = new Date(value);
  if (isNaN(d.getTime())) return { date: '', hour: '', minute: '' };
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hour: pad(d.getHours()),
    minute: pad(d.getMinutes()),
  };
};

const joinDateTime = (date, hour, minute) => {
  if (!date || !hour || !minute) return '';
  return `${date}T${hour}:${minute}`;
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const blockTyping = (e) => {
  const allowedKeys = [
    'Tab', 'Escape',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End', 'Enter'
  ];
  if (!allowedKeys.includes(e.key)) {
    e.preventDefault();
  }
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
    categories: [],
  });

  const [startParts, setStartParts] = useState({ date: '', hour: '', minute: '' });
  const [endParts,   setEndParts]   = useState({ date: '', hour: '', minute: '' });

  const [newCategory, setNewCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [ticketTypes, setTicketTypes] = useState([]);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await categoryService.getCategories();
        setAvailableCategories(response.data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      try {
        const response = await eventService.getEvent(id);
        const ev = response.data;

        const categoryNames = (ev.categories || [])
          .map(c => (typeof c === 'string' ? c : c.name))
          .filter(Boolean);

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
          categories: categoryNames,
        });

        setStartParts(splitDateTime(ev.start_datetime));
        setEndParts(splitDateTime(ev.end_datetime));

        const types = (ev.ticket_types || []).map((t, i) => {
          const quantity = t.quantity ?? t.available ?? 0;
          const available = t.available ?? quantity;
          return {
            pk: t.id,
            id: t.ticket_type_id || `T${i + 1}`,
            name: t.name || 'Regular',
            price: t.price ?? 0,
            quantity: quantity,
            originalQuantity: quantity,
            originalAvailable: available,
          };
        });

        setTicketTypes(
          types.length > 0
            ? types
            : [{ id: 'T1', name: 'Regular', price: 20, quantity: 50 }]
        );

        setDescription(ev.description || '');

        const existingPhotos = (ev.photos || []).map((p, i) => ({
          pk: p.id,
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCapacityChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setFormData(prev => ({ ...prev, capacity: value }));
  };

  const handleDateTimeChange = (field, part, value) => {
    if (field === 'start_datetime') {
      setStartParts(prev => ({ ...prev, [part]: value }));
    } else {
      setEndParts(prev => ({ ...prev, [part]: value }));
    }
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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    const newPhotos = filesToAdd.map((file) => ({
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
      const photo = prev.find(p => p === photoId || p.id === photoId || p.name === photoId);
      if (photo?.url && photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
      return prev.filter(p => p !== photo && p.pk !== photoId);
    });
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const validateStep1 = () => {
    if (!formData.title.trim()) return 'Title is required';
    if (!formData.event_type.trim()) return 'Event Type is required';
    if (!formData.venue.trim()) return 'Venue is required';
    if (!formData.address.trim()) return 'Address is required';
    if (!formData.city.trim()) return 'City is required';
    if (!formData.country.trim()) return 'Country is required';
    if (!formData.capacity || formData.capacity <= 0) return 'Capacity must be > 0';
    if (formData.categories.length === 0) return 'Add at least one category';

    if (!startParts.date || !startParts.hour || !startParts.minute) {
      return 'Start date and time are required';
    }
    if (!endParts.date || !endParts.hour || !endParts.minute) {
      return 'End date and time are required';
    }

    const startStr = joinDateTime(startParts.date, startParts.hour, startParts.minute);
    const endStr   = joinDateTime(endParts.date,   endParts.hour,   endParts.minute);

    if (new Date(startStr) >= new Date(endStr)) {
      return 'End date must be after start date';
    }
    if (new Date(startStr) <= new Date())
      return 'Start date and time must be in the future';

    return null;
  };

  const validateStep2 = () => {
    if (ticketTypes.length === 0) return 'Add at least one ticket type';
    for (const t of ticketTypes) {
      const originalQuantity = t.originalQuantity ?? t.quantity;
      const originalAvailable = t.originalAvailable ?? t.quantity;
      const booked = originalQuantity - originalAvailable;

      if (Number(t.quantity) < booked) {
        return `Cannot set "${t.name}" quantity to ${t.quantity}. ${booked} tickets are already booked.`;
      }
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

    const names = ticketTypes.map(t => t.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) 
      return 'Ticket type names must be different';

    return null;
  };

  const validateStep3 = () => {
    if(description.length > MAX_DESCRIPTION)
      return `Description has to be shorter. The max number of characters is: ${MAX_DESCRIPTION} .`;
    return null;
  }

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
      const err = validateStep3();
      if (err) { setError(err); return; }
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

  const handleSubmit = async (publish = false) => {
    setError('');
    const err1 = validateStep1();
    if (err1) { setError(err1); setIsPreview(false); setCurrentStep(1); return; }
    const err2 = validateStep2();
    if (err2) { setError(err2); setIsPreview(false); setCurrentStep(2); return; }

    setSubmitting(true);
    try {
      const startStr = joinDateTime(startParts.date, startParts.hour, startParts.minute);
      const endStr   = joinDateTime(endParts.date,   endParts.hour,   endParts.minute);

      const ticketPayload = ticketTypes.map((t) => {
        const newQuantity = Number(t.quantity);

        const item = {
          name: t.name,
          price: Number(t.price),
          quantity: newQuantity,
        };

        if (t.pk != null) item.pk = t.pk;

        return item;
      });

      const photoPayload = photos.map((p) => {
        if (p.pk != null) {
          return { pk: p.pk, name: p.name, caption: '' };
        }
        return { file: p.file, name: p.name, caption: '' };
      });

      const payload = {
        ...formData,
        start_datetime: startStr,
        end_datetime: endStr,
        title: formData.title.trim(),
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        description,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        ticket_types: ticketPayload,
        photos: photoPayload,
      };

      await eventService.updateEvent(id, payload);
      navigate(`/profile/events/${id}`);
    } catch (err) {
      console.error('Error updating event:', err);
      setError( err.message || 'Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

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
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  const renderStep1 = () => {
    const selectableCategories = availableCategories.filter(
      cat => !formData.categories.includes(cat.name)
    );

    return (
      <div className="step-content">
        <h2 className="step-title">Event Details</h2>
        <div className="step-grid">
          <div className="step-column">
            <div className="form-row">
              <label>Title:</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Title" />
            </div>
            <div className="form-row">
              <label>Type:</label>
              <select name="event_type" value={formData.event_type} onChange={handleChange} className="category-select">
                <option value="">Select event type...</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Venue:</label>
              <input type="text" name="venue" value={formData.venue} onChange={handleChange} placeholder="Venue" />
            </div>
            <div className="form-row">
              <label>Address:</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Address" />
            </div>
            <div className="form-row">
              <label>City:</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
            </div>
            <div className="form-row">
              <label>Country:</label>
              <input type="text" name="country" value={formData.country} onChange={handleChange} placeholder="Country" />
            </div>
            <div className="form-row">
              <label>Capacity:</label>
              <input type="number" name="capacity" value={formData.capacity} onChange={handleCapacityChange} min="1" placeholder="150" />
            </div>
          </div>
          <div className="step-column">
            <div className="form-row two-inputs">
              <label>Latitude:</label>
              <input type="text" name="latitude" value={formData.latitude} onChange={handleChange} placeholder="Latitude" />
            </div>
            <div className="form-row two-inputs">
              <label>Longitude:</label>
              <input type="text" name="longitude" value={formData.longitude} onChange={handleChange} placeholder="Longitude" />
            </div>
            <div className="datetime-section">
              <div className="datetime-label">Date and Time:</div>
              <div className="form-row date-row">
                <label>START:</label>
                <div className="datetime-split">
                  <DatePicker
                    selected={dateStrToObj(startParts.date)}
                    onChange={(date) => handleDateTimeChange('start_datetime', 'date', dateObjToStr(date))}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="DD/MM/YYYY"
                    className="datetime-input"
                    minDate={new Date()}
                    isClearable
                    onKeyDown={blockTyping}
                  />
                  <select value={startParts.hour} onChange={(e) => handleDateTimeChange('start_datetime', 'hour', e.target.value)} className="datetime-input datetime-select">
                    <option value="">--</option>
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="datetime-colon">:</span>
                  <select value={startParts.minute} onChange={(e) => handleDateTimeChange('start_datetime', 'minute', e.target.value)} className="datetime-input datetime-select">
                    <option value="">--</option>
                    {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row date-row">
                <label>END:</label>
                <div className="datetime-split">
                  <DatePicker
                    selected={dateStrToObj(startParts.date)}
                    onChange={(date) => handleDateTimeChange('start_datetime', 'date', dateObjToStr(date))}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="DD/MM/YYYY"
                    className="datetime-input"
                    isClearable
                    onKeyDown={blockTyping}
                    minDate={dateStrToObj(startParts.date) || new Date()}
                  />
                  <select value={endParts.hour} onChange={(e) => handleDateTimeChange('end_datetime', 'hour', e.target.value)} className="datetime-input datetime-select">
                    <option value="">--</option>
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="datetime-colon">:</span>
                  <select value={endParts.minute} onChange={(e) => handleDateTimeChange('end_datetime', 'minute', e.target.value)} className="datetime-input datetime-select">
                    <option value="">--</option>
                    {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="categories-section">
              <div className="form-row">
                <label>Category:</label>
                <div className="category-input-wrapper">
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="category-select" disabled={loadingCategories || selectableCategories.length === 0}>
                    <option value="">
                      {loadingCategories ? 'Loading categories...' : selectableCategories.length === 0 ? 'All categories added' : 'Select a category...'}
                    </option>
                    {selectableCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {formData.categories.map((cat, idx) => (
                <div key={idx} className="category-tag-row">
                  <div className="form-row category-display">
                    <label>Category:</label>
                    <div className="category-tag">
                      <span>{cat}</span>
                      <button type="button" className="btn-remove-category" onClick={() => handleRemoveCategory(cat)}>
                        <CloseIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="add-category-wrapper">
                <button type="button" className="btn-add-category" onClick={handleAddCategory} disabled={!newCategory.trim()}>
                  Add Category
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep2 = () => {
    const totalTickets = ticketTypes.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
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
            {isOverCapacity ? `Over by ${Math.abs(remaining)}` : `Remaining: ${remaining}`}
          </span>
        </div>
        <div className="ticket-types-list">
          {ticketTypes.map((ticket, index) => (
            <div key={index} className="ticket-type-row">
              <div className="ticket-field name-field">
                <label>Name:</label>
                <input type="text" value={ticket.name} onChange={(e) => handleTicketChange(index, 'name', e.target.value)} placeholder="e.g. Regular, VIP..." />
              </div>
              <div className="ticket-field">
                <label>Price:</label>
                <input type="number" min="0" step="0.01" value={ticket.price} onChange={(e) => handleTicketChange(index, 'price', e.target.value)} placeholder="20.00" />
              </div>
              <div className="ticket-field">
                <label>Quantity:</label>
                <input type="number" min="1" value={ticket.quantity} onChange={(e) => handleTicketChange(index, 'quantity', e.target.value)} placeholder="50" />
              </div>
              <div className="ticket-field">
                <label>Available:</label>
                <input
                  type="number"
                  value={(() => {
                    const oq = ticket.originalQuantity ?? ticket.quantity;
                    const oa = ticket.originalAvailable ?? ticket.quantity;
                    return Math.max(0, Number(ticket.quantity) - (oq - oa));
                  })()}
                  disabled
                  className="input-disabled"
                />
              </div>
              {ticketTypes.length > 1 && (
                <button type="button" className="btn-remove-ticket" onClick={() => handleRemoveTicketType(index)} title="Remove ticket type">
                  <CloseIcon />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="add-ticket-wrapper">
          <button type="button" className="btn-add-ticket" onClick={handleAddTicketType} disabled={remaining <= 0}>
            Add Ticket Type
          </button>
        </div>
      </div>
    );
  };

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
              <input type="text" value={organizerName} disabled className="input-disabled" />
            </div>
            <div className="description-section">
              <label className="description-label">Description:</label>
              <div className="description-wrapper">
                <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))} placeholder="Write a description..." className="description-textarea" maxLength={MAX_DESCRIPTION} />
                <div className="char-counter">{description.length} / {MAX_DESCRIPTION}</div>
              </div>
            </div>
          </div>
          <div className="event-info-right">
            <div className="media-header">
              <label className="media-label">Media / Photo:</label>
              <button type="button" className="btn-choose-file" onClick={handleChooseFileClick} disabled={photos.length >= MAX_PHOTOS}>
                Choose File
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
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
                    <div key={photo.pk ?? photo.url} className="media-item">
                      <img src={photo.url} alt={photo.name} className="media-thumb" />
                      <span className="media-name" title={photo.name}>{photo.name}</span>
                      <button type="button" className="btn-remove-photo" onClick={() => handleRemovePhoto(photo.pk ?? photo.url)} title="Remove">
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="media-counter">{photos.length} / {MAX_PHOTOS}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    const organizerName = user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || 'Organizer';

    const startStr = joinDateTime(startParts.date, startParts.hour, startParts.minute);
    const endStr   = joinDateTime(endParts.date,   endParts.hour,   endParts.minute);

    return (
      <div className="preview-content">
        <section className="preview-section">
          <h2 className="preview-section-title">Event Details</h2>
          <div className="preview-details-grid">
            <div className="preview-col">
              <div className="preview-row"><span className="preview-label">Title:</span><span className="preview-value">{formData.title || '—'}</span></div>
              <div className="preview-row"><span className="preview-label">Type:</span><span className="preview-value">{getEventTypeLabel(formData.event_type)}</span></div>
              <div className="preview-row"><span className="preview-label">Capacity:</span><span className="preview-value">{formData.capacity}</span></div>
              <div className="preview-row"><span className="preview-label">Category:</span><span className="preview-value">{formData.categories.length > 0 ? formData.categories.join(', ') : '—'}</span></div>
            </div>
            <div className="preview-col">
              <div className="preview-row"><span className="preview-label">Venue:</span><span className="preview-value">{formData.venue || '—'}</span></div>
              <div className="preview-row"><span className="preview-label">Address:</span><span className="preview-value">{formData.address || '—'}</span></div>
              <div className="preview-row"><span className="preview-label">City:</span><span className="preview-value">{formData.city || '—'}</span></div>
              <div className="preview-row"><span className="preview-label">Country:</span><span className="preview-value">{formData.country || '—'}</span></div>
            </div>
            <div className="preview-col">
              <div className="preview-row-inline">
                <div className="preview-row-mini"><span className="preview-label">Latitude:</span><span className="preview-value">{formData.latitude || '—'}</span></div>
                <div className="preview-row-mini"><span className="preview-label">Longitude:</span><span className="preview-value">{formData.longitude || '—'}</span></div>
              </div>
              <div className="preview-row"><span className="preview-label">Date and Time:</span></div>
              <div className="preview-row preview-row-indent"><span className="preview-label">Start:</span><span className="preview-value">{formatDateTime(startStr)}</span></div>
              <div className="preview-row preview-row-indent"><span className="preview-label">End:</span><span className="preview-value">{formatDateTime(endStr)}</span></div>
            </div>
          </div>
        </section>

        <section className="preview-section">
          <h2 className="preview-section-title">Ticket Types</h2>
          <div className="preview-tickets">
            {ticketTypes.map((t, idx) => (
              <div key={idx} className="preview-ticket-row">
                <div className="preview-ticket-field"><span className="preview-label">Name:</span><span className="preview-value">{t.name}</span></div>
                <div className="preview-ticket-field"><span className="preview-label">Price:</span><span className="preview-value">${Number(t.price).toFixed(2)}</span></div>
                <div className="preview-ticket-field"><span className="preview-label">Quantity:</span><span className="preview-value">{t.quantity}</span></div>
                <div className="preview-ticket-field"><span className="preview-label">Available:</span>
                  <span className="preview-value">
                    {(() => {
                      const oq = t.originalQuantity ?? t.quantity;
                      const oa = t.originalAvailable ?? t.quantity;
                      return Math.max(0, Number(t.quantity) - (oq - oa));
                    })()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="preview-section">
          <h2 className="preview-section-title">Event Info</h2>
          <div className="preview-info-grid">
            <div className="preview-info-left">
              <div className="preview-row"><span className="preview-label">Organizer:</span><span className="preview-value">{organizerName}</span></div>
              <div className="preview-description">
                <span className="preview-label">Description:</span>
                <p className="preview-description-text">{description || 'No description provided.'}</p>
              </div>
            </div>
            <div className="preview-info-right">
              <span className="preview-label">Media / Photo:</span>
              {photos.length === 0 ? (
                <p className="preview-no-photos">No photos</p>
              ) : (
                <div className="preview-photo-list">
                  {photos.map((p) => (
                    <div key={p.pk ?? p.url} className="preview-photo-item">
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

  if (loading) {
    return (
      <div className="create-event-page">
        <div className="create-event-container">
          <LoadingSpinner message="Loading event..." />
        </div>
      </div>
    );
  }

  return (
    <div className="create-event-page">
      <div className="create-event-container">
        <div className="create-event-header">
          <button className="btn-back" onClick={handleBack}><ArrowBackIcon /></button>
          <h1>{isPreview ? 'Preview Changes' : 'Edit Event'}</h1>
          {isPreview && (
            <button className="btn-edit-preview" onClick={handleEditFromPreview}><EditIcon /> Edit</button>
          )}
        </div>

        {renderStepper()}

        {error && <div className="create-event-error">{error}</div>}

        <div className="step-content-wrapper">
          {!isPreview && currentStep === 1 && renderStep1()}
          {!isPreview && currentStep === 2 && renderStep2()}
          {!isPreview && currentStep === 3 && renderStep3()}
          {isPreview && renderPreview()}
        </div>

        <div className="create-event-actions">
          {isPreview && (
            <>
              <button type="button" className="btn-cancel-preview" onClick={() => navigate(`/profile/events/${id}`)} disabled={submitting}>Cancel</button>
              <div className="actions-right">
                <button type="button" className="btn-publish" onClick={() => handleSubmit(true)} disabled={submitting}>
                  {submitting ? 'Updating...' : 'Submit'}
                </button>
                <button type="button" className="btn-save-draft" onClick={() => handleSubmit(false)} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save as Draft'}
                </button>
              </div>
            </>
          )}

          {!isPreview && (
            <>
              {currentStep > 1 && (
                <button type="button" className="btn-prev" onClick={handleBack} disabled={submitting}>Previous</button>
              )}
              <div className="actions-right">
                {currentStep < 3 ? (
                  <button type="button" className="btn-next" onClick={handleNext}>Next</button>
                ) : (
                  <button type="button" className="btn-next" onClick={handleNext}>Preview</button>
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