// src/pages/profile/admin/UserManagement.jsx
import React, { useEffect, useState } from 'react';
import { userService } from '../../../services/api';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ============================================
  // ΦΟΡΤΩΣΗ ΧΡΗΣΤΩΝ
  // ============================================
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

    // Filter κατά approval_status
    if (activeFilter !== 'ALL') {
      filtered = filtered.filter(u => u.approval_status === activeFilter);
    }

    // Search
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

  // Counts ανά filter
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

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user permanently? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await userService.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSelectedUser(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user.');
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    if (actionLoading) return;
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

  const getRoleLabel = (user) => {
    if (user.is_staff || user.is_superuser) return 'Admin';
    if (user.role === 'ORGANIZER') return 'Organizer';
    return 'Participant';
  };

  const getInitials = (u) => {
    const f = u.first_name?.charAt(0) || '';
    const l = u.last_name?.charAt(0) || '';
    return (f + l).toUpperCase() || u.username?.charAt(0).toUpperCase() || 'U';
  };

  // ============================================
  // LOADING / ERROR
  // ============================================
  if (loading) {
    return (
      <div className="um-loading">
        <div className="loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="um-error">
        <p>{error}</p>
        <button className="btn-retry" onClick={fetchUsers}>Try Again</button>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="um-layout">
      {/* Στήλη 1: Filters */}
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

      {/* Στήλη 2: Users List */}
      <div className="um-content">
        {/* Toolbar */}
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

        {/* List */}
        {filteredUsers.length === 0 ? (
          <div className="um-empty">
            <p>No users found.</p>
          </div>
        ) : (
          <div className="um-list">
            {filteredUsers.map(u => (
              <div
                key={u.id}
                className={`user-item status-${(u.approval_status || '').toLowerCase()}`}
                onClick={() => setSelectedUser(u)}
              >
                <div className="user-avatar-sm">
                  {getInitials(u)}
                </div>

                <div className="user-item-content">
                  <div className="user-item-top">
                    <span className="user-item-name">
                      {u.first_name} {u.last_name}
                    </span>
                    <span className="user-item-role">{getRoleLabel(u)}</span>
                  </div>
                  <div className="user-item-bottom">
                    <span className="user-item-username">@{u.username}</span>
                    <span className="user-item-email">{u.email}</span>
                  </div>
                </div>

                <span className={`user-status status-${(u.approval_status || '').toLowerCase()}`}>
                  {getStatusLabel(u.approval_status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================
          USER DETAILS MODAL
          ============================================ */}
      {selectedUser && (
        <div className="um-modal-overlay" onClick={closeModal}>
          <div className="um-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="um-modal-header">
              <div className="um-modal-avatar">
                {getInitials(selectedUser)}
              </div>
              <div className="um-modal-header-info">
                <h3>{selectedUser.first_name} {selectedUser.last_name}</h3>
                <p>@{selectedUser.username} • {getRoleLabel(selectedUser)}</p>
              </div>
              <button className="btn-close-modal" onClick={closeModal} disabled={actionLoading}>
                <CloseIcon />
              </button>
            </div>

            {/* Body */}
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
                  {selectedUser.city || selectedUser.location || '—'}
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

            {/* Footer */}
            <div className="um-modal-footer">
              <button
                className="btn-modal-exit"
                onClick={closeModal}
                disabled={actionLoading}
              >
                Close
              </button>

              {selectedUser.approval_status === 'PENDING' && (
                <>
                  <button
                    className="btn-modal-approve"
                    onClick={() => handleApprove(selectedUser.id)}
                    disabled={actionLoading}
                  >
                    <CheckCircleIcon /> {actionLoading ? '...' : 'Approve'}
                  </button>
                  <button
                    className="btn-modal-reject"
                    onClick={() => handleReject(selectedUser.id)}
                    disabled={actionLoading}
                  >
                    <CancelIcon /> {actionLoading ? '...' : 'Reject'}
                  </button>
                </>
              )}

              {selectedUser.approval_status !== 'PENDING' && (
                <button
                  className="btn-modal-delete"
                  onClick={() => handleDelete(selectedUser.id)}
                  disabled={actionLoading}
                >
                  <DeleteIcon /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;