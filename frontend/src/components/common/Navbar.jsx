// src/components/common/Navbar.jsx
import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'; // ← ΠΡΟΣΘΗΚΗ useLocation
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation(); // ← ΠΡΟΣΘΗΚΗ

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
              <span style={{ color: '#a0a0b8', fontWeight: 500 }}>
                {user?.username}
              </span>
              <button 
                onClick={logout} 
                className="btn-signup" 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  color: '#B0B0B0'
                }}
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