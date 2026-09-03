// src/pages/profile/OrganizerDashboard.jsx
import React from 'react';
import './Dashboard.css';

const OrganizerDashboard = ({ user }) => {
  return (
    <div className="organizer-dashboard">
      <div className="dashboard-header">
        <h1>Organizer Dashboard</h1>
        <p>Welcome back, {user?.first_name || user?.username}!</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>📅 My Events</h3>
          <p>View and manage your events</p>
        </div>
        <div className="dashboard-card">
          <h3>➕ Create Event</h3>
          <p>Create a new event</p>
        </div>
        <div className="dashboard-card">
          <h3>📊 Analytics</h3>
          <p>View event statistics</p>
        </div>
        <div className="dashboard-card">
          <h3>📋 Bookings</h3>
          <p>View your event bookings</p>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;