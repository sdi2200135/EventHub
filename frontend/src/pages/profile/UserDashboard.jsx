// src/pages/profile/UserDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { messageService } from '../../services/api';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import './common/Dashboard.css';
import './common/MessagesPanel.css';
import MyBookings from './participant/MyBookings';
import MyEvents from './organizer/MyEvents';
import Reservations from './organizer/Reservations';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// ============================================
// TABS — όλα ορατά σε όλους, με σταθερή σειρά
// ============================================
const TABS = [
  { id: 'personal',     label: 'Personal Info' },
  { id: 'messages',     label: 'Messages',     showBadge: true },
  { id: 'bookings',     label: 'My Bookings' },
  { id: 'events',       label: 'Events' },
  { id: 'reservations', label: 'Reservations' },
];

const VALID_TAB_IDS = TABS.map(t => t.id);

const UserDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ============================================
  // 1. ACTIVE TAB (sync με URL)
  // ============================================
  const getInitialTab = () => {
    const tab = searchParams.get('tab');
    return VALID_TAB_IDS.includes(tab) ? tab : 'personal';
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  // Αν το URL έχει άκυρο tab → reset
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && !VALID_TAB_IDS.includes(tabFromUrl)) {
      setSearchParams({ tab: 'personal' });
      setActiveTabState('personal');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ============================================
  // 2. MESSAGES STATE
  // ============================================
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeFolder, setActiveFolder] = useState('incoming');
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openedMessage, setOpenedMessage] = useState(null);
  const [loadingOpened, setLoadingOpened] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => { fetchUnreadCount(); }, []);

  useEffect(() => {
    if (activeTab === 'messages') fetchMessages();
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

  // ============================================
  // 3. MESSAGES HANDLERS
  // ============================================
  const handleOpenMessage = async (messageId) => {
    try {
      setLoadingOpened(true);
      const response = await messageService.getMessage(messageId);
      setOpenedMessage(response.data);
      setReplyText('');

      // Ο backend κάνει auto-mark ως read στο GET /messages/{id}/
      // Ενημερώνουμε τοπικά τη λίστα και το badge
      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, is_read: true } : m)
      );
      fetchUnreadCount();
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

    const confirmMsg = `Delete ${selectedMessages.length} message(s)?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await Promise.all(selectedMessages.map(id => messageService.deleteMessage(id)));
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

  // const handleMarkAsJunk = async (messageId) => {
  //   try {
  //     await messageService.markAsJunk(messageId);
  //     setMessages(prev =>
  //       prev.map(m => m.id === messageId ? { ...m, is_junk: true, is_read: true } : m)
  //     );
  //     handleCloseOpenedMessage();
  //     fetchUnreadCount();
  //   } catch (err) {
  //     console.error('Error marking as junk:', err);
  //     alert('Failed to mark message as junk.');
  //   }
  // };

  // const handleUnmarkJunk = async (messageId) => {
  //   try {
  //     await messageService.unmarkJunk(messageId);
  //     setMessages(prev =>
  //       prev.map(m => m.id === messageId ? { ...m, is_junk: false } : m)
  //     );
  //     handleCloseOpenedMessage();
  //   } catch (err) {
  //     console.error('Error unmarking junk:', err);
  //     alert('Failed to restore message.');
  //   }
  // };

  // const handleRestoreFromTrash = async (messageId) => {
  //   try {
  //     await messageService.restoreFromTrash(messageId);
  //     setMessages(prev =>
  //       prev.map(m => m.id === messageId ? { ...m, is_trash: false } : m)
  //     );
  //     handleCloseOpenedMessage();
  //   } catch (err) {
  //     console.error('Error restoring from trash:', err);
  //     alert('Failed to restore message.');
  //   }
  // };

  const getFilteredMessages = () => {
    if (!user?.id) return [];
    let filtered = [...messages];

    switch (activeFolder) {
      case 'incoming':
        filtered = filtered.filter(m =>
          m.recipient_id === user.id /*&& !m.is_trash && !m.is_draft && !m.is_junk*/
        );
        break;
      case 'sent':
        filtered = filtered.filter(m =>
          m.sender_id === user.id /*&& !m.is_trash && !m.is_draft*/
        );
        break;
      // case 'drafts':
      //   filtered = filtered.filter(m =>
      //     m.is_draft === true && m.sender_id === user.id
      //   );
      //   break;
      // case 'junk':
      //   filtered = filtered.filter(m =>
      //     m.is_junk === true && m.recipient_id === user.id && !m.is_trash
      //   );
      //   break;
      // case 'trash':
      //   filtered = filtered.filter(m => m.is_trash === true);
      //   break;
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

  // ============================================
  // 4. RENDER TAB CONTENT
  // ============================================
  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return <PersonalInfoTab user={user} navigate={navigate} />;

      case 'messages':
        return (
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
          />
        );

      case 'bookings':
        return <MyBookings />;

      case 'events':
        return <MyEvents user={user} />;

      case 'reservations':
        return <Reservations user={user} />;

      default:
        return null;
    }
  };

  // ============================================
  // 5. MAIN RENDER
  // ============================================
  return (
    <div className="user-dashboard">
      <div className="profile-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`profile-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.showBadge && unreadCount > 0 && (
              <span className="dashboard-tab-badge">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="profile-tab-content">
        {renderTabContent()}
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
        <button className="btn-edit-profile" onClick={() => navigate('/profile/edit')}>
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
          <div className="dashboard-info-column">
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Username:</span>
              <span className="dashboard-info-value">{user?.username || 'Username'}</span>
            </div>
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Password:</span>
              <span className="dashboard-info-value">{user?.password || 'password123'}</span>
            </div>
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">First Name:</span>
              <span className="dashboard-info-value">{user?.first_name || 'First Name'}</span>
            </div>
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Last Name:</span>
              <span className="dashboard-info-value">{user?.last_name || 'Last Name'}</span>
            </div>
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Email:</span>
              <span className="dashboard-info-value">{user?.email || 'email@gmail.com'}</span>
            </div>
          </div>

          <div className="dashboard-info-column">
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Phone Number:</span>
              <span className="dashboard-info-value">{user?.phone || 'Phone Number'}</span>
            </div>
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Address:</span>
              <span className="dashboard-info-value">{user?.address || 'Address'}</span>
            </div>
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Location:</span>
              <span className="dashboard-info-value">
                {user?.city || user?.location || 'Location'}
              </span>
            </div>
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Tax Registration Number:</span>
              <span className="dashboard-info-value">{user?.afm || 'Tax Registration Number'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MESSAGES LAYOUT (3 στήλες)
// ============================================
const MessagesLayout = ({
  messages, loading, activeFolder, setActiveFolder,
  selectedMessages, onSelectMessage, onSelectAll, onDeleteSelected,
  searchQuery, setSearchQuery, onNewMessage, onOpenMessage,
  openedMessage, loadingOpened, onCloseOpened,
  replyText, setReplyText, onSendReply, sendingReply, /*onOpenDraft,
  onMarkAsJunk, onUnmarkJunk, onRestoreFromTrash,*/
}) => {
  const folders = [
    { id: 'incoming', label: 'Inbox' },
    { id: 'sent', label: 'Sent' },
    // { id: 'drafts', label: 'Drafts' },
    // { id: 'junk', label: 'Junk' },
    // { id: 'trash', label: 'Trash' },
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getInitial = (name) => name?.charAt(0)?.toUpperCase() || 'U';

  const getAvatarColor = (id) => {
    const colors = ['#4a90d9', '#2ecc71', '#9b59b6', '#f39c12', '#e74c3c', '#1abc9c'];
    return colors[(id || 0) % colors.length];
  };

  return (
    <div className={`msg-layout ${openedMessage ? 'with-opened' : ''}`}>
      <aside className="msg-sidebar">
        {folders.map(folder => (
          <button
            key={folder.id}
            className={`msg-folder-btn ${activeFolder === folder.id ? 'active' : ''}`}
            onClick={() => { setActiveFolder(folder.id); onCloseOpened(); }}
          >
            {folder.label}
          </button>
        ))}
      </aside>

      <div className="msg-content">
        <div className="msg-toolbar">
          <label className="msg-checkbox-wrapper">
            <input
              type="checkbox"
              checked={messages.length > 0 && selectedMessages.length === messages.length}
              onChange={onSelectAll}
            />
          </label>

          <button
            className="msg-btn-delete"
            disabled={selectedMessages.length === 0}
            onClick={onDeleteSelected}
          >
            Delete
          </button>

          <div className="msg-search-wrapper">
            <SearchIcon className="msg-search-icon" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="msg-search"
            />
          </div>

          <button className="msg-btn-new" onClick={onNewMessage}>
            New Message
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading messages..." />
        ) : messages.length === 0 ? (
          <p className="msg-empty">No messages in {activeFolder}.</p>
        ) : (
          <div className="msg-list">
            {messages.map(message => (
              <div
                key={message.id}
                className={`msg-row ${selectedMessages.includes(message.id) ? 'selected' : ''} ${!message.is_read ? 'unread' : ''} ${openedMessage?.id === message.id ? 'opened' : ''}`}
              >
                <label className="msg-checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedMessages.includes(message.id)}
                    onChange={() => onSelectMessage(message.id)}
                  />
                </label>

                <div
                  className="msg-row-avatar"
                  style={{ background: getAvatarColor(message.sender_id) }}
                >
                  {getInitial(message.sender_name)}
                </div>

                <div
                  className="msg-row-content"
                  onClick={() => {
                    /*if (message.is_draft) onOpenDraft(message.id);
                    else*/ onOpenMessage(message.id);
                  }}
                >
                  <div className="msg-row-top">
                    <span className="msg-row-sender">{message.sender_name}</span>
                    <span className="msg-row-date">{formatDate(message.created_at)}</span>
                  </div>
                  <div className="msg-row-bottom">
                    <span className="msg-row-title">
                      {message.subject || '(no subject)'}
                    </span>
                  </div>
                  <div className="msg-row-preview">
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
        <div className="msg-detail-panel">
          <div className="msg-detail-header">
            <div
              className="msg-detail-avatar"
              style={{ background: getAvatarColor(openedMessage.sender_id) }}
            >
              {getInitial(openedMessage.sender_name)}
            </div>
            <div className="msg-detail-info">
              <div className="msg-detail-name">{openedMessage.sender_name}</div>
              <div className="msg-detail-username">@{openedMessage.sender_username}</div>
            </div>

            {/* {activeFolder === 'incoming' && !openedMessage.is_junk && (
              <button
                className="msg-btn-action junk"
                onClick={() => onMarkAsJunk(openedMessage.id)}
                title="Mark as Junk"
              >
                <ReportIcon />
              </button>
            )}

            {activeFolder === 'junk' && (
              <button
                className="msg-btn-action unjunk"
                onClick={() => onUnmarkJunk(openedMessage.id)}
                title="Not Junk"
              >
                <MoveToInboxIcon />
              </button>
            )}

            {activeFolder === 'trash' && (
              <button
                className="msg-btn-action restore"
                onClick={() => onRestoreFromTrash(openedMessage.id)}
                title="Restore"
              >
                <RestoreFromTrashIcon />
              </button>
            )} */}

            <button className="msg-btn-close-detail" onClick={onCloseOpened} title="Close">
              <CloseIcon />
            </button>
          </div>

          <div className="msg-detail-subject">
            {openedMessage.subject || '(no subject)'}
          </div>
          <div className="msg-detail-date">
            {formatDate(openedMessage.created_at)}
          </div>

          {loadingOpened ? (
            <div className="msg-detail-loading">Loading...</div>
          ) : (
            <>
              <div className="msg-detail-body">
                <div className="msg-bubble incoming">
                  <div className="msg-bubble-text">{openedMessage.body}</div>
                  <div className="msg-bubble-time">
                    {formatDate(openedMessage.created_at)}
                  </div>
                </div>
              </div>

              <div className="msg-reply-box">
                <textarea
                  className="msg-reply-input"
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                />
                <button
                  className="msg-btn-send-reply"
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

export default UserDashboard;