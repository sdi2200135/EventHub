// src/pages/profile/ProfilePage.jsx
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './admin/AdminDashboard';
import UserDashboard from './UserDashboard';

import './ProfilePage.css';

const ProfilePage = () => {
  const { user } = useAuth();
  return (
    <div className="profile-page">
      {user?.is_staff ? <AdminDashboard user={user} /> : <UserDashboard user={user} />}
    </div>
  );
};

export default ProfilePage;