// src/pages/profile/EditProfile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import './EditProfile.css';

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
    password: '',
    confirm_password: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || user.location || '',
        afm: user.afm || '',
        password: '',
        confirm_password: ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (formData.password && formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const updateData = {
        username: formData.username,        // ← ΠΡΟΣΘΗΚΗ
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        afm: formData.afm,
      };

      if (formData.password) {
        updateData.password = formData.password;
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
      // Ειδικός χειρισμός για το username
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
          <button className="btn-back" onClick={handleCancel}>
            <ArrowBackIcon />
          </button>
          <h1>Edit Profile</h1>
        </div>

        {success && (
          <div className="edit-success">
            ✅ Profile updated successfully! Redirecting...
          </div>
        )}

        {error && (
          <div className="edit-error">
            {error}
          </div>
        )}

        <form className="edit-profile-form" onSubmit={handleSubmit}>
          <div className="form-layout">
            {/* Photo */}
            <div className="form-photo-section">
              <div className="profile-photo-large">
                <span>Photo</span>
              </div>
              <button type="button" className="btn-change-photo">
                Change Photo
              </button>
            </div>

            {/* Middle Column: Personal Info */}
            <div className="form-fields-section">
              {/* Username - ΤΩΡΑ ΕΠΕΞΕΡΓΑΣΙΜΟ */}
              <div className="form-group">
                <label htmlFor="username">Username:</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username"
                  required
                />
              </div>

              <div className="form-group">
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

              <div className="form-group">
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

              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  required
                />
              </div>

              <div className="form-group">
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

              <div className="form-group">
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

              <div className="form-group">
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

              <div className="form-group">
                <label htmlFor="afm">Tax Registration Number:</label>
                <input
                  type="text"
                  id="afm"
                  name="afm"
                  value={formData.afm}
                  onChange={handleChange}
                  placeholder="Tax Registration Number"
                />
              </div>
            </div>

            {/* Right Column: Password & Actions */}
            <div className="form-actions-section">
              <div className="password-section">
                <h4>Change Password</h4>
                <div className="form-group">
                  <label htmlFor="password">New Password:</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirm_password">Confirm New Password:</label>
                  <input
                    type="password"
                    id="confirm_password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>
              </div>

              <div className="form-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={loading}
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