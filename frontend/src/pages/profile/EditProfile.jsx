// src/pages/profile/EditProfile.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import './EditProfile.css';

// ============================================
// PASSWORD REQUIREMENTS (ίδια λογική με SignUp)
// ============================================
const ALLOWED_PASSWORD_REGEX = /^[A-Za-z0-9!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]+$/;

// Helper για rendering requirement
const Requirement = ({ ok, children }) => (
  <li className={`pwd-req ${ok ? 'ok' : ''}`}>
    <span className="pwd-req-icon">{ok ? '✓' : '○'}</span>
    {children}
  </li>
);

const EditProfile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    afm: '',
    latitude: '',
    longitude: '',
    current_password: '',
    password: '',
    confirm_password: ''
  });

  const passwordChecks = useMemo(() => {
    const pwd = formData.password || '';
    return {
      length: pwd.length >= 8,
      english: pwd.length > 0 && ALLOWED_PASSWORD_REGEX.test(pwd),
      letter: /[A-Za-z]/.test(pwd),
      number: /\d/.test(pwd),
      symbol: /[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/.test(pwd),
    };
  }, [formData.password]);

  const isPasswordValid =
    passwordChecks.length &&
    passwordChecks.english &&
    passwordChecks.letter &&
    passwordChecks.number &&
    passwordChecks.symbol;

  const isChangingPassword = formData.password.length > 0;

  // ============================================
  // LOAD USER DATA
  // ============================================
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        afm: user.afm || '',
        latitude:
          user.latitude ??
          user.lat ??
          user.location?.latitude ??
          user.location?.lat ??
          '',
        longitude:
          user.longitude ??
          user.lng ??
          user.lon ??
          user.location?.longitude ??
          user.location?.lng ??
          '',
        password: '',
        confirm_password: '',
        current_password: ''
      });
    }
  }, [user]);

  // Read-only πεδία
  const userRegisteredAt =
    user?.date_joined ??
    user?.created_at ??
    user?.registered_at ??
    user?.registration_date ??
    user?.created;

  const userLastLogin =
    user?.last_login ??
    user?.last_login_at ??
    user?.lastLogin;

  const formatRegisteredDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatLastLogin = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return (
      d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // ---- Password validation ----
    if (isChangingPassword) {
      if (!formData.current_password) {
        setError('Enter your current password in order to change it.');
        return;
      }
      if (!isPasswordValid) {
        setError('Password does not meet all the requirements.');
        return;
      }
      if (formData.password !== formData.confirm_password) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);

    try {
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
      };

      // Συντεταγμένες — στέλνονται μόνο αν είναι συμπληρωμένες
      if (formData.latitude !== '' && formData.latitude !== null) {
        updateData.latitude = Number(formData.latitude);
      }
      if (formData.longitude !== '' && formData.longitude !== null) {
        updateData.longitude = Number(formData.longitude);
      }

      if (isChangingPassword) {
        updateData.new_password = formData.password;
        updateData.current_password = formData.current_password;
      }

      const response = await authService.updateProfile(updateData);

      if (response.data) {
        setUser(prev => ({ ...prev, ...response.data }));
      }

      setSuccess(true);

      setTimeout(() => {
        navigate('/profile');
      }, 2000);
    } catch (err) {
      console.error('Update profile error:', err);
      const errorData = err.response?.data;
      if (errorData?.username) {
        setError(`Username: ${errorData.username.join(', ')}`);
      } else {
        setError(
          errorData?.detail ||
          errorData?.message ||
          'Failed to update profile. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/profile');
  };

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-container">
        <div className="edit-profile-header">
          <button className="edit-profile-btn-back" onClick={handleCancel}>
            <ArrowBackIcon />
          </button>
          <h1>Edit Profile</h1>
        </div>

        {success && (
          <div className="edit-profile-success">
            ✅ Profile updated successfully! Redirecting...
          </div>
        )}

        {error && (
          <div className="edit-profile-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="edit-profile-form-layout">
            {/* LEFT COLUMN: Personal Info */}
            <div className="edit-profile-fields-section">
              <div className="edit-profile-form-group">
                <label htmlFor="username">Username:</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  disabled
                  className="input-disabled"
                  placeholder="Username"
                />
              </div>

              <div className="edit-profile-form-group">
                <label htmlFor="first_name">First Name:</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="First Name"
                  required
                />
              </div>

              <div className="edit-profile-form-group">
                <label htmlFor="last_name">Last Name:</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Last Name"
                  required
                />
              </div>

              <div className="edit-profile-form-group">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="input-disabled"
                  placeholder="Email"
                />
              </div>

              {/* ΝΕΑ read-only πεδία */}
              <div className="edit-profile-form-group">
                <label htmlFor="registered">Registered:</label>
                <input
                  type="text"
                  id="registered"
                  value={formatRegisteredDate(userRegisteredAt)}
                  disabled
                  className="input-disabled"
                />
              </div>

              <div className="edit-profile-form-group">
                <label htmlFor="last_login">Last Login:</label>
                <input
                  type="text"
                  id="last_login"
                  value={formatLastLogin(userLastLogin)}
                  disabled
                  className="input-disabled"
                />
              </div>
            </div>

            {/* CENTER COLUMN: Contact & Location */}
            <div className="edit-profile-fields-section">
              <div className="edit-profile-form-group">
                <label htmlFor="phone">Phone Number:</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone Number"
                />
              </div>

              <div className="edit-profile-form-group">
                <label htmlFor="address">Address:</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Address"
                />
              </div>

              <div className="edit-profile-form-group">
                <label htmlFor="city">Location:</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Location"
                />
              </div>

              {/* ΝΕΑ επεξεργάσιμα πεδία */}
              <div className="edit-profile-form-group">
                <label htmlFor="latitude">Latitude:</label>
                <input
                  type="number"
                  id="latitude"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  placeholder="e.g. 37.98381"
                  step="any"
                  min="-90"
                  max="90"
                />
              </div>

              <div className="edit-profile-form-group">
                <label htmlFor="longitude">Longitude:</label>
                <input
                  type="number"
                  id="longitude"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  placeholder="e.g. 23.72754"
                  step="any"
                  min="-180"
                  max="180"
                />
              </div>

              <div className="edit-profile-form-group">
                <label htmlFor="afm">Tax Registration Number:</label>
                <input
                  type="text"
                  id="afm"
                  name="afm"
                  value={formData.afm}
                  disabled
                  className="input-disabled"
                  placeholder="Tax Registration Number"
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Password & Actions */}
            <div className="edit-profile-actions-section">
              <div className="edit-profile-password-section">
                <h4>Change Password</h4>
                <div className="edit-profile-form-group">
                  <label htmlFor="current_password">Current Password:</label>
                  <input
                    type="password"
                    id="current_password"
                    name="current_password"
                    value={formData.current_password}
                    onChange={handleChange}
                    autoComplete="current-password"
                  />
                </div>
                <div className="edit-profile-form-group">
                  <label htmlFor="password">New Password:</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder=""
                    autoComplete="new-password"
                  />

                  {isChangingPassword && !isPasswordValid && (
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

                <div className="edit-profile-form-group">
                  <label htmlFor="confirm_password">Confirm New Password:</label>
                  <input
                    type="password"
                    id="confirm_password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder=""
                    autoComplete="new-password"
                  />
                  {formData.confirm_password.length > 0 &&
                    formData.password !== formData.confirm_password && (
                      <span className="pwd-mismatch">Passwords do not match</span>
                    )}
                </div>
              </div>

              <div className="edit-profile-form-buttons">
                <button
                  type="button"
                  className="edit-profile-btn-cancel"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="edit-profile-btn-save"
                  disabled={loading || (isChangingPassword && !isPasswordValid)}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;