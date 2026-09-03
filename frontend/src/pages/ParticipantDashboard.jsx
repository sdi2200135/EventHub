// src/pages/profile/ParticipantDashboard.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventService } from './../services/api';
import './Dashboard.css';

const ParticipantDashboard = ({ user }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Φόρτωση κρατήσεων του χρήστη
    const fetchBookings = async () => {
      try {
        // Αυτό θα το προσαρμόσεις ανάλογα με το API σου
        // const response = await bookingService.getMyBookings();
        // setBookings(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  return (
    <div className="participant-dashboard">
      <div className="dashboard-header">
        <h1>My Profile</h1>
        <p>Welcome back, {user?.first_name || user?.username}!</p>
      </div>

      <div className="profile-info-card">
        <div className="profile-avatar-large">
          {user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
        </div>
        <div className="profile-info">
          <h2>{user?.first_name} {user?.last_name}</h2>
          <p className="profile-username">@{user?.username}</p>
          <p className="profile-email">{user?.email}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>🎫 My Bookings</h3>
          <p>View your ticket bookings</p>
          <Link to="/profile/bookings" className="card-link">View All →</Link>
        </div>
        <div className="dashboard-card">
          <h3>👤 Edit Profile</h3>
          <p>Update your personal information</p>
          <Link to="/profile/edit" className="card-link">Edit →</Link>
        </div>
        <div className="dashboard-card">
          <h3>🔒 Security</h3>
          <p>Change password and security settings</p>
          <Link to="/profile/security" className="card-link">Manage →</Link>
        </div>
        <div className="dashboard-card">
          <h3>📋 My Tickets</h3>
          <p>View your purchased tickets</p>
          <Link to="/profile/tickets" className="card-link">View →</Link>
        </div>
      </div>
    </div>
  );
};

export default ParticipantDashboard;