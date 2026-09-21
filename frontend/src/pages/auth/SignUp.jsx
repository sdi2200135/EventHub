// src/pages/auth/SignUp.jsx
import React, { useState, useMemo } from 'react';
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

  // ============================================
  // PASSWORD REQUIREMENTS
  // ============================================
  // Μόνο αγγλικά γράμματα, αριθμοί και "κοινά" σύμβολα
  const ALLOWED_PASSWORD_REGEX = /^[A-Za-z0-9!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]+$/;

  const passwordChecks = useMemo(() => {
    const pwd = formData.password || '';
    return {
      length: pwd.length >= 8,
      english: pwd.length > 0 && ALLOWED_PASSWORD_REGEX.test(pwd),
      letter: /[A-Za-z]/.test(pwd),
      number: /\d/.test(pwd),
      symbol: /[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]/.test(pwd),
    };
  }, [formData.password]);

  const isPasswordValid =
    passwordChecks.length &&
    passwordChecks.english &&
    passwordChecks.letter &&
    passwordChecks.number &&
    passwordChecks.symbol;

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Phone: μόνο ψηφία, max 10
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, phone: digitsOnly }));
      return;
    }

    // AFM: μόνο ψηφία, max 9
    if (name === 'afm') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 9);
      setFormData(prev => ({ ...prev, afm: digitsOnly }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // Validation: password requirements
    if (!isPasswordValid) {
      setError('Password does not meet all the requirements.');
      setLoading(false);
      return;
    }

    // Validation: passwords match
    if (formData.password !== formData.password2) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validation: phone - ακριβώς 10 ψηφία
    if (!/^\d{10}$/.test(formData.phone)) {
      setError('Phone number must be exactly 10 digits.');
      setLoading(false);
      return;
    }

    // Validation: AFM - ακριβώς 9 ψηφία
    if (!/^\d{9}$/.test(formData.afm)) {
      setError('Tax Number (TRN) must be exactly 9 digits.');
      setLoading(false);
      return;
    }

    try {
      const submitData = { ...formData };

      if (submitData.latitude !== '') {
        submitData.latitude = parseFloat(submitData.latitude);
      } else {
        delete submitData.latitude;
      }
      if (submitData.longitude !== '') {
        submitData.longitude = parseFloat(submitData.longitude);
      } else {
        delete submitData.longitude;
      }

      console.log('Sending data to backend:', submitData);

      const result = await register(submitData);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 8000);
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

  // Helper για rendering requirement
  const Requirement = ({ ok, children }) => (
    <li className={`pwd-req ${ok ? 'ok' : ''}`}>
      <span className="pwd-req-icon">{ok ? '✓' : '○'}</span>
      {children}
    </li>
  );

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h1 className="signup-title">Create New Account</h1>

        {success && (
          <div className="signup-success">
            ✅ Registration successful! Please wait for admin approval.
            <br />
            <span className="success-note">Redirecting to Home Page...</span>
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
                autoComplete="new-password"
              />

              {/* Password requirements - live, κλείνει όταν είναι valid */}
              {formData.password.length > 0 && !isPasswordValid && (
                <ul className="pwd-requirements">
                  <Requirement ok={passwordChecks.length}>
                    At least 8 characters
                  </Requirement>
                  <Requirement ok={passwordChecks.english}>
                    Only English characters (no Greek/other)
                  </Requirement>
                  <Requirement ok={passwordChecks.letter}>
                    At least 1 letter (A-Z, a-z)
                  </Requirement>
                  <Requirement ok={passwordChecks.number}>
                    At least 1 number (0-9)
                  </Requirement>
                  <Requirement ok={passwordChecks.symbol}>
                    At least 1 symbol (!@#$%^&*...)
                  </Requirement>
                </ul>
              )}
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
              autoComplete="new-password"
            />
            {formData.password2.length > 0 &&
              formData.password !== formData.password2 && (
                <span className="pwd-mismatch">Passwords do not match</span>
              )}
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
              <label htmlFor="phone">Phone * (10 digits)</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 6912345678"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                title="Please enter exactly 10 digits"
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
              <label htmlFor="afm">Tax Number (TRN) * (9 digits)</label>
              <input
                type="text"
                id="afm"
                name="afm"
                value={formData.afm}
                onChange={handleChange}
                placeholder="e.g. 123456789"
                inputMode="numeric"
                pattern="\d{9}"
                maxLength={9}
                title="Please enter exactly 9 digits"
                required
                disabled={loading || success}
              />
            </div>
          </div>

          {/* Latitude & Longitude */}
          <div className="auth-form-row">
            <div className="auth-form-group">
              <label htmlFor="latitude">Latitude</label>
              <input
                type="number"
                id="latitude"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="e.g. 37.9838"
                step="any"
                min="-90"
                max="90"
                disabled={loading || success}
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="longitude">Longitude</label>
              <input
                type="number"
                id="longitude"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="e.g. 23.7275"
                step="any"
                min="-180"
                max="180"
                disabled={loading || success}
              />
            </div>
          </div>

          <button
            type="submit"
            className="signup-btn"
            disabled={loading || success || !isPasswordValid}
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