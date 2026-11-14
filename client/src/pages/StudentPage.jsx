import React, { useState, useEffect, useCallback } from 'react';
import './StudentPage.css';

// Initial state for new student form
const initialFormData = {
  name: '',
  email: '',
  password: '',
  dateOfBirth: '',
  gender: '',
  phoneNumber: '',
  state: 'Rajasthan',
  district: '',
  city: '',
  currentEducationLevel: '',
  instituteName: '',
  courseOrStream: '',
  passingYear: '',
  percentageOrCgpa: '',
};

// Student Management Page Component - Milestone 3 & Milestone 4 (Add Student)
function StudentPage() {
  // Search and filter states (Part A)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedCourse, setSelectedCourse] = useState('ALL');

  // Directory data & UI states
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // Add Student Modal & Form states (Part B)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formApiError, setFormApiError] = useState(null);

  // Rajasthan District Filter Options
  const districtOptions = [
    'Jaipur', 'Jodhpur', 'Kota', 'Ajmer', 'Bikaner',
    'Udaipur', 'Alwar', 'Bharatpur', 'Bhilwara', 'Sikar'
  ];

  // Technical Education Courses / Diploma Streams
  const courseOptions = [
    'Computer Science & Engineering',
    'Civil Engineering',
    'Mechanical Engineering',
    'Electrical Engineering',
    'Electronics Engineering',
    'Information Technology'
  ];

  /**
   * Native fetch() to retrieve students from GET /api/students
   * Supports search, district, and courseOrStream filters
   */
  const fetchStudents = useCallback(async (searchQuery = searchTerm) => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (!token) {
      setLoading(false);
      setError('Authentication Required: Administrator JWT token not found in storage. Please log in with an Administrator account.');
      setStudents([]);
      return;
    }

    try {
      const params = new URLSearchParams();

      if (searchQuery && searchQuery.trim() !== '') {
        params.append('search', searchQuery.trim());
      }
      if (selectedDistrict && selectedDistrict !== 'ALL') {
        params.append('district', selectedDistrict);
      }
      if (selectedCourse && selectedCourse !== 'ALL') {
        params.append('courseOrStream', selectedCourse);
      }

      const queryString = params.toString();
      const endpoint = `/api/students${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your session has expired or the token is invalid (401 Unauthorized). Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access Denied (403 Forbidden): Administrator privileges are required to view the Student Directory.');
        } else {
          throw new Error(data.message || `Server returned error status ${response.status}`);
        }
      }

      if (data.success && Array.isArray(data.students)) {
        setStudents(data.students);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error('Fetch students error:', err);
      setError(err.message || 'Network error connecting to backend server.');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDistrict, selectedCourse]);

  // Load students on mount and whenever district/course changes
  useEffect(() => {
    fetchStudents(searchTerm);
  }, [fetchStudents]);

  // Search submission
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchStudents(searchTerm);
  };

  // Clear search term
  const handleSearchClear = () => {
    setSearchTerm('');
    fetchStudents('');
  };

  // Reset all search and filter dropdowns
  const handleResetAllFilters = () => {
    setSearchTerm('');
    setSelectedDistrict('ALL');
    setSelectedCourse('ALL');
  };

  const hasActiveFilters = searchTerm.trim() !== '' || selectedDistrict !== 'ALL' || selectedCourse !== 'ALL';

  /* =========================================================
     Part B: Add Student Form & Validation Handling
     ========================================================= */

  const handleInputChange = (field, value) => {
    setAddFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field-specific error as user types
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateAddForm = () => {
    const errors = {};

    // 1. Full name validation
    if (!addFormData.name || !addFormData.name.trim()) {
      errors.name = 'Student full name is required.';
    }

    // 2. Email validation
    if (!addFormData.email || !addFormData.email.trim()) {
      errors.email = 'Email address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(addFormData.email.trim())) {
        errors.email = 'Please provide a valid email address.';
      }
    }

    // 3. Passing Year validation (optional, but if provided must be between 1980 and 2050)
    if (addFormData.passingYear) {
      const year = parseInt(addFormData.passingYear, 10);
      if (isNaN(year) || year < 1980 || year > 2050) {
        errors.passingYear = 'Passing year must be between 1980 and 2050.';
      }
    }

    // 4. Percentage / CGPA validation (optional, but if provided must be between 0 and 100)
    if (addFormData.percentageOrCgpa !== '' && addFormData.percentageOrCgpa !== null && addFormData.percentageOrCgpa !== undefined) {
      const score = parseFloat(addFormData.percentageOrCgpa);
      if (isNaN(score) || score < 0 || score > 100) {
        errors.percentageOrCgpa = 'Percentage/CGPA must be a valid number between 0 and 100.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * POST /api/students using native fetch()
   */
  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    setFormApiError(null);

    // Validate inputs
    if (!validateAddForm()) {
      return;
    }

    setFormSubmitting(true);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (!token) {
      setFormApiError('Administrator token is missing. Please log in again.');
      setFormSubmitting(false);
      return;
    }

    try {
      // Build payload matching backend expected fields
      const payload = {
        name: addFormData.name.trim(),
        email: addFormData.email.trim().toLowerCase(),
        password: addFormData.password.trim() || undefined,
        dateOfBirth: addFormData.dateOfBirth || null,
        gender: addFormData.gender || null,
        phoneNumber: addFormData.phoneNumber.trim() || null,
        state: addFormData.state.trim() || 'Rajasthan',
        district: addFormData.district || null,
        city: addFormData.city.trim() || null,
        currentEducationLevel: addFormData.currentEducationLevel || null,
        instituteName: addFormData.instituteName.trim() || null,
        courseOrStream: addFormData.courseOrStream || null,
        passingYear: addFormData.passingYear ? parseInt(addFormData.passingYear, 10) : null,
        percentageOrCgpa: addFormData.percentageOrCgpa !== '' ? parseFloat(addFormData.percentageOrCgpa) : null,
      };

      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(data.message || 'Invalid student data or email already in use.');
        } else if (response.status === 401) {
          throw new Error('Your session has expired (401 Unauthorized). Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied (403 Forbidden). Admin privileges required.');
        } else {
          throw new Error(data.message || `Server returned error status ${response.status}`);
        }
      }

      // Successful creation
      setIsAddModalOpen(false);
      setAddFormData(initialFormData);
      setFormErrors({});
      setSuccessBanner(`Student "${data.student?.name || 'New Student'}" created successfully.`);

      // Refresh student list and update statistics
      fetchStudents(searchTerm);
    } catch (err) {
      console.error('Error adding student:', err);
      setFormApiError(err.message || 'Failed to create student record.');
    } finally {
      setFormSubmitting(false);
    }
  };

  /* =========================================================
     Calculated Statistics from Real API Data
     ========================================================= */
  const totalStudents = students.length;

  const completedProfiles = students.filter(
    (s) => s.profile && 
           s.profile.district && 
           s.profile.courseOrStream && 
           s.profile.percentageOrCgpa !== null && 
           s.profile.percentageOrCgpa !== undefined
  ).length;

  const districtsCovered = new Set(
    students
      .map((s) => s.profile?.district)
      .filter((d) => d && d.trim() !== '')
  ).size;

  return (
    <div className="student-page">
      
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="success-banner">
          <span>✓ {successBanner}</span>
          <button 
            type="button" 
            className="success-banner-close"
            onClick={() => setSuccessBanner(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Header Section */}
      <header className="student-header">
        <span className="student-header-badge">
          Government of Rajasthan • Department of Technical Education
        </span>
        <h1 className="student-header-title">Student Management</h1>
        <p className="student-header-subtitle">
          Centralized directory to monitor, search, and manage enrolled technical education students, 
          diploma streams, and academic profile details across Rajasthan polytechnic institutions.
        </p>
      </header>

      {/* 2. Key Statistics Cards */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Total Students</span>
            <span className="stat-value">{totalStudents}</span>
          </div>
          <div className="stat-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Completed Profiles</span>
            <span className="stat-value">{completedProfiles}</span>
          </div>
          <div className="stat-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Districts Covered</span>
            <span className="stat-value">{districtsCovered}</span>
          </div>
          <div className="stat-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
        </div>
      </section>

      {/* 3. Action Toolbar: Search, Filters & Add Button (Part A & B) */}
      <section className="toolbar-card">
        <form className="toolbar-filters" onSubmit={handleSearchSubmit}>
          
          {/* Search Box (by name, email, or numeric ID) */}
          <div className="search-box">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input 
              type="text" 
              className="search-input"
              placeholder="Search by name, email, or student ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={handleSearchClear}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: '#888',
                }}
                title="Clear Search"
              >
                ✕
              </button>
            )}
          </div>

          <button type="submit" className="action-btn btn-view" style={{ padding: '10px 16px' }}>
            Search
          </button>

          {/* District Filter Dropdown */}
          <select 
            className="filter-select"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
          >
            <option value="ALL">All Districts</option>
            {districtOptions.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>

          {/* Course / Stream Filter Dropdown */}
          <select 
            className="filter-select"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="ALL">All Courses / Streams</option>
            {courseOptions.map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>

          {/* Reset All Filters Button */}
          {hasActiveFilters && (
            <button 
              type="button" 
              className="btn-reset-filters"
              onClick={handleResetAllFilters}
            >
              Reset Filters
            </button>
          )}

        </form>

        {/* Add Student Primary Action Button */}
        <button 
          type="button" 
          className="btn-add-student"
          onClick={() => {
            setFormErrors({});
            setFormApiError(null);
            setIsAddModalOpen(true);
          }}
        >
          <span>+</span>
          <span>Add Student</span>
        </button>
      </section>

      {/* 4. Student Directory Table & State Displays */}
      <section className="table-card">
        
        {/* Loading State */}
        {loading && (
          <div className="state-container">
            <div className="spinner"></div>
            <h3 className="state-title">Loading Students</h3>
            <p className="state-message">Fetching student records from Department database...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="state-container state-error">
            <div className="state-icon">⚠️</div>
            <h3 className="state-title">Unable to Load Records</h3>
            <p className="state-message">{error}</p>
            <button className="btn-retry" onClick={() => fetchStudents(searchTerm)}>
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && students.length === 0 && (
          <div className="state-container">
            <div className="state-icon">📋</div>
            <h3 className="state-title">No Student Records Found</h3>
            <p className="state-message">
              {hasActiveFilters 
                ? 'No students match the active search and filter criteria. Try resetting your filters.' 
                : 'The student directory is currently empty. Click "+ Add Student" above to create a new student record.'}
            </p>
            {hasActiveFilters && (
              <button className="btn-retry" onClick={handleResetAllFilters}>
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Data Table */}
        {!loading && !error && students.length > 0 && (
          <div className="table-responsive">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>District</th>
                  <th>Course / Stream</th>
                  <th>Passing Year</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="student-id-cell">#{student.id}</td>
                    <td className="student-name-cell">{student.name}</td>
                    <td>{student.email}</td>
                    <td>
                      <span className="badge-district">
                        {student.profile?.district || 'Not Set'}
                      </span>
                    </td>
                    <td>{student.profile?.courseOrStream || 'Not Set'}</td>
                    <td>{student.profile?.passingYear || '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button className="action-btn btn-view" title="View details">View</button>
                        <button className="action-btn btn-edit" title="Edit student">Edit</button>
                        <button className="action-btn btn-delete" title="Delete student">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </section>

      {/* =========================================================
          Add Student Modal (Milestone 4)
          ========================================================= */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => !formSubmitting && setIsAddModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Add New Student</h3>
                <p className="modal-subtitle">
                  Create a new student account and technical education profile
                </p>
              </div>
              <button 
                type="button" 
                className="modal-close-btn"
                disabled={formSubmitting}
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddStudentSubmit}>
              <div className="modal-body">
                
                {/* Server Error Alert Banner */}
                {formApiError && (
                  <div className="modal-alert-error">
                    ⚠️ {formApiError}
                  </div>
                )}

                {/* Section A: Account Information */}
                <div className="form-section-title">1. Account Information</div>
                
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      Full Name <span className="required-star">*</span>
                    </label>
                    <input 
                      type="text" 
                      className={`form-input ${formErrors.name ? 'input-has-error' : ''}`}
                      placeholder="e.g. Ramesh Kumar"
                      value={addFormData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                    {formErrors.name && (
                      <span className="form-field-error">{formErrors.name}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Email Address <span className="required-star">*</span>
                    </label>
                    <input 
                      type="email" 
                      className={`form-input ${formErrors.email ? 'input-has-error' : ''}`}
                      placeholder="e.g. ramesh@example.com"
                      value={addFormData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                    {formErrors.email && (
                      <span className="form-field-error">{formErrors.email}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Initial Password (Optional — defaults to 'Student@123')
                  </label>
                  <input 
                    type="password" 
                    className="form-input"
                    placeholder="Leave blank for default password"
                    value={addFormData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                  />
                </div>

                {/* Section B: Academic & Personal Profile */}
                <div className="form-section-title">2. Academic & Personal Profile</div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input 
                      type="date" 
                      className="form-input"
                      value={addFormData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select 
                      className="form-select"
                      value={addFormData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input 
                      type="tel" 
                      className="form-input"
                      placeholder="e.g. 9876543210"
                      value={addFormData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input 
                      type="text" 
                      className="form-input"
                      value={addFormData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">District</label>
                    <select 
                      className="form-select"
                      value={addFormData.district}
                      onChange={(e) => handleInputChange('district', e.target.value)}
                    >
                      <option value="">Select District</option>
                      {districtOptions.map((dist) => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="e.g. Jaipur"
                      value={addFormData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Education Level</label>
                    <select 
                      className="form-select"
                      value={addFormData.currentEducationLevel}
                      onChange={(e) => handleInputChange('currentEducationLevel', e.target.value)}
                    >
                      <option value="">Select Level</option>
                      <option value="10th">10th Standard</option>
                      <option value="12th">12th Standard</option>
                      <option value="Polytechnic Diploma">Polytechnic Diploma</option>
                      <option value="ITI">ITI</option>
                      <option value="Undergraduate">Undergraduate</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">School / Institute Name</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="e.g. Govt Polytechnic College, Jaipur"
                      value={addFormData.instituteName}
                      onChange={(e) => handleInputChange('instituteName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Course / Stream</label>
                    <select 
                      className="form-select"
                      value={addFormData.courseOrStream}
                      onChange={(e) => handleInputChange('courseOrStream', e.target.value)}
                    >
                      <option value="">Select Course</option>
                      {courseOptions.map((course) => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Passing Year</label>
                    <input 
                      type="number" 
                      className={`form-input ${formErrors.passingYear ? 'input-has-error' : ''}`}
                      placeholder="e.g. 2025"
                      min="1980"
                      max="2050"
                      value={addFormData.passingYear}
                      onChange={(e) => handleInputChange('passingYear', e.target.value)}
                    />
                    {formErrors.passingYear && (
                      <span className="form-field-error">{formErrors.passingYear}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Percentage / CGPA</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className={`form-input ${formErrors.percentageOrCgpa ? 'input-has-error' : ''}`}
                      placeholder="e.g. 85.5"
                      min="0"
                      max="100"
                      value={addFormData.percentageOrCgpa}
                      onChange={(e) => handleInputChange('percentageOrCgpa', e.target.value)}
                    />
                    {formErrors.percentageOrCgpa && (
                      <span className="form-field-error">{formErrors.percentageOrCgpa}</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer Actions */}
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-modal-cancel"
                  disabled={formSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-modal-submit"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving Student...' : 'Save Student'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default StudentPage;
