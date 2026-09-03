// src/pages/ProfilePage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AutorenewIcon from '@mui/icons-material/Autorenew';

// Import των επιμέρους σελίδων ανά ρόλο
import AdminDashboard from './AdminDashboard';
import OrganizerDashboard from './OrganizerDashboard';
import ParticipantDashboard from './ParticipantDashboard';

import './ProfilePage.css';

const ProfilePage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Έλεγχος αν ο χρήστης είναι συνδεδεμένος
    if (!authLoading && !isAuthenticated) {
      navigate('/signin');
      return;
    }

    if (isAuthenticated && user) {
      determineUserRole();
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  // Προσδιορισμός ρόλου χρήστη
  const determineUserRole = () => {
    // Έλεγχος αν είναι admin (is_staff ή is_superuser)
    if (user?.is_staff || user?.is_superuser) {
      setUserRole('admin');
      return;
    }

    // Έλεγχος αν είναι organizer
    if (user?.role === 'ORGANIZER' || user?.user_type === 'organizer') {
      setUserRole('organizer');
      return;
    }

    // Default: participant
    setUserRole('participant');
  };

  // Φόρτωση
  if (authLoading || loading) {
    return (
      <div className="profile-loading">
        <AutorenewIcon className="loading-icon-spin" />
        <p>Loading profile...</p>
      </div>
    );
  }

  // Αν δεν είναι συνδεδεμένος, ανακατεύθυνση
  if (!isAuthenticated) {
    return null;
  }

  // Εμφάνιση της αντίστοιχης σελίδας ανάλογα με το ρόλο
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