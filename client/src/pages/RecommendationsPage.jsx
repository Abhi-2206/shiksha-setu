import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { aiApi, studentApi } from '../api';
import { useAuth } from '../context/AuthContext';
import './RecommendationsPage.css';

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

const CATEGORY_OPTIONS = [
  'GENERAL',
  'OBC',
  'SC',
  'ST',
  'EWS',
  'MBC',
];

function RecommendationsPage() {
  const { isAuthenticated } = useAuth();

  // Form input state
  const [percentile, setPercentile] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [branch, setBranch] = useState('Computer Science & Engineering');
  const [homeState, setHomeState] = useState('Rajasthan');

  // UI & Data state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'SAFE' | 'MODERATE' | 'AMBITIOUS'

  // Pre-fill from student profile if logged in
  useEffect(() => {
    if (!isAuthenticated) return;
    async function prefillFromProfile() {
      try {
        const res = await studentApi.getProfile();
        if (res.success && res.profile) {
          const prof = res.profile;
          if (prof.tenthPercentage) setPercentile(String(prof.tenthPercentage));
          if (prof.category) setCategory(prof.category.toUpperCase());
          if (prof.preferredBranch) setBranch(prof.preferredBranch);
          if (prof.domicileState) setHomeState(prof.domicileState);
        }
      } catch (_err) {
        // Silently skip if profile empty
      }
    }
    prefillFromProfile();
  }, [isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const score = parseFloat(percentile);
    if (isNaN(score) || score <= 0 || score > 100) {
      setError('Please enter a valid percentage or merit percentile between 1 and 100.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await aiApi.recommendColleges({
        percentile: score,
        category,
        branch,
        home_state: homeState,
      });

      if (response.success && response.recommendations) {
        setRecommendations(response.recommendations);
      } else {
        throw new Error(response.message || 'No recommendations returned.');
      }
    } catch (err) {
      console.error('Recommendation fetch error:', err);
      setError(
        err.message?.includes('unavailable')
          ? 'The AI Recommendation Engine is currently starting up or offline. Please verify the AI service.'
          : err.message || 'Failed to generate recommendations. Please try again.'
      );
      setRecommendations(null);
    } finally {
      setLoading(false);
    }
  };

  // Safe, Moderate, Ambitious lists
  const safeList = recommendations?.safe || recommendations?.likely || [];
  const moderateList = recommendations?.moderate || [];
  const ambitiousList = recommendations?.ambitious || [];

  const totalCount = safeList.length + moderateList.length + ambitiousList.length;

  return (
    <div className="recommendations-page">
      
      {/* 1. Header */}
      <header className="page-header">
        <span className="page-header-badge">
          AI Decision Engine • Rajasthan Technical Education
        </span>
        <h1 className="page-header-title">
          Polytechnic College <span>Recommendation Finder</span>
        </h1>
        <p className="page-header-subtitle">
          Input your 10th standard percentage / counseling percentile, caste category, and desired 
          engineering stream to discover high-probability, competitive, and reach institutions across Rajasthan.
        </p>
      </header>

      {/* 2. Input Form Card */}
      <section className="recom-form-card">
        <form onSubmit={handleSubmit} className="recom-form">
          <div className="recom-form-grid">
            
            {/* Percentile / Score */}
            <div className="form-group">
              <label htmlFor="percentileInput">
                10th Percentage / Merit Percentile <span className="req">*</span>
              </label>
              <input
                id="percentileInput"
                type="number"
                step="0.01"
                min="1"
                max="100"
                className="form-input"
                placeholder="e.g. 78.50"
                value={percentile}
                onChange={(e) => setPercentile(e.target.value)}
                required
              />
              <span className="input-hint">Enter your overall 10th or ITI qualifying percentage</span>
            </div>

            {/* Category */}
            <div className="form-group">
              <label htmlFor="categorySelect">
                Admission Category <span className="req">*</span>
              </label>
              <select
                id="categorySelect"
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <span className="input-hint">As per official Rajasthan DTE reservation rules</span>
            </div>

            {/* Branch Preference */}
            <div className="form-group">
              <label htmlFor="branchSelect">Preferred Engineering Stream</label>
              <select
                id="branchSelect"
                className="form-input"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                {BRANCH_OPTIONS.map((br) => (
                  <option key={br} value={br}>{br}</option>
                ))}
              </select>
              <span className="input-hint">Diploma specialization branch</span>
            </div>

            {/* Domicile State */}
            <div className="form-group">
              <label htmlFor="stateSelect">Domicile Status</label>
              <select
                id="stateSelect"
                className="form-input"
                value={homeState}
                onChange={(e) => setHomeState(e.target.value)}
              >
                <option value="Rajasthan">Rajasthan (State Quota 100%)</option>
                <option value="Other">Other State (Open Category)</option>
              </select>
              <span className="input-hint">Rajasthan bonafide holders receive state reservation</span>
            </div>

          </div>

          <div className="form-submit-row">
            <button type="submit" className="btn-find-colleges" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner-sm"></span> Analyzing Historical Cutoffs...
                </span>
              ) : (
                'Find Recommended Colleges →'
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="recom-error-alert">
          <div className="error-icon">⚠️</div>
          <div>
            <strong>Recommendation Error:</strong> {error}
          </div>
        </div>
      )}

      {/* 3. Results Section */}
      {recommendations && (
        <section className="recom-results-section">
          
          {/* Results Summary Header */}
          <div className="results-header">
            <div>
              <h2 className="results-title">
                Recommended Colleges for {category} • {branch}
              </h2>
              <p className="results-subtitle">
                Found {totalCount} matching institutions based on your score of {percentile}%
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="recom-tier-tabs">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveTab('ALL')}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                className={`tab-btn safe-tab ${activeTab === 'SAFE' ? 'active' : ''}`}
                onClick={() => setActiveTab('SAFE')}
              >
                Likely / Safe ({safeList.length})
              </button>
              <button
                type="button"
                className={`tab-btn mod-tab ${activeTab === 'MODERATE' ? 'active' : ''}`}
                onClick={() => setActiveTab('MODERATE')}
              >
                Moderate ({moderateList.length})
              </button>
              <button
                type="button"
                className={`tab-btn amb-tab ${activeTab === 'AMBITIOUS' ? 'active' : ''}`}
                onClick={() => setActiveTab('AMBITIOUS')}
              >
                Ambitious ({ambitiousList.length})
              </button>
            </div>
          </div>

          {totalCount === 0 ? (
            <div className="recom-empty-box">
              <div className="empty-icon">🏛️</div>
              <h3>No Colleges Met the Exact Cutoff Criteria</h3>
              <p>
                Try widening your search with a different branch or category, 
                or ask the AI Chatbot for individual institute counseling guidance.
              </p>
              <Link to="/chatbot" className="btn-primary" style={{ display: 'inline-block', marginTop: '12px' }}>
                Ask AI Assistant
              </Link>
            </div>
          ) : (
            <div className="colleges-grid">
              
              {/* SAFE / LIKELY COLLEGES */}
              {(activeTab === 'ALL' || activeTab === 'SAFE') &&
                safeList.map((col, idx) => (
                  <CollegeCard key={`safe-${idx}`} college={col} tier="safe" />
                ))}

              {/* MODERATE COLLEGES */}
              {(activeTab === 'ALL' || activeTab === 'MODERATE') &&
                moderateList.map((col, idx) => (
                  <CollegeCard key={`mod-${idx}`} college={col} tier="moderate" />
                ))}

              {/* AMBITIOUS COLLEGES */}
              {(activeTab === 'ALL' || activeTab === 'AMBITIOUS') &&
                ambitiousList.map((col, idx) => (
                  <CollegeCard key={`amb-${idx}`} college={col} tier="ambitious" />
                ))}

            </div>
          )}

          {/* DTE Disclaimer */}
          <div className="dte-disclaimer-box">
            <span>ℹ️</span>
            <div>
              <strong>Advisory Note:</strong> AI college recommendations are calculated from historical cutoff models 
              and institutional capacity statistics. Seat allotment is conducted solely by the Directorate of Technical 
              Education, Government of Rajasthan via centralized counseling.
            </div>
          </div>

        </section>
      )}

    </div>
  );
}

