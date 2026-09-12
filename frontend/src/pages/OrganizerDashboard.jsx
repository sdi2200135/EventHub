// src/pages/profile/OrganizerDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { messageService } from '../services/api';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import './Dashboard.css';
import MyEvents from './MyEvents';

const OrganizerDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Message folders & state
  const [activeFolder, setActiveFolder] = useState('incoming');
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openedMessage, setOpenedMessage] = useState(null);
  const [loadingOpened, setLoadingOpened] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchMessages();
    }
  }, [activeTab, activeFolder]);

  const fetchUnreadCount = async () => {
    try {
      const response = await messageService.getUnreadCount(user?.id);
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const response = await messageService.getMyMessages();
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleOpenMessage = async (messageId) => {
    try {
      setLoadingOpened(true);
      const response = await messageService.getMessage(messageId);
      setOpenedMessage(response.data);
      setReplyText('');
      if (!response.data.is_read) {
        await messageService.markAsRead(messageId);
        setMessages(prev =>
          prev.map(m => m.id === messageId ? { ...m, is_read: true } : m)
        );
        fetchUnreadCount();
      }
    } catch (err) {
      console.error('Error fetching message:', err);
    } finally {
      setLoadingOpened(false);
    }
  };

  const handleCloseOpenedMessage = () => {
    setOpenedMessage(null);
    setReplyText('');
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !openedMessage) return;
    setSendingReply(true);
    try {
      await messageService.createMessage({
        sender_id: user?.id,
        sender_username: user?.username,
        sender_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
        recipient: openedMessage.sender_username,
        recipient_username: openedMessage.sender_username,
        recipient_id: openedMessage.sender_id,
        subject: `Re: ${openedMessage.subject || ''}`,
        body: replyText.trim(),
      });
      setReplyText('');
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Failed to send reply. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleSelectMessage = (messageId) => {
    setSelectedMessages(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMessages.length === filteredMessages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(filteredMessages.map(m => m.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMessages.length === 0) return;

    const isTrashFolder = activeFolder === 'trash';

    const confirmMsg = isTrashFolder
      ? `Permanently delete ${selectedMessages.length} message(s)? This cannot be undone.`
      : `Move ${selectedMessages.length} message(s) to Trash?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (isTrashFolder) {
        // Οριστική διαγραφή
        await Promise.all(
          selectedMessages.map(id => messageService.deleteMessage(id))
        );
      } else {
        // Soft delete → Trash
        await Promise.all(
          selectedMessages.map(id => messageService.moveToTrash(id))
        );
      }
      setSelectedMessages([]);
      fetchMessages();
      fetchUnreadCount();
      if (openedMessage && selectedMessages.includes(openedMessage.id)) {
        handleCloseOpenedMessage();
      }
    } catch (err) {
      console.error('Error deleting messages:', err);
      alert('Failed to delete messages.');
    }
  };

  const getFilteredMessages = () => {
    if (!user?.id) return [];
    let filtered = [...messages];

    switch (activeFolder) {
      case 'incoming':
        filtered = filtered.filter(m =>
          m.recipient_id === user.id && !m.is_trash && !m.is_draft
        );
        break;
      case 'sent':
        filtered = filtered.filter(m =>
          m.sender_id === user.id && !m.is_trash && !m.is_draft
        );
        break;
      case 'drafts':
        filtered = filtered.filter(m =>
          m.is_draft === true && m.sender_id === user.id
        );
        break;
      case 'junk':
        filtered = filtered.filter(m =>
          m.is_junk === true && m.recipient_id === user.id && !m.is_trash
        );
        break;
      case 'trash':
        filtered = filtered.filter(m => m.is_trash === true);
        break;
      default:
        break;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.subject?.toLowerCase().includes(query) ||
        m.body?.toLowerCase().includes(query) ||
        m.sender_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredMessages = getFilteredMessages();

  return (
    <div className="organizer-dashboard">
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          Personal Info
        </button>
        <button
          className={`profile-tab ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          Messages
          {unreadCount > 0 && (
            <span className="tab-badge">{unreadCount}</span>
          )}
        </button>
        <button
          className={`profile-tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events
        </button>
        <button
          className={`profile-tab ${activeTab === 'reservations' ? 'active' : ''}`}
          onClick={() => setActiveTab('reservations')}
        >
          Reservations
        </button>
      </div>

      <div className="profile-tab-content">
        {activeTab === 'personal' && (
          <PersonalInfoTab user={user} navigate={navigate} />
        )}
        {activeTab === 'messages' && (
          <MessagesLayout
            messages={filteredMessages}
            loading={loadingMessages}
            activeFolder={activeFolder}
            setActiveFolder={setActiveFolder}
            selectedMessages={selectedMessages}
            onSelectMessage={handleSelectMessage}
            onSelectAll={handleSelectAll}
            onDeleteSelected={handleDeleteSelected}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onNewMessage={() => navigate('/profile/messages/new')}
            onOpenMessage={handleOpenMessage}
            openedMessage={openedMessage}
            loadingOpened={loadingOpened}
            onCloseOpened={handleCloseOpenedMessage}
            replyText={replyText}
            setReplyText={setReplyText}
            onSendReply={handleSendReply}
            sendingReply={sendingReply}
            onOpenDraft={(id) => navigate(`/profile/messages/new?draftId=${id}`)}
          />
        )}
        {activeTab === 'events' && (
          <MyEvents user={user} />
        )}
        {activeTab === 'reservations' && (
          <div className="placeholder-tab">
            <h3>📋 Reservations</h3>
            <p>Οι κρατήσεις για τις εκδηλώσεις σας θα εμφανιστούν εδώ.</p>
            <p className="placeholder-hint">
              (Coming soon — Λίστα κρατήσεων ανά event)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// PERSONAL INFO TAB
// ============================================
const PersonalInfoTab = ({ user, navigate }) => {
  return (
    <div className="personal-info-container">
      <div className="edit-btn-wrapper">
        <button
          className="btn-edit-profile"
          onClick={() => navigate('/profile/edit')}
        >
          <EditIcon className="edit-icon" />
          Edit
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-photo-wrapper">
          <div className="profile-photo">
            <span>Photo</span>
          </div>
        </div>

        <div className="profile-info-grid">
          <div className="info-column">
            <div className="info-row">
              <span className="info-label">Username:</span>
              <span className="info-value">{user?.username || 'Username'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Password:</span>
              <span className="info-value">{user?.password || 'password123'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">First Name:</span>
              <span className="info-value">{user?.first_name || 'First Name'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Last Name:</span>
              <span className="info-value">{user?.last_name || 'Last Name'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{user?.email || 'email@gmail.com'}</span>
            </div>
          </div>

          <div className="info-column">
            <div className="info-row">
              <span className="info-label">Phone Number:</span>
              <span className="info-value">{user?.phone || 'Phone Number'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Address:</span>
              <span className="info-value">{user?.address || 'Address'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Location:</span>
              <span className="info-value">{user?.city || user?.location || 'Location'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Tax Registration Number:</span>
              <span className="info-value">{user?.afm || 'Tax Registration Number'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MESSAGES LAYOUT - 3 ΣΤΗΛΕΣ (Chat-style)
// ============================================
const MessagesLayout = ({
  messages,
  loading,
  activeFolder,
  setActiveFolder,
  selectedMessages,
  onSelectMessage,
  onSelectAll,
  onDeleteSelected,
  searchQuery,
  setSearchQuery,
  onNewMessage,
  onOpenMessage,
  openedMessage,
  loadingOpened,
  onCloseOpened,
  replyText,
  setReplyText,
  onSendReply,
  sendingReply,
  onOpenDraft,
}) => {
  const folders = [
    { id: 'incoming', label: 'Inbox' },
    { id: 'sent', label: 'Sent' },
    { id: 'drafts', label: 'Drafts' },
    { id: 'junk', label: 'Junk' },
    { id: 'trash', label: 'Trash' },
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitial = (name) => {
    return name?.charAt(0)?.toUpperCase() || 'U';
  };

  const getAvatarColor = (id) => {
    const colors = ['#4a90d9', '#2ecc71', '#9b59b6', '#f39c12', '#e74c3c', '#1abc9c'];
    return colors[(id || 0) % colors.length];
  };

  return (
    <div className={`messages-layout ${openedMessage ? 'with-opened' : ''}`}>
      <aside className="messages-sidebar">
        {folders.map(folder => (
          <button
            key={folder.id}
            className={`folder-btn ${activeFolder === folder.id ? 'active' : ''}`}
            onClick={() => {
              setActiveFolder(folder.id);
              onCloseOpened();
            }}
          >
            {folder.label}
          </button>
        ))}
      </aside>

      <div className="messages-content">
        <div className="messages-toolbar">
          <div className="toolbar-left">
            <label className="checkbox-wrapper">
              <input
                type="checkbox"
                checked={
                  messages.length > 0 &&
                  selectedMessages.length === messages.length
                }
                onChange={onSelectAll}
              />
            </label>
            <button
              className="btn-delete"
              disabled={selectedMessages.length === 0}
              onClick={onDeleteSelected}
            >
              Delete
            </button>
          </div>
          <div className="toolbar-right">
            <button className="btn-new-message" onClick={onNewMessage}>
              New Message
            </button>
          </div>
        </div>

        <div className="search-wrapper">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="messages-search"
          />
        </div>

        {loading ? (
          <p className="messages-empty">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="messages-empty">No messages in {activeFolder}.</p>
        ) : (
          <div className="messages-list-simple">
            {messages.map(message => (
              <div
                key={message.id}
                className={`message-row ${selectedMessages.includes(message.id) ? 'selected' : ''} ${!message.is_read ? 'unread' : ''} ${openedMessage?.id === message.id ? 'opened' : ''}`}
              >
                <label
                  className="checkbox-wrapper"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedMessages.includes(message.id)}
                    onChange={() => onSelectMessage(message.id)}
                  />
                </label>

                <div
                  className="message-row-avatar"
                  style={{ background: getAvatarColor(message.sender_id) }}
                >
                  {getInitial(message.sender_name)}
                </div>

                <div
                  className="message-row-content"
                  onClick={() => {
                    if (message.is_draft) {
                      onOpenDraft(message.id);
                    } else {
                      onOpenMessage(message.id);
                    }
                  }}
                >
                  <div className="message-row-top">
                    <span className="message-row-sender">
                      {message.sender_name}
                    </span>
                    <span className="message-row-date">
                      {formatDate(message.created_at)}
                    </span>
                  </div>
                  <div className="message-row-bottom">
                    <span className="message-row-title">
                      {message.subject || '(no subject)'}
                    </span>
                  </div>
                  <div className="message-row-preview">
                    {message.body?.substring(0, 60)}
                    {message.body?.length > 60 ? '...' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {openedMessage && (
        <div className="message-detail-panel">
          <div className="message-detail-header">
            <div
              className="message-detail-avatar"
              style={{ background: getAvatarColor(openedMessage.sender_id) }}
            >
              {getInitial(openedMessage.sender_name)}
            </div>
            <div className="message-detail-info">
              <div className="message-detail-name">
                {openedMessage.sender_name}
              </div>
              <div className="message-detail-username">
                @{openedMessage.sender_username}
              </div>
            </div>
            <button
              className="btn-close-detail"
              onClick={onCloseOpened}
              title="Close"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="message-detail-subject">
            {openedMessage.subject || '(no subject)'}
          </div>

          <div className="message-detail-date">
            {formatDate(openedMessage.created_at)}
          </div>

          {loadingOpened ? (
            <div className="message-detail-loading">Loading...</div>
          ) : (
            <>
              <div className="message-detail-body">
                <div className="message-bubble incoming">
                  <div className="message-bubble-text">
                    {openedMessage.body}
                  </div>
                  <div className="message-bubble-time">
                    {formatDate(openedMessage.created_at)}
                  </div>
                </div>
              </div>

              <div className="message-reply-box">
                <textarea
                  className="message-reply-input"
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                />
                <button
                  className="btn-send-reply"
                  onClick={onSendReply}
                  disabled={!replyText.trim() || sendingReply}
                >
                  <SendIcon />
                  {sendingReply ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;