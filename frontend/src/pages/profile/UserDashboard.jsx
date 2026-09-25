// src/pages/profile/UserDashboard.jsx
import { useEffect, useState, useRef } from 'react';
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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';

// ============================================
// TABS — visible to everyone
// ============================================
const TABS = [
  { id: 'personal',     label: 'Personal Info' },
  { id: 'messages',     label: 'Messages',     showBadge: true },
  { id: 'bookings',     label: 'My Bookings' },
  { id: 'events',       label: 'My Events' },
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
  const [thread, setThread] = useState([]);
  const [loadingOpened, setLoadingOpened] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      const response = await messageService.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // the folder decides which list we load; both come newest first
  const fetchMessages = async () => {
    setLoadingMessages(true);
    setSelectedMessages([]);
    try {
      const response = activeFolder === 'incoming'
        ? await messageService.getInbox()
        : await messageService.getSent();
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => { fetchUnreadCount(); }, []);

  useEffect(() => {
    if (activeTab === 'messages') fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeFolder]);

  // ============================================
  // 3. MESSAGES HANDLERS
  // ============================================
  const handleOpenMessage = async (message) => {
    setOpenedMessage(message);
    setReplyText('');
    setLoadingOpened(true);
    try {
      await messageService.markConversationRead(message.conversation);
      const { data } = await messageService.getConversation(message.conversation);
      setThread(data);
      setMessages((prev) => prev.map((m) =>
        m.conversation === message.conversation && m.receiver === user.id ? { ...m, is_read: true } : m
      ));
      fetchUnreadCount();
    } catch (err) {
      console.error('Error opening conversation:', err);
    } finally {
      setLoadingOpened(false);
    }
  };

  const handleCloseOpenedMessage = () => {
    setOpenedMessage(null);
    setThread([]);
    setReplyText('');
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !openedMessage) return;
    setSendingReply(true);
    try {
      const { data } = await messageService.sendMessage({
        conversation: openedMessage.conversation,
        body: replyText.trim(),
      });
      setThread((prev) => [...prev, data]);
      setReplyText('');
      if (activeFolder === 'sent') fetchMessages();
    } catch (err) {
      alert(err.message || 'Failed to send reply. Please try again.');
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
      await Promise.all(selectedMessages.map((id) => messageService.deleteMessage(id)));
      setThread((prev) => prev.filter((m) => !selectedMessages.includes(m.id)));
      fetchMessages();
      fetchUnreadCount();
    } catch (err) {
      alert(err.message || 'Failed to delete messages.');
    }
  };

  const handleDeleteConversation = async () => {
    const warning = 'Delete this conversation?\n\n'
      + 'It will be deleted only for you, with all its messages. '
      + 'The other person keeps their copy, and if they write again the conversation comes back.';
    if (!openedMessage || !window.confirm(warning)) return;
    try {
      await messageService.deleteConversation(openedMessage.conversation);
      handleCloseOpenedMessage();
      fetchMessages();
      fetchUnreadCount();
    } catch (err) {
      alert(err.message || 'Failed to delete the conversation.');
    }
  };

  const getFilteredMessages = () => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return messages;
    return messages.filter((m) => {
      const otherName = m.sender === user.id ? m.receiver_username : m.sender_username;
      return [otherName, m.event_title].some((text) => text?.toLowerCase().includes(query));
    });
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
            user={user}
            thread={thread}
            onDeleteConversation={handleDeleteConversation}
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
  // ============================================
  // ΝΕΑ ΠΕΔΙΑ — ξεχωριστές μεταβλητές
  // ============================================
  const userLatitude =
    user?.latitude ??
    user?.lat ??
    user?.location?.latitude ??
    user?.location?.lat;

  const userLongitude =
    user?.longitude ??
    user?.lng ??
    user?.lon ??
    user?.location?.longitude ??
    user?.location?.lng;

  const userRegisteredAt =
    user?.date_joined ??
    user?.created_at ??
    user?.registered_at ??
    user?.registration_date ??
    user?.created;

  const userLastLogin =
    user?.last_login ??
    user?.last_login_at ??
    user?.lastLogin;

  const formatRegisteredDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatLastLogin = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) + ' ' + d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? String(Number(n.toFixed(5))) : '—';
  };

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
            {user?.first_name && user?.last_name
              ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
              : user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>

        <div className="profile-info-grid">
          {/* Στήλη 1 */}
          <div className="dashboard-info-column">
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Username:</span>
              <span className="dashboard-info-value">{user?.username || 'Username'}</span>
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
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Latitude:</span>
              <span className="dashboard-info-value">{formatNumber(userLatitude)}</span>
            </div>
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Longitude:</span>
              <span className="dashboard-info-value">{formatNumber(userLongitude)}</span>
            </div>
          </div>

          {/* Στήλη 2 */}
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
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Registered on:</span>
              <span className="dashboard-info-value">{formatRegisteredDate(userRegisteredAt)}</span>
            </div>
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Last Login:</span>
              <span className="dashboard-info-value">{formatLastLogin(userLastLogin)}</span>
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
  user, messages, loading, activeFolder, setActiveFolder,
  selectedMessages, onSelectMessage, onSelectAll, onDeleteSelected,
  searchQuery, setSearchQuery, onNewMessage, onOpenMessage,
  openedMessage, thread, loadingOpened, onCloseOpened, onDeleteConversation,
  replyText, setReplyText, onSendReply, sendingReply,
}) => {

  const folders = [
    { id: 'incoming', label: 'Inbox' },
    { id: 'sent', label: 'Sent' },
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

  const other = (m) => (m.sender === user.id
    ? { id: m.receiver, name: m.receiver_username }
    : { id: m.sender, name: m.sender_username });

  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [thread]);

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
              placeholder="Search by name or event"
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
          <p className="msg-empty">No messages in {activeFolder === 'incoming' ? 'Inbox' : 'Sent'}.</p>
        ) : (
          <div className="msg-list">
            {messages.map(message => (
              <div
                key={message.id}
                className={`msg-row ${selectedMessages.includes(message.id) ? 'selected' : ''} ${activeFolder === 'incoming' && !message.is_read ? 'unread' : ''} ${openedMessage?.id === message.id ? 'opened' : ''}`}
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
                  style={{ background: getAvatarColor(other(message).id) }}
                >
                  {getInitial(other(message).name)}
                </div>

                <div
                  className="msg-row-content"
                  onClick={() => { onOpenMessage(message); }}
                >
                  <div className="msg-row-top">
                    <span className="msg-row-sender">{activeFolder === 'sent' ? 'To: ' : ''}{other(message).name}</span>
                    <span className="msg-row-date">{formatDate(message.created_at)}</span>
                  </div>
                  <div className="msg-row-bottom">
                    <span className="msg-row-title">{message.event_title}</span>
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
              style={{ background: getAvatarColor(other(openedMessage).id) }}
            >
              {getInitial(other(openedMessage).name)}
            </div>
            <div className="msg-detail-info">
              <div className="msg-detail-name">{other(openedMessage).name}</div>
              <div className="msg-detail-username">{openedMessage.event_title}</div>
            </div>

            <button
              className="msg-btn-close-detail"
              onClick={onDeleteConversation}
              title="Delete conversation"
            >
              <DeleteOutlineIcon />
            </button>

            <button className="msg-btn-close-detail" onClick={onCloseOpened} title="Close">
              <CloseIcon />
            </button>
          </div>

          {loadingOpened ? (
            <div className="msg-detail-loading">Loading...</div>
          ) : (
            <>
              <div className="msg-detail-body" ref={bodyRef}>
                {thread.map((m) => (
                  <div
                    key={m.id}
                    className={`msg-bubble ${m.sender === user.id ? 'outgoing' : 'incoming'}`}
                  >
                    <div className="msg-bubble-text">{m.body}</div>
                    <div className="msg-bubble-time">{formatDate(m.created_at)}</div>
                  </div>
                ))}
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