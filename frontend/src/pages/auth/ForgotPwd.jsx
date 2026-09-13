// src/pages/ForgotPwd.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './ForgotPwd.css';

const ForgotPwd = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      // Προσομοίωση αποστολής email
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Εδώ θα μπει η πραγματική λογική με το backend
      // π.χ. await authService.forgotPassword(email);
      
      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      <div className="forgot-card">
        {/* Title */}
        <h1 className="forgot-title">Password Recovery</h1>
        <p className="forgot-subtitle">
          Enter your email and instructions for resetting <br /> your password will be sent.
        </p>

        {/* Success Message */}
        {success && (
          <div className="forgot-success">
            ✅ Password reset instructions have been sent to your email.
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="forgot-error">
            {error}
          </div>
        )}

        {/* Form */}
        <form className="forgot-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              disabled={loading || success}
            />
          </div>

          <button 
            type="submit" 
            className="forgot-btn"
            disabled={loading || success}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>

        {/* Footer Links */}
        <div className="forgot-footer">
          <p>
            Did you remember your password?{' '}
            <Link to="/signin" className="link-signin">
              Sign in
            </Link>
          </p>
          <p>
            Don't you have an account?{' '}
            <Link to="/signup" className="link-signup">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPwd;