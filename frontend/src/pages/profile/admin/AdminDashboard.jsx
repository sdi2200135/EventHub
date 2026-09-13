// src/pages/profile/AdminDashboard.jsx
import React from 'react';
import '../common/Dashboard.css';

const AdminDashboard = ({ user }) => {
  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome, {user?.first_name || user?.username}!</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>👥 User Management</h3>
          <p>Manage users, approve registrations</p>
        </div>
        <div className="dashboard-card">
          <h3>📊 Statistics</h3>
          <p>View platform statistics</p>
        </div>
        <div className="dashboard-card">
          <h3>🎫 Events</h3>
          <p>Manage all events</p>
        </div>
        <div className="dashboard-card">
          <h3>📋 Reports</h3>
          <p>Generate reports</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;