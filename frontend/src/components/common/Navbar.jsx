// src/components/common/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services/api';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  // ============================================
  // 1. FETCH UNREAD COUNT (όταν αλλάζει σελίδα ή user)
  // ============================================
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setUnreadCount(0);
      return;
    }

    const fetchUnread = async () => {
      try {
        const response = await messageService.getUnreadCount(user.id);
        setUnreadCount(response.data.count || 0);
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    };

    fetchUnread();
  }, [isAuthenticated, user?.id, location.pathname]);

  // ============================================
  // 2. AUTO-REFRESH κάθε 30 δευτερόλεπτα
  // ============================================
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const interval = setInterval(async () => {
      try {
        const response = await messageService.getUnreadCount(user.id);
        setUnreadCount(response.data.count || 0);
      } catch (err) {
        // Αγνόησέ το
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user?.id]);

  const isSignInPage = location.pathname === '/signin';
  const isForgotPwdPage = location.pathname === '/signin/forgot-password';
  const isSignUpPage = location.pathname === '/signup';

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    return user?.username?.charAt(0)?.toUpperCase() || 'U';
  };

  const formatBadge = (n) => {
    if (n > 99) return '99+';
    return n;
  };

  return (
    <nav className="navbar">
      <div className="container">
        {/* LOGO */}
        <div className="logo-wrapper">
          <Link to="/" className="logo">
            <span>Event</span>ize
          </Link>
        </div>

        {/* Menu */}
        <div className="nav-right">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            Home Page
          </NavLink>

          {!isSignInPage && !isForgotPwdPage && !isSignUpPage && (
            <NavLink
              to="/events"
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              Find Event
            </NavLink>
          )}

          {isAuthenticated ? (
            <>
              {/* Profile Button with Avatar + Badge */}
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  isActive ? 'profile-btn active' : 'profile-btn'
                }
              >
                <div className="profile-avatar-wrapper">
                  <div className="profile-avatar">
                    {getUserInitials()}
                  </div>
                  {unreadCount > 0 && (
                    <span className="nav-badge">
                      {formatBadge(unreadCount)}
                    </span>
                  )}
                </div>
                <span className="profile-text">Profile</span>
              </NavLink>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="btn-logout"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/signin"
                className={({ isActive }) =>
                  isActive ? 'btn-signin active' : 'btn-signin'
                }
              >
                Sign In
              </NavLink>

              <NavLink
                to="/signup"
                className={({ isActive }) =>
                  isActive ? 'btn-signup active' : 'btn-signup'
                }
              >
                Sign Up
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;