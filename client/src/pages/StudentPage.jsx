import React, { useState, useEffect, useCallback } from 'react';
import './StudentPage.css';

// Student Management Page Component - Milestone 2: GET API Integration
function StudentPage() {
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedCourse, setSelectedCourse] = useState('ALL');

  // Directory data & UI states
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
   * Native fetch() implementation to retrieve students from GET /api/students
   * Passes query parameters: search, district, courseOrStream
   * Includes Authorization: Bearer <token>
   */
  const fetchStudents = useCallback(async (searchQuery = searchTerm) => {
    setLoading(true);
    setError(null);

    // Retrieve JWT token from client storage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (!token) {
      setLoading(false);
      setError('Authentication Required: Administrator JWT token not found in storage. Please log in with an Administrator account.');
      setStudents([]);
      return;
    }

    try {
      // Build query string dynamically based on active filters
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

      // Native fetch() call
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      // Handle HTTP status codes
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your session has expired or the token is invalid (401 Unauthorized). Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access Denied (403 Forbidden): Administrator privileges are required to view the Student Directory.');
        } else {
          throw new Error(data.message || `Server returned error status ${response.status}`);
        }
      }

      // Store retrieved database records in React state
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

  // Initial load on mount and whenever district/course filter changes
  useEffect(() => {
    fetchStudents(searchTerm);
  }, [fetchStudents]);

  // Handle search submission (press Enter or click Search)
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchStudents(searchTerm);
  };

  // Clear search and reset table
  const handleSearchClear = () => {
    setSearchTerm('');
    fetchStudents('');
  };

  /* =========================================================
     Calculated Statistics from Real API Data
     ========================================================= */
  // 1. Total Students returned from database
  const totalStudents = students.length;

  // 2. Completed Profiles: defined as having district, courseOrStream, and percentageOrCgpa populated
  const completedProfiles = students.filter(
    (s) => s.profile && 
           s.profile.district && 
           s.profile.courseOrStream && 
           s.profile.percentageOrCgpa !== null && 
           s.profile.percentageOrCgpa !== undefined
  ).length;

  // 3. Districts Covered: unique count of non-empty student districts
  const districtsCovered = new Set(
    students
      .map((s) => s.profile?.district)
      .filter((d) => d && d.trim() !== '')
  ).size;

  return (
    <div className="student-page">
      
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

      {/* 2. Key Statistics Cards (Dynamically computed from API records) */}
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

      {/* 3. Action Toolbar: Search, Filters & Add Button */}
      <section className="toolbar-card">
        <form className="toolbar-filters" onSubmit={handleSearchSubmit}>
          
          {/* Search Box */}
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
              placeholder="Search by name, email, or ID..."
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

        </form>

        {/* Add Student Primary Action */}
        <button 
          type="button" 
          className="btn-add-student"
          onClick={() => alert('Add Student dialog will be implemented in upcoming milestone.')}
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
              No students match the current filter criteria or directory is empty.
            </p>
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

    </div>
  );
}

export default StudentPage;
