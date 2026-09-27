// src/components/common/LoadingSpinner.jsx
import AutorenewIcon from '@mui/icons-material/Autorenew';
import './LoadingSpinner.css';

/**
 * Unified loading spinner for the entire application.
 *
 * Usage:
 *   <LoadingSpinner />                         // default "Loading..."
 *   <LoadingSpinner message="Loading events..." />
 *   <LoadingSpinner message="" />              // without text
 *   <LoadingSpinner fullHeight />              // for full-page loading
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