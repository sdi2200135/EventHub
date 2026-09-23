// src/pages/profile/admin/UserManagement.jsx
import { useEffect, useState } from 'react';
import { userService } from '../../../services/api';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';
import './UserManagement.css';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

// Helper: κατεβάζει string ως αρχείο
const downloadFile = (data, filename, mime) => {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.getAllUsers();
      setUsers(response.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Could not load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTERS
  // ============================================
  const filters = [
    { id: 'ALL', label: 'All' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'REJECTED', label: 'Rejected' },
  ];

  const getFilteredUsers = () => {
    let filtered = [...users];

    if (activeFilter !== 'ALL') {
      filtered = filtered.filter(u => u.approval_status === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  const counts = {
    ALL: users.length,
    PENDING: users.filter(u => u.approval_status === 'PENDING').length,
    APPROVED: users.filter(u => u.approval_status === 'APPROVED').length,
    REJECTED: users.filter(u => u.approval_status === 'REJECTED').length,
  };

  // ============================================
  // ACTIONS
  // ============================================
  const handleApprove = async (userId) => {
    setActionLoading(true);
    try {
      await userService.approveUser(userId);
      setUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, approval_status: 'APPROVED' } : u)
      );
      setSelectedUser(prev =>
        prev ? { ...prev, approval_status: 'APPROVED' } : null
      );
    } catch (err) {
      console.error('Error approving user:', err);
      alert('Failed to approve user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Reject this user registration?')) return;
    setActionLoading(true);
    try {
      await userService.rejectUser(userId);
      setUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, approval_status: 'REJECTED' } : u)
      );
      setSelectedUser(prev =>
        prev ? { ...prev, approval_status: 'REJECTED' } : null
      );
    } catch (err) {
      console.error('Error rejecting user:', err);
      alert('Failed to reject user.');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================
  // EXPORT — events που δημιούργησε ο user
  // ============================================
  const handleExportUserEvents = async (format) => {
    if (!selectedUser) return;
    setExporting(true);
    try {
      const response = await userService.exportEvents(format, selectedUser.id);
      const mime = format === 'xml' ? 'application/xml' : 'application/json';
      const filename = `events_${selectedUser.username}.${format}`;
      downloadFile(response.data, filename, mime);
    } catch (err) {
      console.error('Export user events failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const closeModal = () => {
    if (actionLoading || exporting) return;
    setSelectedUser(null);
  };

  // ============================================
  // HELPERS
  // ============================================
  const getStatusLabel = (status) => {
    switch (status) {
      case 'APPROVED': return 'Approved';
      case 'PENDING': return 'Pending';
      case 'REJECTED': return 'Rejected';
      default: return status;
    }
  };

  const getRoleLabel = (user) => (user.is_staff ? 'Admin' : 'User');

  const getInitials = (u) => {
    const f = u.first_name?.charAt(0) || '';
    const l = u.last_name?.charAt(0) || '';
    return (f + l).toUpperCase() || u.username?.charAt(0).toUpperCase() || 'U';
  };

  if (loading) {
    return <LoadingSpinner message="Loading users..." />;
  }

  if (error) {
    return (
      <div className="um-error">
        <p>{error}</p>
        <button className="btn-retry" onClick={fetchUsers}>Try Again</button>
      </div>
    );
  }

  const isBusy = actionLoading || exporting;

  return (
    <div className="um-layout">
      <aside className="um-sidebar">
        {filters.map(f => (
          <button
            key={f.id}
            className={`filter-btn ${activeFilter === f.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.id)}
          >
            <span>{f.label}</span>
            <span className="filter-count">{counts[f.id]}</span>
          </button>
        ))}
      </aside>

      <div className="um-content">
        <div className="um-toolbar">
          <div className="search-wrapper">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="Search by username, email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="users-search"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="um-empty">
            <p>No users found.</p>
          </div>
        ) : (
          <div className="um-list">
            {filteredUsers.map(u => (
              <div
                key={u.id}
                className={`um-user-item status-${(u.approval_status || '').toLowerCase()}`}
                onClick={() => setSelectedUser(u)}
              >
                <div className="um-user-avatar-sm">
                  {getInitials(u)}
                </div>

                <div className="um-user-item-content">
                  <div className="um-user-item-top">
                    <span className="um-user-item-name">
                      {u.first_name} {u.last_name}
                    </span>
                    <span className="um-user-item-role">{getRoleLabel(u)}</span>
                  </div>
                  <div className="um-user-item-bottom">
                    <span className="um-user-item-username">@{u.username}</span>
                    <span className="um-user-item-email">{u.email}</span>
                  </div>
                </div>

                <span className={`um-user-status status-${(u.approval_status || '').toLowerCase()}`}>
                  {getStatusLabel(u.approval_status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="um-modal-overlay" onClick={closeModal}>
          <div className="um-modal" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <div className="um-modal-avatar">
                {getInitials(selectedUser)}
              </div>
              <div className="um-modal-header-info">
                <h3>{selectedUser.first_name} {selectedUser.last_name}</h3>
                <p>@{selectedUser.username} • {getRoleLabel(selectedUser)}</p>
              </div>
              <button className="btn-close-modal" onClick={closeModal} disabled={isBusy}>
                <CloseIcon />
              </button>
            </div>

            <div className="um-modal-body">
              <div className="um-modal-row">
                <span className="um-modal-label">Email:</span>
                <span className="um-modal-value">{selectedUser.email || '—'}</span>
              </div>
              <div className="um-modal-row">
                <span className="um-modal-label">Phone:</span>
                <span className="um-modal-value">{selectedUser.phone || '—'}</span>
              </div>
              <div className="um-modal-row">
                <span className="um-modal-label">Address:</span>
                <span className="um-modal-value">{selectedUser.address || '—'}</span>
              </div>
              <div className="um-modal-row">
                <span className="um-modal-label">City:</span>
                <span className="um-modal-value">
                  {selectedUser.city || '—'}
                </span>
              </div>
              <div className="um-modal-row">
                <span className="um-modal-label">Country:</span>
                <span className="um-modal-value">{selectedUser.country || '—'}</span>
              </div>
              <div className="um-modal-row">
                <span className="um-modal-label">AFM:</span>
                <span className="um-modal-value">{selectedUser.afm || '—'}</span>
              </div>
              <div className="um-modal-row">
                <span className="um-modal-label">Status:</span>
                <span className={`um-modal-value status-${(selectedUser.approval_status || '').toLowerCase()}`}>
                  {getStatusLabel(selectedUser.approval_status)}
                </span>
              </div>
            </div>

            <div className="um-modal-footer">
              <button
                className="btn-modal-exit"
                onClick={closeModal}
                disabled={isBusy}
              >
                Close
              </button>

              {selectedUser.approval_status === 'APPROVED' && (
                <>
                  <button
                    className="btn-modal-export"
                    onClick={() => handleExportUserEvents('xml')}
                    disabled={isBusy}
                    title="Export this user's events as XML"
                  >
                    <DownloadIcon /> {exporting ? '...' : 'XML'}
                  </button>
                  <button
                    className="btn-modal-export"
                    onClick={() => handleExportUserEvents('json')}
                    disabled={isBusy}
                    title="Export this user's events as JSON"
                  >
                    <DownloadIcon /> {exporting ? '...' : 'JSON'}
                  </button>
                </>
              )}

              {selectedUser.approval_status === 'PENDING' && (
                <>
                  <button
                    className="btn-modal-approve"
                    onClick={() => handleApprove(selectedUser.id)}
                    disabled={isBusy}
                  >
                    <CheckCircleIcon /> {actionLoading ? '...' : 'Approve'}
                  </button>
                  <button
                    className="btn-modal-reject"
                    onClick={() => handleReject(selectedUser.id)}
                    disabled={isBusy}
                  >
                    <CancelIcon /> {actionLoading ? '...' : 'Reject'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;