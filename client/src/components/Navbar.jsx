import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

// Reusable Navbar component for ShikshaSetu with Role-Based Navigation
function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        
        {/* Left: Brand Logo and Title */}
        <Link to="/" className="navbar-brand" onClick={closeMobile}>
          <div className="brand-title">
            Shiksha<span>Setu</span>
          </div>
          <div className="brand-subtitle">
            Dept. of Technical Education, Rajasthan
          </div>
        </Link>

        {/* Mobile Toggle Button */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Center: Dynamic Navigation Links */}
        <ul className={`navbar-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <li className="nav-item">
            <NavLink 
              to="/" 
              end 
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={closeMobile}
            >
              Home
            </NavLink>
          </li>

          {/* Student Specific Navigation */}
          {isAuthenticated && !isAdmin && (
            <>
              <li className="nav-item">
                <NavLink 
                  to="/dashboard" 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={closeMobile}
                >
                  Dashboard
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  to="/chatbot" 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={closeMobile}
                >
                  AI Chatbot
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  to="/recommendations" 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={closeMobile}
                >
                  College Finder
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  to="/cutoffs" 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={closeMobile}
                >
                  Cutoff Predictor
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  to="/profile" 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={closeMobile}
                >
                  My Profile
                </NavLink>
              </li>
            </>
          )}

          {/* Admin Specific Navigation */}
          {isAuthenticated && isAdmin && (
            <>
              <li className="nav-item">
                <NavLink 
                  to="/admin" 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={closeMobile}
                >
                  Admin Overview
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  to="/students" 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={closeMobile}
                >
                  Student Directory
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  to="/colleges" 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={closeMobile}
                >
                  Colleges & Branches
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  to="/cutoffs" 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={closeMobile}
                >
                  Cutoff Management
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  to="/chatbot" 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={closeMobile}
                >
                  AI Assistant
                </NavLink>
              </li>
            </>
          )}

          {/* Public / Unauthenticated Navigation */}
          {!isAuthenticated && (
            <>
              <li className="nav-item">
                <NavLink 
                  to="/colleges" 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={closeMobile}
                >
                  Colleges & Branches
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  to="/chatbot" 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={closeMobile}
                >
                  AI Chatbot
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink 
                  to="/cutoffs" 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={closeMobile}
                >
                  Admission Cutoffs
                </NavLink>
              </li>
            </>
          )}
        </ul>

        {/* Right: Authentication Actions */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="user-profile-badge">
              <span className={`role-tag ${isAdmin ? 'admin-tag' : 'student-tag'}`}>
                {isAdmin ? 'ADMIN' : 'STUDENT'}
              </span>
              <span className="user-display-name">
                {user?.name || user?.email?.split('@')[0]}
              </span>
              <button 
                type="button" 
                onClick={handleLogout} 
                className="logout-btn"
                title="Sign out of ShikshaSetu"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="login-btn" onClick={closeMobile}>
              Login / Register
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}

export default Navbar;
