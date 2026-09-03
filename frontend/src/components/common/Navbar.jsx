// src/components/common/Navbar.jsx
import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/events?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Έλεγχος αν βρισκόμαστε στη σελίδα
  const isSignInPage = location.pathname === '/signin';
  const isForgotPwdPage = location.pathname === '/signin/forgot-password';
  const isSignUpPage = location.pathname === '/signup';

  // Χειρισμός Logout
  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  // Παίρνουμε τα αρχικά του χρήστη για το avatar
  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    return user?.username?.charAt(0)?.toUpperCase() || 'U';
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
              {/* Profile Button with Avatar */}
              <NavLink
                to="/profile"
                className={({ isActive }) => 
                  isActive ? 'profile-btn active' : 'profile-btn'
                }
              >
                <div className="profile-avatar">
                  {getUserInitials()}
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