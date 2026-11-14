import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import './Navbar.css';

// Reusable Navbar component for ShikshaSetu
function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        
        {/* Left: Brand Logo and Title */}
        <Link to="/" className="navbar-brand">
          <div className="brand-title">
            Shiksha<span>Setu</span>
          </div>
          <div className="brand-subtitle">
            Dept. of Technical Education, Rajasthan
          </div>
        </Link>

        {/* Center: Navigation Links */}
        <ul className="navbar-links">
          <li className="nav-item">
            <NavLink 
              to="/" 
              end 
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              Home
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink 
              to="/students" 
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              Student Management
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink 
              to="/colleges" 
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              Colleges & Branches
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink 
              to="/chatbot" 
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              AI Chatbot
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink 
              to="/cutoffs" 
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              Admission Cutoff
            </NavLink>
          </li>
        </ul>

        {/* Right: Login Action Button */}
        <div className="navbar-actions">
          <Link to="/login" className="login-btn">
            Login
          </Link>
        </div>

      </div>
    </nav>
  );
}

export default Navbar;
