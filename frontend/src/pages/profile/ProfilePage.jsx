// src/pages/profile/ProfilePage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AutorenewIcon from '@mui/icons-material/Autorenew';

import AdminDashboard from '../profile/admin/AdminDashboard';
import OrganizerDashboard from '../profile/organizer/OrganizerDashboard';
import ParticipantDashboard from '../profile/participant/ParticipantDashboard';

import './ProfilePage.css';

const ProfilePage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/signin');
      return;
    }

    if (isAuthenticated && user) {
      determineUserRole();
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const determineUserRole = () => {
    if (user?.is_staff || user?.is_superuser) {
      setUserRole('admin');
      return;
    }

    if (user?.role === 'ORGANIZER' || user?.user_type === 'organizer') {
      setUserRole('organizer');
      return;
    }

    setUserRole('participant');
  };

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

  const renderDashboard = () => {
    switch (userRole) {
      case 'admin':
        return <AdminDashboard user={user} />;
      case 'organizer':
        return <OrganizerDashboard user={user} />;
      case 'participant':
        return <ParticipantDashboard user={user} />;
      default:
        return <ParticipantDashboard user={user} />;
    }
  };

  return (
    <div className="profile-page">
      {renderDashboard()}
    </div>
  );
};

export default ProfilePage;