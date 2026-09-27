// src/components/RequireRole.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AutorenewIcon from '@mui/icons-material/Autorenew';

/**
 * Protects routes based on user role.
 *
 * role model:
 *   - USER  → can create events AND make bookings.
 *             There is no distinction between organizer/participant.
 *   - ADMIN → everything a USER can do + admin tools (User Management, Export, etc.)
 *
 * Usage:
 *   <RequireRole roles={['USER']}>
 *     <CreateEvent />
 *   </RequireRole>
 *
 *   <RequireRole roles={['ADMIN']}>
 *     <AdminDashboard />
 *   </RequireRole>
 *
 * Rules:
 *   - If not signed in → redirect to /signin with ?redirect=...
 *   - If the user's role is not in the list → redirect to /
 *   - Admin has access everywhere (passes any roles check)
 */
const RequireRole = ({ roles = [], children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  // While the auth state is loading, show a spinner to avoid a wrong redirect
  if (loading) {
    return (
      <div className="require-role-loading">
        <AutorenewIcon className="loading-icon-spin" />
        <p>Loading...</p>
      </div>
    );
  }

  // If not signed in → signin with redirect back to the path
  if (!isAuthenticated) {
    return <Navigate to={`/signin`} replace />;
  }

  // ============================================
  // Determine the user's role (2 roles only)
  // ============================================

  const isAdmin = Boolean(user?.is_staff);

  const userRole = isAdmin ? 'ADMIN' : 'USER';

  // Admin has access everywhere
  if (isAdmin) return children;

  // Check: the user's role must be in the list
  if (roles.length > 0 && !roles.includes(userRole)) {
    return <Navigate to="/homepage" replace />;
  }

  return children;
};

export default RequireRole;