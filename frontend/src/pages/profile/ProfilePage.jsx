// src/pages/profile/ProfilePage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AutorenewIcon from '@mui/icons-material/Autorenew';

import AdminDashboard from './admin/AdminDashboard';
import UserDashboard from './UserDashboard';

import './ProfilePage.css';

const ProfilePage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // ============================================
  // AUTH GUARD + LOADING
  // ============================================
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/signin');
      return;
    }

    if (isAuthenticated && user) {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  if (authLoading || loading) {
    return (
      <div className="profile-loading">
        <AutorenewIcon className="profile-loading-icon-spin" />
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // ============================================
  // RENDER DASHBOARD
  // - Admin → AdminDashboard (User Management, Export, κλπ.)
  // - Όλοι οι υπόλοιποι (participant / organizer / dual-role)
  //   → UserDashboard με όλα τα tabs
  // ============================================
  const isAdmin = user?.is_staff || user?.is_superuser;

  return (
    <div className="profile-page">
      {isAdmin ? <AdminDashboard user={user} /> : <UserDashboard user={user} />}
    </div>
  );
};

export default ProfilePage;