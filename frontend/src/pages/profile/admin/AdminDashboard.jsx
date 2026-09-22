// src/pages/profile/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import '../common/Dashboard.css';

import UserManagement from './UserManagement';
import AdminEvents from './AdminEvents';

const VALID_TABS = ['personal', 'users', 'events'];

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
      </div>

      <div className="profile-tab-content">
        {activeTab === 'personal' && <PersonalInfoTab user={user} navigate={navigate} />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'events' && <AdminEvents />}
      </div>
    </div>
  );
};

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
            {user?.first_name && user?.last_name
              ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
              : user?.username?.charAt(0)?.toUpperCase() || 'U'}
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

export default AdminDashboard;