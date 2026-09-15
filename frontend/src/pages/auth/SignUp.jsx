// src/pages/auth/SignUp.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './auth.css';

const SignUp = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    password2: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    city: '',
    country: 'Greece',
    afm: '',
    latitude: '',
    longitude: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (formData.password !== formData.password2) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const submitData = { ...formData };
      
      if (!submitData.latitude) delete submitData.latitude;
      if (!submitData.longitude) delete submitData.longitude;
      
      console.log('Sending data to backend:', submitData);
      
      const result = await register(submitData);
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/signin');
        }, 3000);
      } else {
        if (result.error && typeof result.error === 'object') {
          const errors = Object.entries(result.error)
            .map(([key, value]) => `${key}: ${value.join(', ')}`)
            .join('\n');
          setError(errors);
        } else {
          setError(result.error || 'Registration failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          const errors = Object.entries(errorData)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n');
          setError(errors);
        } else {
          setError(errorData);
        }
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h1 className="signup-title">Create New Account</h1>

        {success && (
          <div className="signup-success">
            ✅ Registration successful! Please wait for admin approval.
            <br />
            <span className="success-note">Redirecting to Sign In...</span>
          </div>
        )}

        {error && (
          <div className="signup-error" style={{ whiteSpace: 'pre-line' }}>
            {error}
          </div>
        )}

        <form className="signup-form" onSubmit={handleSubmit}>
          {/* Username & Password */}
          <div className="auth-form-row">
            <div className="auth-form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                required
                disabled={loading || success}
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                disabled={loading || success}
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="auth-form-group">
            <label htmlFor="password2">Confirm Password *</label>
            <input
              type="password"
              id="password2"
              name="password2"
              value={formData.password2}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
              disabled={loading || success}
            />
          </div>

          {/* First Name & Last Name */}
          <div className="auth-form-row">
            <div className="auth-form-group">
              <label htmlFor="first_name">First Name *</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Enter your first name"
                required
                disabled={loading || success}
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Enter your last name"
                required
                disabled={loading || success}
              />
            </div>
          </div>

          {/* Email & Phone */}
          <div className="auth-form-row">
            <div className="auth-form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                required
                disabled={loading || success}
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="phone">Phone *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                required
                disabled={loading || success}
              />
            </div>
          </div>

          {/* Address & City */}
          <div className="auth-form-row">
            <div className="auth-form-group">
              <label htmlFor="address">Address *</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter your address"
                required
                disabled={loading || success}
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="city">City *</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter your city"
                required
                disabled={loading || success}
              />
            </div>
          </div>

          {/* Country & AFM */}
          <div className="auth-form-row">
            <div className="auth-form-group">
              <label htmlFor="country">Country *</label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Enter your country"
                required
                disabled={loading || success}
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="afm">Tax Number (AFM) *</label>
              <input
                type="text"
                id="afm"
                name="afm"
                value={formData.afm}
                onChange={handleChange}
                placeholder="Enter your tax number"
                required
                disabled={loading || success}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="signup-btn"
            disabled={loading || success}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div className="signup-footer">
          <p>
            Already have an account?{' '}
            <Link to="/signin" className="link-signin">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;