// src/pages/profile/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import '../common/Dashboard.css';

import UserManagement from './UserManagement';
import AdminEvents from './AdminEvents';
import ExportData from './ExportData';

const VALID_TABS = ['personal', 'users', 'events', 'export'];

const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = searchParams.get('tab');
  const initialTab = VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'personal';

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (VALID_TABS.includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="admin-dashboard">
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => handleTabChange('personal')}
        >
          Personal Info
        </button>
        <button
          className={`profile-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => handleTabChange('users')}
        >
          User Management
        </button>
        <button
          className={`profile-tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => handleTabChange('events')}
        >
          Events
        </button>
        <button
          className={`profile-tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => handleTabChange('export')}
        >
          Export Data
        </button>
      </div>

      <div className="profile-tab-content">
        {activeTab === 'personal' && <PersonalInfoTab user={user} navigate={navigate} />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'events' && <AdminEvents />}
        {activeTab === 'export' && <ExportData />}
      </div>
    </div>
  );
};

// ============================================
// PERSONAL INFO TAB
// ============================================
const PersonalInfoTab = ({ user, navigate }) => {
  // ============================================
  // ΝΕΑ ΠΕΔΙΑ — ίδια λογική με UserDashboard
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
    return (
      d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
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
              <span className="dashboard-info-value">{user?.email || '-'}</span>
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
              <span className="dashboard-info-value">{user?.phone || '-'}</span>
            </div>
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Address:</span>
              <span className="dashboard-info-value">{user?.address || '-'}</span>
            </div>
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Location:</span>
              <span className="dashboard-info-value">{user?.city || '-'}</span>
            </div>
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Tax Registration Number:</span>
              <span className="dashboard-info-value">{user?.afm || '-'}</span>
            </div>
            <div className="dashboard-info-row">
              <span className="dashboard-info-label">Registered:</span>
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

export default AdminDashboard;