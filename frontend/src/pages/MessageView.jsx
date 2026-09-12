// src/pages/profile/MessageView.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { messageService } from '../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReplyIcon from '@mui/icons-material/Reply';
import ForwardIcon from '@mui/icons-material/Forward';
import DeleteIcon from '@mui/icons-material/Delete';
import './MessageView.css';

const MessageView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        setLoading(true);
        const response = await messageService.getMessage(id);
        setMessage(response.data);
        
        // Σήμανση ως read αν είναι unread
        if (!response.data.is_read) {
          await messageService.markAsRead(id);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching message:', err);
        setError('Message not found');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMessage();
    }
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleBack = () => {
    navigate('/profile');
  };

  const handleReply = () => {
    navigate(`/profile/messages/new?replyTo=${message.id}`);
  };

  const handleForward = () => {
    navigate(`/profile/messages/new?forward=${message.id}`);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await messageService.deleteMessage(message.id);
        navigate('/profile');
      } catch (err) {
        console.error('Error deleting message:', err);
        alert('Failed to delete message. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="message-view-loading">
        <div className="loading-spinner"></div>
        <p>Loading message...</p>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="message-view-error">
        <h2>Message not found</h2>
        <p>The message you are looking for does not exist.</p>
        <Link to="/profile" className="btn-back">
          <ArrowBackIcon /> Back to Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="message-view-page">
      <div className="message-view-container">
        {/* Header */}
        <div className="message-view-header">
          <button className="btn-back" onClick={handleBack}>
            <ArrowBackIcon />
          </button>
          <h1>Message</h1>
          <div className="message-view-actions">
            <button className="btn-action" onClick={handleReply} title="Reply">
              <ReplyIcon /> Reply
            </button>
            <button className="btn-action" onClick={handleForward} title="Forward">
              <ForwardIcon /> Forward
            </button>
            <button className="btn-action delete" onClick={handleDelete} title="Delete">
              <DeleteIcon /> Delete
            </button>
          </div>
        </div>

        {/* Message Content */}
        <div className="message-view-content">
          {/* Sender Info */}
          <div className="message-view-sender">
            <div className="sender-avatar-large">
              {message.sender_name?.charAt(0) || 'U'}
            </div>
            <div className="sender-info">
              <div className="sender-name-large">{message.sender_name}</div>
              <div className="sender-username">@{message.sender_username}</div>
            </div>
            <div className="message-date-large">
              {formatDate(message.created_at)}
            </div>
          </div>

          {/* Subject */}
          <div className="message-view-subject">
            <h2>{message.subject || '(no subject)'}</h2>
          </div>

          {/* Body */}
          <div className="message-view-body">
            <p>{message.body}</p>
          </div>

          {/* Attachments (αν υπάρχουν) */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="message-view-attachments">
              <h4>Attachments</h4>
              {message.attachments.map((att, index) => (
                <a key={index} href={att.url} className="attachment-item">
                  📎 {att.name}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="message-view-footer">
          <button className="btn-action-secondary" onClick={handleReply}>
            <ReplyIcon /> Reply
          </button>
          <button className="btn-action-secondary" onClick={handleForward}>
            <ForwardIcon /> Forward
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageView;