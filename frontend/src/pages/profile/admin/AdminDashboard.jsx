// src/pages/profile/admin/AdminDashboard.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import '../common/Dashboard.css';

// Import των επιμέρους components (θα τα φτιάξουμε στα επόμενα βήματα)
import UserManagement from './UserManagement';
import AdminEvents from './AdminEvents';
import ExportData from './ExportData';

const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');

  return (
    <div className="admin-dashboard">
      {/* ============================================
          TABS
          ============================================ */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          Personal Info
        </button>
        <button
          className={`profile-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button
          className={`profile-tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events
        </button>
        <button
          className={`profile-tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          Export Data
        </button>
      </div>

      {/* ============================================
          TAB CONTENT
          ============================================ */}
      <div className="profile-tab-content">
        {activeTab === 'personal' && (
          <PersonalInfoTab user={user} navigate={navigate} />
        )}
        {activeTab === 'users' && (
          <UserManagement />
        )}
        {activeTab === 'events' && (
          <AdminEvents />
        )}
        {activeTab === 'export' && (
          <ExportData />
        )}
      </div>
    </div>
  );
};

// ============================================
// PERSONAL INFO TAB (ίδιο με Organizer/Participant)
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
              <span className="info-value">
                {user?.city || user?.location || 'Location'}
              </span>
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

export default AdminDashboard;