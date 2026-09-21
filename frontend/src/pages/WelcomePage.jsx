// src/pages/WelcomePage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './WelcomePage.css';

const WelcomePage = () => {
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);

  const goHome = () => {
    if (isLeaving) return;
    setIsLeaving(true);
    // Μικρή καθυστέρηση για να προλάβει το fade-out animation
    setTimeout(() => navigate('/homepage'), 400);
  };

  // Enter / Space για πρόσβαση (accessibility)
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goHome();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div
      className={`welcome-overlay ${isLeaving ? 'leaving' : ''}`}
      onClick={goHome}
      role="button"
      tabIndex={0}
      aria-label="Enter the application"
    >
      {/* Animated background orbs */}
      <div className="welcome-orb welcome-orb-1" aria-hidden="true" />
      <div className="welcome-orb welcome-orb-2" aria-hidden="true" />
      <div className="welcome-orb welcome-orb-3" aria-hidden="true" />
      <div className="welcome-orb welcome-orb-4" aria-hidden="true" />

      {/* Watermark logo - καλύπτει όλο το background */}
      <div className="welcome-watermark" aria-hidden="true" />

      {/* Welcome μήνυμα */}
      <div className="welcome-content">
        <h1 className="welcome-heading">Welcome to EventHub</h1>
        <p className="welcome-subtext">
          Your gateway to unforgettable experiences.
        </p>
        <p className="welcome-hint">Click anywhere to continue</p>
      </div>
    </div>
  );
};

export default WelcomePage;