// Subcomponent: College Card with Tier badge
function CollegeCard({ college, tier }) {
  const tierConfig = {
    safe: {
      label: 'Likely / Safe Admission',
      badgeClass: 'badge-safe',
      icon: '🟢',
      desc: 'High probability based on past closing cutoff ranks.',
    },
    moderate: {
      label: 'Moderate / Competitive',
      badgeClass: 'badge-mod',
      icon: '🟡',
      desc: 'Competitive range. Solid chance during round 2 or sliding.',
    },
    ambitious: {
      label: 'Ambitious / Reach',
      badgeClass: 'badge-amb',
      icon: '🔴',
      desc: 'Top-tier closing rank. Apply as a first-priority choice.',
    },
  };

  const currentTier = tierConfig[tier] || tierConfig.moderate;
  const name = college.college_name || college.name || college.college || 'Polytechnic College';
  const branchName = college.branch || college.course || 'Engineering Diploma';
  const location = college.city || college.location || college.district || 'Rajasthan';
  const cutoff = college.cutoff || college.closing_rank || college.historical_cutoff;

  return (
    <div className={`college-recom-card card-tier-${tier}`}>
      <div className="card-top-row">
        <span className={`tier-badge ${currentTier.badgeClass}`}>
          {currentTier.icon} {currentTier.label}
        </span>
        {cutoff && (
          <span className="cutoff-pill">
            Past Cutoff: <strong>{cutoff}%</strong>
          </span>
        )}
      </div>

      <h3 className="college-card-name">{name}</h3>

      <div className="college-meta-details">
        <div className="meta-line">
          <span className="meta-label">Branch:</span>
          <span className="meta-val">{branchName}</span>
        </div>
        <div className="meta-line">
          <span className="meta-label">Location:</span>
          <span className="meta-val">{location}</span>
        </div>
        {college.type && (
          <div className="meta-line">
            <span className="meta-label">Institute Type:</span>
            <span className="meta-val">{college.type}</span>
          </div>
        )}
      </div>

      <p className="tier-rationale">{currentTier.desc}</p>

      <div className="card-footer-actions">
        <Link 
          to={`/cutoffs?college=${encodeURIComponent(name)}&branch=${encodeURIComponent(branchName)}`}
          className="card-cutoff-link"
        >
          Check Cutoff Trends →
        </Link>
        <Link 
          to={`/chatbot?q=${encodeURIComponent(`Tell me about admission at ${name} for ${branchName}`)}`}
          className="card-ask-ai"
        >
          Ask AI
        </Link>
      </div>
    </div>
  );
}

export default RecommendationsPage;
