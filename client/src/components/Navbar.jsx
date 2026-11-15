import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import './Navbar.css';

// Reusable Navbar component for ShikshaSetu
function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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

        {/* Right: Authentication Action */}
        <div className="navbar-actions">
          {isAuthenticated && user ? (
            <div className="navbar-user-menu">
              <div className="navbar-user-info" title={`Signed in as ${user.email} (${user.role})`}>
                <span className="navbar-user-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </span>
                <div className="navbar-user-text">
                  <span className="navbar-user-name">{user.name}</span>
                  <span className={`navbar-user-role ${user.role === 'ADMIN' ? 'role-admin' : 'role-student'}`}>
                    {user.role}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="navbar-logout-btn"
                onClick={handleLogout}
                title="Log out of your account"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="login-btn">
              Login
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}

export default Navbar;
