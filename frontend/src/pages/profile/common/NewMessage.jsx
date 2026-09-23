// src/pages/profile/common/NewMessage.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { bookingService, eventService, messageService } from '../../../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import './NewMessage.css';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const NewMessage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // every option is one event: { value, label, mine }
  // mine = i organise it, so i also have to choose the attendee
  const [options, setOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [eventValue, setEventValue] = useState(searchParams.get('event') || '');
  const [attendees, setAttendees] = useState([]);
  const [attendeeValue, setAttendeeValue] = useState(searchParams.get('attendee') || '');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const selected = options.find((o) => o.value === eventValue);

  // the events i can write about: the ones i booked (i write to the organizer)
  // and the ones i organise (i write to one of my attendees)
  useEffect(() => {
    const load = async () => {
      try {
        const [bookings, mine] = await Promise.all([
          bookingService.getMyBookings(),
          eventService.getOrganizerEvents(user.id),
        ]);
        // a booking that was never confirmed does not count
        const booked = bookings.data
          .filter((b) => b.status !== 'PENDING')
          .map((b) => ({ value: String(b.event), label: `${b.event_title} — to the organizer`, mine: false }));
        const organised = mine.data
          .map((e) => ({ value: String(e.id), label: `${e.title} — to an attendee`, mine: true }));
        // one entry per event
        const unique = [...booked, ...organised]
          .filter((o, i, all) => all.findIndex((x) => x.value === o.value) === i)
          .sort((a, b) => a.label.localeCompare(b.label));
        setOptions(unique);
        if (eventValue && !unique.some((o) => o.value === eventValue)) {
          setEventValue('');
          setError('You can only message about an event you booked or organise.');
        }
      } catch (err) {
        setError(err.message || 'Could not load your events.');
      } finally {
        setLoadingOptions(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // for my own events i also need the list of people who booked
  useEffect(() => {
    const event = options.find((o) => o.value === eventValue);
    if (!event?.mine) {
      return;
    }
    const loadAttendees = async () => {
      try {
        const { data } = await eventService.getEventBookings(event.value);
        const people = [];
        for (const booking of data) {
          if (booking.status !== 'PENDING' && !people.some((p) => p.id === booking.attendee.id)) {
            people.push({ id: booking.attendee.id, username: booking.attendee.username });
          }
        }
        setAttendees(people);
      } catch (err) {
        setError(err.message || 'Could not load the attendees of this event.');
      }
    };
    loadAttendees();
  }, [eventValue, options]);

  const handleCancel = () => navigate('/profile?tab=messages');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await messageService.sendNewMessage({
        event: Number(eventValue),
        // only an organizer sends the attendee; an attendee writes to the organizer
        attendee: selected?.mine ? Number(attendeeValue) : undefined,
        body: body.trim(),
      });
      setSent(true);
      setTimeout(() => navigate('/profile?tab=messages'), 1200);
    } catch (err) {
      setError(err.message || 'Failed to send the message.');
    } finally {
      setSending(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="new-message-page">
        <div className="new-message-container">
          <LoadingSpinner message="Loading your events..." />
        </div>
      </div>
    );
  }

  return (
    <div className="new-message-page">
      <div className="new-message-container">
        <div className="new-message-header">
          <button className="btn-back" onClick={handleCancel}>
            <ArrowBackIcon />
          </button>
          <h1>New Message</h1>
          <button className="btn-close" onClick={handleCancel} title="Close">
            <CloseIcon />
          </button>
        </div>

        {sent && (
          <div className="new-message-success">
            ✅ Message sent successfully! Redirecting...
          </div>
        )}

        {error && <div className="new-message-error">{error}</div>}

        {options.length === 0 && (
          <div className="new-message-warning">
            <span className="warning-icon">⚠️</span>
            <div>
              <strong>Nobody to write to yet</strong>
              <p>
                You can message the organizer of an event you have booked, or an attendee
                of an event you organise. Book an event first to start a conversation.
              </p>
            </div>
          </div>
        )}

        <form className="new-message-form" onSubmit={handleSubmit}>
          <div className="new-message-form-row">
            <label htmlFor="event">About:</label>
            <select
              id="event"
              value={eventValue}
              onChange={(e) => { setEventValue(e.target.value); setAttendeeValue(''); setAttendees([]); }}
              disabled={sending || sent || options.length === 0}
            >
              <option value="">Choose an event...</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {selected?.mine && (
            <div className="new-message-form-row">
              <label htmlFor="attendee">To:</label>
              <select
                id="attendee"
                value={attendeeValue}
                onChange={(e) => setAttendeeValue(e.target.value)}
                disabled={sending || sent || attendees.length === 0}
              >
                <option value="">
                  {attendees.length === 0 ? 'Nobody has booked this event yet' : 'Choose an attendee...'}
                </option>
                {attendees.map((p) => (
                  <option key={p.id} value={p.id}>{p.username}</option>
                ))}
              </select>
            </div>
          )}

          <div className="new-message-form-row new-message-body-row">
            <label htmlFor="body">Message:</label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={12}
              maxLength={2048}
              disabled={sending || sent}
            />
          </div>

          <div className="new-message-actions">
            <button
              type="button"
              className="new-message-btn-cancel"
              onClick={handleCancel}
              disabled={sending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="new-message-btn-send"
              disabled={
                sending ||
                sent ||
                !eventValue ||
                !body.trim() ||
                (selected?.mine && !attendeeValue)
              }
            >
              <SendIcon />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewMessage;
