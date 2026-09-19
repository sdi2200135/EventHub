// src/components/common/LoadingSpinner.jsx
import React from 'react';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import './LoadingSpinner.css';

/**
 * Ενιαίο loading spinner για όλη την εφαρμογή.
 *
 * Χρήση:
 *   <LoadingSpinner />                         // default "Loading..."
 *   <LoadingSpinner message="Loading events..." />
 *   <LoadingSpinner message="" />              // χωρίς κείμενο
 *   <LoadingSpinner fullHeight />              // για full-page loading
 */
const LoadingSpinner = ({ message = 'Loading...', fullHeight = false }) => {
  return (
    <div className={`loading-spinner-unified ${fullHeight ? 'full-height' : ''}`}>
      <AutorenewIcon className="loading-icon-spin" />
      {message && <p className="loading-spinner-message">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;