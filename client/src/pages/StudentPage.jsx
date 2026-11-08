import React, { useState } from 'react';
import './StudentPage.css';

// Student Management Page Component - Milestone 1: Layout & Structure
function StudentPage() {
  // Search and filter state (UI placeholders ready for API integration in Milestone 2/3)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedCourse, setSelectedCourse] = useState('ALL');

  // Directory records state (initialized empty as per Milestone 1 rules)
  // Native fetch() integration will populate this in Milestone 2
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Rajasthan District Options for filtering
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

      {/* 2. Key Statistics Cards */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Total Students</span>
            <span className="stat-value">{students.length}</span>
          </div>
          <div className="stat-icon-box">
            {/* Users icon */}
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
            <span className="stat-value">
              {students.filter(s => s.profile && s.profile.percentageOrCgpa).length}
            </span>
          </div>
          <div className="stat-icon-box">
            {/* Verified Profile / Graduation cap icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Districts Covered</span>
            <span className="stat-value">
              {new Set(students.map(s => s.profile?.district).filter(Boolean)).size}
            </span>
          </div>
          <div className="stat-icon-box">
            {/* Map pin / District icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
        </div>
      </section>

      {/* 3. Action Toolbar: Search, Filters & Add Button */}
      <section className="toolbar-card">
        <div className="toolbar-filters">
          
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
              placeholder="Search by student name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* District Filter Dropdown */}
          <select 
            className="filter-select"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
          >
            <option value="ALL">All Districts</option>
            {districtOptions.map(district => (
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
            {courseOptions.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>

        </div>

        {/* Add Student Primary Action */}
        <button 
          type="button" 
          className="btn-add-student"
          onClick={() => alert('Add Student dialog will be connected in Milestone 4.')}
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
            <p className="state-message">Fetching records from the Department database...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="state-container state-error">
            <div className="state-icon">⚠️</div>
            <h3 className="state-title">Unable to Load Records</h3>
            <p className="state-message">{error}</p>
            <button className="btn-retry" onClick={() => setError(null)}>Retry</button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && students.length === 0 && (
          <div className="state-container">
            <div className="state-icon">📋</div>
            <h3 className="state-title">No Student Records Found</h3>
            <p className="state-message">
              The student directory is currently empty or awaiting live API data. 
              Live student records will be connected in Milestone 2 using native fetch().
            </p>
          </div>
        )}

        {/* Data Table (Layout prepared for records retrieved in Milestone 2) */}
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
                        <button className="action-btn btn-view">View</button>
                        <button className="action-btn btn-edit">Edit</button>
                        <button className="action-btn btn-delete">Delete</button>
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
