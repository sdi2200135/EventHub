// src/pages/profile/common/NewMessage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { messageService } from '../../../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import './NewMessage.css';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const NewMessage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const replyToId = searchParams.get('replyTo');
  const forwardId = searchParams.get('forward');
  const draftIdParam = searchParams.get('draftId');

  const [mode, setMode] = useState('new');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null); // 'sent' | 'draft' | null
  const [recipients, setRecipients] = useState([]);
  const [draftId, setDraftId] = useState(null);

  // ============================================
  // 1. ΦΟΡΤΩΣΗ ΠΑΡΑΛΗΠΤΩΝ
  // ============================================
  useEffect(() => {
    const fetchRecipients = async () => {
      try {
        const response = await messageService.getRecipients(user?.id);
        setRecipients(response.data || []);
      } catch (err) {
        console.error('Error fetching recipients:', err);
      }
    };
    if (user?.id) {
      fetchRecipients();
    }
  }, [user?.id]);

  // ============================================
  // 2. REPLY MODE
  // ============================================
  useEffect(() => {
    const loadReply = async () => {
      if (!replyToId) return;
      setMode('reply');
      setLoadingOriginal(true);
      try {
        const response = await messageService.getMessage(replyToId);
        const original = response.data;
        setRecipient(original.sender_username || '');
        setSubject(
          original.subject?.startsWith('Re:')
            ? original.subject
            : `Re: ${original.subject || ''}`
        );
        setBody(
          `\n\n--- Original message ---\nFrom: ${original.sender_name} (@${original.sender_username})\nDate: ${formatDate(original.created_at)}\n\n${original.body}`
        );
      } catch (err) {
        console.error('Error loading reply target:', err);
        setError('Could not load the original message.');
      } finally {
        setLoadingOriginal(false);
      }
    };
    loadReply();
  }, [replyToId]);

  // ============================================
  // 3. FORWARD MODE
  // ============================================
  useEffect(() => {
    const loadForward = async () => {
      if (!forwardId) return;
      setMode('forward');
      setLoadingOriginal(true);
      try {
        const response = await messageService.getMessage(forwardId);
        const original = response.data;
        setRecipient('');
        setSubject(
          original.subject?.startsWith('Fwd:')
            ? original.subject
            : `Fwd: ${original.subject || ''}`
        );
        setBody(
          `\n\n--- Forwarded message ---\nFrom: ${original.sender_name} (@${original.sender_username})\nDate: ${formatDate(original.created_at)}\nSubject: ${original.subject || '(no subject)'}\n\n${original.body}`
        );
      } catch (err) {
        console.error('Error loading forward target:', err);
        setError('Could not load the message to forward.');
      } finally {
        setLoadingOriginal(false);
      }
    };
    loadForward();
  }, [forwardId]);

  // ============================================
  // 4. DRAFT EDIT MODE
  // ============================================
  useEffect(() => {
    const loadDraft = async () => {
      if (!draftIdParam) return;
      setMode('draft-edit');
      setLoadingOriginal(true);
      try {
        const response = await messageService.getMessage(draftIdParam);
        const draft = response.data;
        setDraftId(draft.id);
        setRecipient(draft.recipient_username || '');
        setSubject(draft.subject || '');
        setBody(draft.body || '');
      } catch (err) {
        console.error('Error loading draft:', err);
        setError('Could not load the draft.');
      } finally {
        setLoadingOriginal(false);
      }
    };
    loadDraft();
  }, [draftIdParam]);

  // ============================================
  // HELPERS
  // ============================================
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTitle = () => {
    switch (mode) {
      case 'reply': return 'Reply to Message';
      case 'forward': return 'Forward Message';
      case 'draft-edit': return 'Edit Draft';
      default: return 'New Message';
    }
  };

  // ============================================
  // SUBMIT (Send)
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!recipient.trim()) {
      setError('Please choose a recipient.');
      return;
    }
    if (!body.trim()) {
      setError('Please write a message.');
      return;
    }

    const foundRecipient = recipients.find(
      r => r.username.toLowerCase() === recipient.trim().toLowerCase()
    );

    // ---- ΑΥΣΤΗΡΟ VALIDATION ----
    // Σε mode 'new' ή 'forward', ο recipient πρέπει να είναι στη λίστα.
    // Στο 'reply' επιτρέπεται πάντα (απαντάς σε όποιον σου έστειλε).
    // Στο 'draft-edit' αν ο recipient δεν είναι valid, το επιτρέπουμε (κρατάει historical draft).
    if ((mode === 'new' || mode === 'forward') && !foundRecipient) {
      setError('You can only message users you have an active booking with.');
      return;
    }

    setLoading(true);
    try {
      await messageService.createMessage({
        draftId: draftId,
        sender_id: user?.id,
        sender_username: user?.username,
        sender_name:
          `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
          user?.username,
        recipient_username: recipient.trim(),
        recipient_id: foundRecipient?.id || null,
        subject: subject.trim() || '(no subject)',
        body: body.trim(),
      });
      setSuccess('sent');
      setTimeout(() => {
        navigate('/profile?tab=messages');
      }, 1500);
    } catch (err) {
      console.error('Error sending message:', err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to send message. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SAVE AS DRAFT
  // ============================================
  const handleSaveDraft = async () => {
    const foundRecipient = recipients.find(
      r => r.username.toLowerCase() === recipient.trim().toLowerCase()
    );

    setSavingDraft(true);
    setError('');
    try {
      const response = await messageService.saveDraft({
        draftId: draftId,
        sender_id: user?.id,
        sender_username: user?.username,
        sender_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username,
        recipient_username: recipient.trim(),
        recipient_id: foundRecipient?.id || null,
        subject: subject.trim(),
        body: body.trim(),
      });
      setDraftId(response.data.id);
      setSuccess('draft');
      setTimeout(() => {
        navigate('/profile?tab=messages');
      }, 1200);
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Failed to save draft. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleCancel = () => {
    navigate('/profile?tab=messages');
  };

  // ============================================
  // RENDER
  // ============================================
  if (loadingOriginal) {
    return (
      <div className="new-message-page">
        <div className="new-message-container">
          <LoadingSpinner message="Loading message..." />
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
          <h1>{getTitle()}</h1>
          <button
            className="btn-close"
            onClick={handleCancel}
            title="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {success === 'sent' && (
          <div className="new-message-success">
            ✅ Message sent successfully! Redirecting...
          </div>
        )}

        {success === 'draft' && (
          <div className="new-message-success">
            💾 Draft saved! Redirecting...
          </div>
        )}

        {error && (
          <div className="new-message-error">
            {error}
          </div>
        )}

        {/* Warning όταν δεν υπάρχουν recipients */}
        {recipients.length === 0 && mode === 'new' && !loadingOriginal && (
          <div className="new-message-warning">
            <span className="warning-icon">⚠️</span>
            <div>
              <strong>No recipients available</strong>
              <p>
                You can only send messages to users you have an active booking with.
                Book an event first to start a conversation.
              </p>
            </div>
          </div>
        )}

        <form className="new-message-form" onSubmit={handleSubmit}>
          <div className="new-message-form-row">
            <label htmlFor="recipient">To:</label>
            <input
              type="text"
              id="recipient"
              list="recipients-list"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={
                recipients.length === 0 && mode === 'new'
                  ? 'No available recipients'
                  : 'Type or select a username...'
              }
              autoComplete="off"
              disabled={
                loading ||
                savingDraft ||
                success ||
                (recipients.length === 0 && mode === 'new')
              }
            />
            <datalist id="recipients-list">
              {recipients.map(r => (
                <option key={r.id} value={r.username}>
                  {r.name} ({r.role})
                </option>
              ))}
            </datalist>
          </div>

          <div className="new-message-form-row">
            <label htmlFor="subject">Subject:</label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="(no subject)"
              disabled={loading || savingDraft || success}
            />
          </div>

          <div className="new-message-form-row new-message-body-row">
            <label htmlFor="body">Message:</label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={12}
              disabled={loading || savingDraft || success}
            />
          </div>

          <div className="new-message-actions">
            <button
              type="button"
              className="new-message-btn-cancel"
              onClick={handleCancel}
              disabled={loading || savingDraft}
            >
              Cancel
            </button>
            <button
              type="button"
              className="new-message-btn-save-draft"
              onClick={handleSaveDraft}
              disabled={
                loading ||
                savingDraft ||
                success ||
                (recipients.length === 0 && mode === 'new')
              }
            >
              <SaveIcon />
              {savingDraft ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="submit"
              className="new-message-btn-send"
              disabled={
                loading ||
                savingDraft ||
                success ||
                !body.trim() ||
                !recipient.trim() ||
                (recipients.length === 0 && mode === 'new')
              }
            >
              <SendIcon />
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewMessage;