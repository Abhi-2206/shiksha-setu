import { useState, useEffect } from 'react';
import { studentApi } from '../api';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

const RAJASTHAN_DISTRICTS = [
  'Jaipur', 'Jodhpur', 'Kota', 'Ajmer', 'Bikaner',
  'Udaipur', 'Alwar', 'Bharatpur', 'Bhilwara', 'Sikar',
  'Pali', 'Nagaur', 'Chittorgarh', 'Jhunjhunu', 'Barmer',
  'Banswara', 'Dungarpur', 'Tonk', 'Sawai Madhopur', 'Dholpur',
];

const BRANCH_OPTIONS = [
  'Computer Science & Engineering',
  'Civil Engineering',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Electronics Engineering',
  'Information Technology',
  'Automobile Engineering',
  'Chemical Engineering',
];

const CATEGORIES = ['GENERAL', 'OBC', 'SC', 'ST', 'EWS', 'MBC'];

function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: 'MALE',
    domicileState: 'Rajasthan',
    district: '',
    city: '',
    tenthPercentage: '',
    twelfthPercentage: '',
    passingYear: '',
    instituteName: '',
    category: 'GENERAL',
    preferredBranch: 'Computer Science & Engineering',
    preferredCity: 'Jaipur',
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      setLoading(true);
      setError(null);
      try {
        const res = await studentApi.getProfile();
        if (isMounted && res.success && res.profile) {
          const p = res.profile;
          let dobFormatted = '';
          if (p.dateOfBirth) {
            const d = new Date(p.dateOfBirth);
            if (!isNaN(d.getTime())) dobFormatted = d.toISOString().split('T')[0];
          }

          setFormData({
            fullName: p.fullName || user?.name || '',
            phoneNumber: p.phoneNumber || '',
            dateOfBirth: dobFormatted,
            gender: p.gender || 'MALE',
            domicileState: p.domicileState || 'Rajasthan',
            district: p.district || '',
            city: p.city || '',
            tenthPercentage: p.tenthPercentage !== null && p.tenthPercentage !== undefined ? String(p.tenthPercentage) : '',
            twelfthPercentage: p.twelfthPercentage !== null && p.twelfthPercentage !== undefined ? String(p.twelfthPercentage) : '',
            passingYear: p.passingYear ? String(p.passingYear) : '',
            instituteName: p.instituteName || '',
            category: p.category ? p.category.toUpperCase() : 'GENERAL',
            preferredBranch: p.preferredBranch || 'Computer Science & Engineering',
            preferredCity: p.preferredCity || 'Jaipur',
          });
        }
      } catch (_err) {
        if (isMounted) {
          // If no profile created yet, initialize with user name
          setFormData((prev) => ({ ...prev, fullName: user?.name || '' }));
          setIsEditing(true); // default to edit mode if blank
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const validate = () => {
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Full Name is required';

    if (formData.phoneNumber) {
      const cleanPhone = formData.phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 10) errors.phoneNumber = 'Enter a valid 10-digit mobile number';
    }

    if (formData.tenthPercentage !== '') {
      const val = parseFloat(formData.tenthPercentage);
      if (isNaN(val) || val < 0 || val > 100) errors.tenthPercentage = 'Enter a percentage between 0 and 100';
    }

    if (formData.twelfthPercentage !== '') {
      const val = parseFloat(formData.twelfthPercentage);
      if (isNaN(val) || val < 0 || val > 100) errors.twelfthPercentage = 'Enter a percentage between 0 and 100';
    }

    if (formData.passingYear !== '') {
      const yr = parseInt(formData.passingYear, 10);
      if (isNaN(yr) || yr < 1980 || yr > 2030) errors.passingYear = 'Enter a valid 4-digit passing year';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim() || null,
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender,
        domicileState: formData.domicileState.trim() || 'Rajasthan',
        district: formData.district || null,
        city: formData.city.trim() || null,
        tenthPercentage: formData.tenthPercentage !== '' ? parseFloat(formData.tenthPercentage) : null,
        twelfthPercentage: formData.twelfthPercentage !== '' ? parseFloat(formData.twelfthPercentage) : null,
        passingYear: formData.passingYear ? parseInt(formData.passingYear, 10) : null,
        instituteName: formData.instituteName.trim() || null,
        category: formData.category,
        preferredBranch: formData.preferredBranch || null,
        preferredCity: formData.preferredCity.trim() || null,
      };

      const res = await studentApi.saveProfile(payload);
      if (res.success) {
        setSuccessMsg('Academic profile and counseling preferences saved successfully.');
        setIsEditing(false);
        refreshUser();
      } else {
        throw new Error(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Save profile error:', err);
      setError(err.message || 'Failed to save profile. Please verify your details.');
    } finally {
      setSaving(false);
    }
  };

  // Completion calculation
  const fields = [
    Boolean(formData.fullName),
    Boolean(formData.phoneNumber),
    Boolean(formData.tenthPercentage !== ''),
    Boolean(formData.twelfthPercentage !== ''),
    Boolean(formData.category),
    Boolean(formData.domicileState),
    Boolean(formData.preferredBranch),
    Boolean(formData.preferredCity),
  ];
  const completionPercent = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  return (
    <div className="profile-page">
      
      {/* 1. Header */}
      <header className="page-header">
        <span className="page-header-badge">
          Student Portal • Rajasthan Technical Education
        </span>
        <h1 className="page-header-title">
          Academic Profile & <span>Preferences</span>
        </h1>
        <p className="page-header-subtitle">
          Keep your qualifying examination scores, reservation category, and counseling choices 
          current to receive precise cutoff matches and college seat recommendations.
        </p>
      </header>

      {/* 2. Completion Card */}
      <section className="profile-completion-card">
        <div className="completion-info">
          <div>
            <h3 className="completion-title">Profile Verification Status</h3>
            <span className="completion-sub">
              {completionPercent === 100
                ? 'Your student records are complete and verified for counseling.'
                : 'Fill all academic and category fields to enable automated recommendations.'}
            </span>
          </div>
          <div className="completion-score-badge">{completionPercent}%</div>
        </div>
        <div className="completion-bar">
          <div className="completion-bar-fill" style={{ width: `${completionPercent}%` }}></div>
        </div>
      </section>

      {/* Notifications */}
      {successMsg && (
        <div className="profile-alert alert-success">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="alert-close">✕</button>
        </div>
      )}

      {error && (
        <div className="profile-alert alert-danger">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="alert-close">✕</button>
        </div>
      )}

      {/* 3. Main Profile Form */}
      {loading ? (
        <div className="profile-loading-box">
          <div className="spinner"></div>
          <p>Loading your profile details...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="profile-card">
          
          <div className="profile-card-header">
            <h2 className="card-section-title">Personal Information</h2>
            {!isEditing ? (
              <button
                type="button"
                className="btn-edit-toggle"
                onClick={() => setIsEditing(true)}
              >
                ✏️ Edit Profile
              </button>
            ) : (
              <button
                type="button"
                className="btn-cancel-edit"
                onClick={() => {
                  setIsEditing(false);
                  setValidationErrors({});
                }}
              >
                Cancel
              </button>
            )}
          </div>

          <div className="profile-form-grid">
            
            {/* Full Name */}
            <div className="form-group">
              <label>Full Name <span className="req">*</span></label>
              <input
                type="text"
                className={`form-input ${validationErrors.fullName ? 'input-error' : ''}`}
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                disabled={!isEditing}
                required
              />
              {validationErrors.fullName && (
                <span className="field-error">{validationErrors.fullName}</span>
              )}
            </div>

            {/* Email (Read only from auth) */}
            <div className="form-group">
              <label>Registered Email</label>
              <input
                type="email"
                className="form-input"
                value={user?.email || ''}
                disabled
                title="Email is tied to your account authentication"
              />
              <span className="input-hint">Verified authentication email</span>
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label>Mobile Number</label>
              <input
                type="tel"
                className={`form-input ${validationErrors.phoneNumber ? 'input-error' : ''}`}
                placeholder="10-digit mobile number"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                disabled={!isEditing}
              />
              {validationErrors.phoneNumber && (
                <span className="field-error">{validationErrors.phoneNumber}</span>
              )}
            </div>

            {/* Date of Birth */}
            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                className="form-input"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            {/* Gender */}
            <div className="form-group">
              <label>Gender</label>
              <select
                className="form-input"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                disabled={!isEditing}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Domicile State */}
            <div className="form-group">
              <label>Domicile State</label>
              <select
                className="form-input"
                value={formData.domicileState}
                onChange={(e) => setFormData({ ...formData, domicileState: e.target.value })}
                disabled={!isEditing}
              >
                <option value="Rajasthan">Rajasthan (State Bonafide)</option>
                <option value="Other">Other State</option>
              </select>
            </div>

            {/* District */}
            <div className="form-group">
              <label>Home District</label>
              <select
                className="form-input"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                disabled={!isEditing}
              >
                <option value="">Select District</option>
                {RAJASTHAN_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div className="form-group">
              <label>City / Tehsil</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Sanganer"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={!isEditing}
              />
            </div>

          </div>

          {/* Academic Records */}
          <div className="form-divider"></div>
          <h2 className="card-section-title">Academic Qualifications</h2>

          <div className="profile-form-grid">
            
            {/* 10th Percentage */}
            <div className="form-group">
              <label>10th Standard Percentage (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className={`form-input ${validationErrors.tenthPercentage ? 'input-error' : ''}`}
                placeholder="e.g. 81.40"
                value={formData.tenthPercentage}
                onChange={(e) => setFormData({ ...formData, tenthPercentage: e.target.value })}
                disabled={!isEditing}
              />
              {validationErrors.tenthPercentage && (
                <span className="field-error">{validationErrors.tenthPercentage}</span>
              )}
            </div>

            {/* 12th Percentage */}
            <div className="form-group">
              <label>12th / ITI Percentage (If applicable)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className={`form-input ${validationErrors.twelfthPercentage ? 'input-error' : ''}`}
                placeholder="e.g. 76.20"
                value={formData.twelfthPercentage}
                onChange={(e) => setFormData({ ...formData, twelfthPercentage: e.target.value })}
                disabled={!isEditing}
              />
              {validationErrors.twelfthPercentage && (
                <span className="field-error">{validationErrors.twelfthPercentage}</span>
              )}
            </div>

            {/* Passing Year */}
            <div className="form-group">
              <label>Passing Year</label>
              <input
                type="number"
                className={`form-input ${validationErrors.passingYear ? 'input-error' : ''}`}
                placeholder="e.g. 2025"
                value={formData.passingYear}
                onChange={(e) => setFormData({ ...formData, passingYear: e.target.value })}
                disabled={!isEditing}
              />
              {validationErrors.passingYear && (
                <span className="field-error">{validationErrors.passingYear}</span>
              )}
            </div>

            {/* School / Institute */}
            <div className="form-group">
              <label>Last Attended School / Institute</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Govt. Senior Secondary School"
                value={formData.instituteName}
                onChange={(e) => setFormData({ ...formData, instituteName: e.target.value })}
                disabled={!isEditing}
              />
            </div>

          </div>

          {/* Counseling & Admission Preferences */}
          <div className="form-divider"></div>
          <h2 className="card-section-title">Counseling & Branch Preferences</h2>

          <div className="profile-form-grid">
            
            {/* Category */}
            <div className="form-group">
              <label>Reservation Category <span className="req">*</span></label>
              <select
                className="form-input"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={!isEditing}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Preferred Branch */}
            <div className="form-group">
              <label>Preferred Diploma Stream</label>
              <select
                className="form-input"
                value={formData.preferredBranch}
                onChange={(e) => setFormData({ ...formData, preferredBranch: e.target.value })}
                disabled={!isEditing}
              >
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Preferred City */}
            <div className="form-group">
              <label>Preferred College City</label>
              <select
                className="form-input"
                value={formData.preferredCity}
                onChange={(e) => setFormData({ ...formData, preferredCity: e.target.value })}
                disabled={!isEditing}
              >
                {RAJASTHAN_DISTRICTS.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Save Button Row */}
          {isEditing && (
            <div className="profile-submit-row">
              <button
                type="button"
                className="btn-cancel-edit"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn-save-profile" disabled={saving}>
                {saving ? (
                  <span className="btn-loading">
                    <span className="spinner-sm"></span> Saving Profile...
                  </span>
                ) : (
                  'Save Profile & Preferences'
                )}
              </button>
            </div>
          )}

        </form>
      )}

    </div>
  );
}

export default ProfilePage;
