import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { studentApi, chatApi } from '../api';
import './StudentDashboard.css';

function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setLoading(true);
      setError(null);

      try {
        const [profileRes, chatRes] = await Promise.allSettled([
          studentApi.getProfile(),
          chatApi.getSessions(),
        ]);

        if (isMounted) {
          if (profileRes.status === 'fulfilled' && profileRes.value.success) {
            setProfile(profileRes.value.profile);
          }
          if (chatRes.status === 'fulfilled' && chatRes.value.success) {
            setChatSessions(chatRes.value.sessions || []);
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load dashboard data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate profile completion percentage based on real fields
  const calculateCompletion = (prof) => {
    if (!prof) return 20; // Basic account created
    const fields = [
      Boolean(prof.fullName || user?.name),
      Boolean(prof.phoneNumber),
      Boolean(prof.tenthPercentage !== null && prof.tenthPercentage !== undefined),
      Boolean(prof.twelfthPercentage !== null && prof.twelfthPercentage !== undefined),
      Boolean(prof.category),
      Boolean(prof.domicileState),
      Boolean(prof.preferredBranch),
      Boolean(prof.preferredCity),
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  const completionPercent = calculateCompletion(profile);

  return (
    <div className="student-dashboard">
      
      {/* 1. Header Banner */}
      <header className="dashboard-header">
        <div className="dashboard-header-text">
          <span className="dashboard-badge">
            Government of Rajasthan • Department of Technical Education
          </span>
          <h1 className="dashboard-title">
            Welcome back, <span>{profile?.fullName || user?.name || 'Student'}</span>
          </h1>
          <p className="dashboard-subtitle">
            Rajasthan Polytechnic & Technical Education Admission Counseling Portal. 
            Access AI guidance, predict cutoffs, and track your admission progress.
          </p>
        </div>
        <div className="dashboard-header-action">
          <Link to="/chatbot" className="btn-primary-action">
            <span>💬</span> Ask AI Assistant
          </Link>
        </div>
      </header>

      {/* Error notification */}
      {error && (
        <div className="dashboard-alert">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* 2. Profile Completion Progress Card */}
      <section className="profile-progress-card">
        <div className="progress-info">
          <div>
            <h3 className="progress-title">Academic Profile Completion</h3>
            <p className="progress-desc">
              {completionPercent === 100
                ? 'Your academic profile and counseling preferences are fully up to date.'
                : 'Complete your profile with 10th/12th marks, category, and preferred branch for accurate college recommendations.'}
            </p>
          </div>
          <div className="progress-percentage-badge">
            {completionPercent}%
          </div>
        </div>

        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${completionPercent}%` }}
          ></div>
        </div>

        <div className="progress-actions">
          <span className="progress-status-text">
            {completionPercent === 100 ? '✅ Profile 100% Completed' : '⚠️ Action Recommended: Complete Profile'}
          </span>
          <Link to="/profile" className="btn-outline-gold">
            {completionPercent === 100 ? 'View / Edit Profile' : 'Complete Profile Now →'}
          </Link>
        </div>
      </section>

      {/* 3. Quick Action Hub */}
      <section className="quick-actions-section">
        <h2 className="section-heading">Counseling & Guidance Tools</h2>
        
        <div className="action-cards-grid">
          <Link to="/chatbot" className="tool-card">
            <div className="tool-card-icon gold-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <circle cx="9" r="1" cy="10" />
                <circle cx="15" r="1" cy="10" />
              </svg>
            </div>
            <div className="tool-card-body">
              <h3 className="tool-title">AI Student Assistant</h3>
              <p className="tool-desc">
                24/7 RAG-powered chatbot trained on official Rajasthan DTE admission circulars and rules.
              </p>
            </div>
            <div className="tool-action-link">Open Chatbot →</div>
          </Link>

          <Link to="/recommendations" className="tool-card">
            <div className="tool-card-icon blue-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="tool-card-body">
              <h3 className="tool-title">College Finder</h3>
              <p className="tool-desc">
                Discover Safe, Moderate, and Ambitious polytechnic institutions matching your rank and category.
              </p>
            </div>
            <div className="tool-action-link">Get Recommendations →</div>
          </Link>

          <Link to="/cutoffs" className="tool-card">
            <div className="tool-card-icon green-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
                <line x1="2" y1="20" x2="22" y2="20" />
              </svg>
            </div>
            <div className="tool-card-body">
              <h3 className="tool-title">Cutoff Predictor</h3>
              <p className="tool-desc">
                Analyze past admission trends and predict estimated cutoffs across engineering diploma branches.
              </p>
            </div>
            <div className="tool-action-link">Predict Cutoff →</div>
          </Link>

          <Link to="/profile" className="tool-card">
            <div className="tool-card-icon purple-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="tool-card-body">
              <h3 className="tool-title">Academic Profile</h3>
              <p className="tool-desc">
                Update personal details, percentage, category certificates, and preferred branch choices.
              </p>
            </div>
            <div className="tool-action-link">Manage Profile →</div>
          </Link>
        </div>
      </section>

      {/* 4. Two-Column Lower Section: Recent Chats + Important Admission Guidelines */}
      <section className="dashboard-grid-2">
        
        {/* Left Column: Recent Chat Sessions */}
        <div className="dashboard-card">
          <div className="card-header-row">
            <h3 className="card-title">Recent Inquiries & AI Chats</h3>
            <Link to="/chatbot" className="card-header-link">Start New Chat +</Link>
          </div>

          {loading ? (
            <div className="dash-loading">
              <div className="spinner-sm"></div>
              <span>Loading recent sessions...</span>
            </div>
          ) : chatSessions.length === 0 ? (
            <div className="dash-empty-state">
              <div className="dash-empty-icon">💬</div>
              <p>No chat history yet.</p>
              <span className="dash-empty-sub">
                Ask our AI assistant about eligibility, fees, polytechnic seats, or counseling dates.
              </span>
              <Link to="/chatbot" className="btn-gold-sm" style={{ marginTop: '12px', display: 'inline-block' }}>
                Ask AI Assistant Now
              </Link>
            </div>
          ) : (
            <div className="recent-chats-list">
              {chatSessions.slice(0, 4).map((session) => (
                <Link
                  key={session.id}
                  to={`/chatbot?session=${session.id}`}
                  className="recent-chat-item"
                >
                  <div className="chat-item-main">
                    <span className="chat-item-title">{session.title || 'Inquiry Session'}</span>
                    <span className="chat-item-date">
                      {new Date(session.updatedAt || session.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className="chat-item-arrow">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Key DTE Rajasthan Guidelines */}
        <div className="dashboard-card">
          <div className="card-header-row">
            <h3 className="card-title">Admission Counseling Advisory</h3>
            <span className="advisory-badge">Official DTE Guidelines</span>
          </div>

          <div className="guidelines-list">
            <div className="guideline-item">
              <div className="guideline-num">1</div>
              <div className="guideline-text">
                <strong>Domicile Eligibility:</strong> Candidates possessing Bonafide/Domicile certificate of Rajasthan are eligible for 100% state quota seats.
              </div>
            </div>
            <div className="guideline-item">
              <div className="guideline-num">2</div>
              <div className="guideline-text">
                <strong>Minimum Qualifying Marks:</strong> Passed 10th standard with minimum 35% marks with Science & Mathematics as compulsory subjects.
              </div>
            </div>
            <div className="guideline-item">
              <div className="guideline-num">3</div>
              <div className="guideline-text">
                <strong>Lateral Entry (2nd Year):</strong> Candidates passing 10+2 with Physics/Chemistry/Maths or 10th + 2 years ITI can apply directly for lateral entry.
              </div>
            </div>
            <div className="guideline-item">
              <div className="guideline-num">4</div>
              <div className="guideline-text">
                <strong>Document Verification:</strong> Keep 10th marksheet, category certificate, domicile certificate, and income certificate ready for reporting.
              </div>
            </div>
          </div>
        </div>

      </section>

    </div>
  );
}

export default StudentDashboard;
