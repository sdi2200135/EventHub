// src/components/RequireRole.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AutorenewIcon from '@mui/icons-material/Autorenew';

/**
 * Προστατεύει routes βάσει ρόλου χρήστη.
 *
 * Χρήση:
 *   <RequireRole roles={['ORGANIZER']}>
 *     <CreateEvent />
 *   </RequireRole>
 *
 * Κανόνες:
 *  - Αν δεν είναι συνδεδεμένος → redirect στο /signin με ?redirect=...
 *  - Αν είναι συνδεδεμένος αλλά δεν έχει τον κατάλληλο ρόλο → redirect στο /
 *  - Ο admin έχει πάντα πρόσβαση (is_staff ή is_superuser)
 *  - Ο organizer έχει πρόσβαση μόνο σε organizer routes
 *  - Ο participant έχει πρόσβαση μόνο σε participant routes
 */
const RequireRole = ({ roles = [], children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Όσο φορτώνει το auth state, δείξε spinner για να μην κάνουμε λάθος redirect
  if (loading) {
    return (
      <div className="require-role-loading">
        <AutorenewIcon className="loading-icon-spin" />
        <p>Loading...</p>
      </div>
    );
  }

  // Αν δεν είναι συνδεδεμένος → signin με redirect πίσω στο path
  if (!isAuthenticated) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/signin?redirect=${redirectUrl}`} replace />;
  }

  // Προσδιορισμός ρόλου χρήστη
  const isAdmin = user?.is_staff || user?.is_superuser;
  const userRole = isAdmin
    ? 'ADMIN'
    : user?.role === 'ORGANIZER' || user?.user_type === 'organizer'
    ? 'ORGANIZER'
    : 'PARTICIPANT';

  // Admin έχει πρόσβαση παντού
  if (isAdmin) return children;

  // Έλεγχος αν ο ρόλος του χρήστη είναι στη λίστα
  if (roles.length > 0 && !roles.includes(userRole)) {
    // Δεν έχει πρόσβαση → πίσω στην αρχική
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RequireRole;