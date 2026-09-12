// src/pages/profile/ParticipantDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messageService } from '../services/api';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import './Dashboard.css';

const ParticipantDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Message folders & state
  const [activeFolder, setActiveFolder] = useState('incoming');
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

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
      const response = await messageService.getUnreadCount();
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

  // Άνοιγμα μηνύματος - Πλοήγηση στη σελίδα MessageView
  const handleOpenMessage = (messageId) => {
    navigate(`/profile/messages/${messageId}`);
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

  // Φιλτράρισμα μηνυμάτων ανά φάκελο και search
  const getFilteredMessages = () => {
    let filtered = [...messages];

    switch (activeFolder) {
      case 'incoming':
        filtered = filtered.filter(m => m.recipient_id === 3);
        break;
      case 'sent':
        filtered = filtered.filter(m => m.sender_id === 3);
        break;
      case 'drafts':
        filtered = filtered.filter(m => m.is_draft === true);
        break;
      case 'junk':
        filtered = filtered.filter(m => m.is_junk === true);
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
    <div className="participant-dashboard">
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
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onNewMessage={() => navigate('/profile/messages/new')}
            onOpenMessage={handleOpenMessage}
          />
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
// MESSAGES LAYOUT - ΜΕ SIDEBAR
// ============================================
const MessagesLayout = ({
  messages,
  loading,
  activeFolder,
  setActiveFolder,
  selectedMessages,
  onSelectMessage,
  onSelectAll,
  searchQuery,
  setSearchQuery,
  onNewMessage,
  onOpenMessage
}) => {
  const folders = [
    { id: 'incoming', label: 'Incoming' },
    { id: 'sent', label: 'Sent' },
    { id: 'drafts', label: 'Drafts' },
    { id: 'junk', label: 'Junk' },
    { id: 'trash', label: 'Trash' },
  ];

  return (
    <div className="messages-layout">
      {/* Left Sidebar - Folders */}
      <aside className="messages-sidebar">
        {folders.map(folder => (
          <button
            key={folder.id}
            className={`folder-btn ${activeFolder === folder.id ? 'active' : ''}`}
            onClick={() => setActiveFolder(folder.id)}
          >
            {folder.label}
          </button>
        ))}
      </aside>

      {/* Right Content */}
      <div className="messages-content">
        {/* Toolbar */}
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
            >
              Delete
            </button>
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
          </div>

          <div className="toolbar-right">
            <button className="btn-new-message" onClick={onNewMessage}>
              New Message
            </button>
          </div>
        </div>

        {/* Messages List */}
        {loading ? (
          <p className="messages-empty">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="messages-empty">No messages in {activeFolder}.</p>
        ) : (
          <div className="messages-list-simple">
            {messages.map(message => (
              <div
                key={message.id}
                className={`message-row ${selectedMessages.includes(message.id) ? 'selected' : ''} ${!message.is_read ? 'unread' : ''}`}
              >
                <label className="checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedMessages.includes(message.id)}
                    onChange={() => onSelectMessage(message.id)}
                  />
                </label>
                <div
                  className="message-row-content"
                  onClick={() => onOpenMessage(message.id)}
                >
                  <span className="message-row-title">
                    {message.subject || '(no subject)'}
                  </span>
                  <span className="message-row-sender">
                    {message.sender_name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantDashboard;