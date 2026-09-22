// src/components/RequireRole.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AutorenewIcon from '@mui/icons-material/Autorenew';

/**
 * Προστατεύει routes βάσει ρόλου χρήστη.
 *
 * Μοντέλο 2 ρόλων:
 *   - USER  → μπορεί να δημιουργεί events ΚΑΙ να κάνει κρατήσεις.
 *             Δεν υπάρχει διάκριση organizer/participant.
 *   - ADMIN → ό,τι ο USER + admin tools (User Management, Export, κλπ.)
 *
 * Χρήση:
 *   <RequireRole roles={['USER']}>
 *     <CreateEvent />
 *   </RequireRole>
 *
 *   <RequireRole roles={['ADMIN']}>
 *     <AdminDashboard />
 *   </RequireRole>
 *
 * Κανόνες:
 *   - Αν δεν είναι συνδεδεμένος → redirect στο /signin με ?redirect=...
 *   - Αν ο ρόλος του δεν είναι στη λίστα → redirect στο /
 *   - Ο admin έχει πρόσβαση παντού (περνάει από κάθε roles check)
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

  // ============================================
  // Προσδιορισμός ρόλου χρήστη (2 ρόλοι μόνο)
  // ============================================

  const isAdmin = Boolean(user?.is_staff);

  const userRole = isAdmin ? 'ADMIN' : 'USER';

  // Admin έχει πρόσβαση παντού
  if (isAdmin) return children;

  // Έλεγχος: ο ρόλος του χρήστη πρέπει να είναι στη λίστα
  if (roles.length > 0 && !roles.includes(userRole)) {
    return <Navigate to="/homepage" replace />;
  }

  return children;
};

export default RequireRole;