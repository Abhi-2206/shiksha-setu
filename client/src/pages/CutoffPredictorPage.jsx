import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { aiApi, cutoffApi, collegeApi } from '../api';
import './CutoffPredictorPage.css';

const COMMON_COLLEGES = [
  'Government Polytechnic College, Jaipur',
  'Government Polytechnic College, Jodhpur',
  'Government Polytechnic College, Kota',
  'Government Polytechnic College, Ajmer',
  'Government Polytechnic College, Bikaner',
  'Government Polytechnic College, Udaipur',
  'Government Polytechnic College, Alwar',
];

const COMMON_BRANCHES = [
  'Computer Science & Engineering',
  'Civil Engineering',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Electronics Engineering',
  'Information Technology',
];

const CATEGORIES = ['GENERAL', 'OBC', 'SC', 'ST', 'EWS', 'MBC'];

function CutoffPredictorPage() {
  const [searchParams] = useSearchParams();

  const [collegesList, setCollegesList] = useState([]);
  const [collegeName, setCollegeName] = useState(() => searchParams.get('college') || COMMON_COLLEGES[0]);
  const [branch, setBranch] = useState(() => searchParams.get('branch') || COMMON_BRANCHES[0]);
  const [category, setCategory] = useState('GENERAL');
  const [targetYear, setTargetYear] = useState('2026');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [databaseCutoffs, setDatabaseCutoffs] = useState([]);

  // Load registered colleges on mount for name/code resolution
  useEffect(() => {
    let isMounted = true;
    collegeApi.getColleges()
      .then((res) => {
        if (isMounted && res && res.colleges && res.colleges.length > 0) {
          setCollegesList(res.colleges);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const runPrediction = async (col, br, cat, yr) => {
    setLoading(true);
    setError(null);

    const matchedCollege = collegesList.find(
      (c) =>
        c.name?.toLowerCase() === col?.toLowerCase() ||
        c.code?.toLowerCase() === col?.toLowerCase() ||
        String(c.id) === String(col)
    );

    const resolvedCollegeId = matchedCollege ? matchedCollege.code : col;
    const resolvedCollegeName = matchedCollege ? matchedCollege.name : col;

    try {
      // 1. Call AI prediction proxy endpoint: POST /api/ai/predict-cutoff
      const aiPromise = aiApi.predictCutoff({
        college_id: resolvedCollegeId,
        college_name: resolvedCollegeName,
        course_name: br,
        category: cat,
        year: parseInt(yr, 10),
      });

      // 2. Concurrently fetch verified database cutoffs if available: GET /api/cutoffs
      const dbPromise = cutoffApi.getCutoffs({
        collegeId: matchedCollege?.id,
        courseName: br,
        category: cat,
      }).catch(() => ({ cutoffs: [] }));

      const [aiRes, dbRes] = await Promise.allSettled([aiPromise, dbPromise]);

      if (aiRes.status === 'fulfilled' && aiRes.value.success) {
        const predData = aiRes.value.prediction || aiRes.value;
        setPrediction(predData);
      } else {
        const failureReason = aiRes.reason?.message || 'AI prediction model failed.';
        throw new Error(failureReason);
      }

      if (dbRes.status === 'fulfilled' && dbRes.value.cutoffs) {
        setDatabaseCutoffs(dbRes.value.cutoffs);
      }
    } catch (err) {
      console.error('Prediction error:', err);
      if (err.status === 401) {
        setError('Please log in with your student or administrator account to run cutoff predictions.');
      } else if (err.message?.includes('unavailable') || err.status === 503) {
        setError('The AI Prediction service is currently unavailable. Please verify the AI service status.');
      } else {
        setError(err.message || 'Unable to predict cutoff. Please try again with another college or branch.');
      }
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-run if query params passed on mount
  useEffect(() => {
    const colParam = searchParams.get('college');
    const brParam = searchParams.get('branch');
    if (colParam && brParam) {
      setCollegeName(colParam);
      setBranch(brParam);
      runPrediction(colParam, brParam, 'GENERAL', '2026');
    }
  }, [searchParams]);

  const handlePredictSubmit = (e) => {
    e.preventDefault();
    runPrediction(collegeName, branch, category, targetYear);
  };

  return (
    <div className="cutoff-page">
      
      {/* 1. Header */}
      <header className="page-header">
        <span className="page-header-badge">
          Statistical Trend Analysis • Department of Technical Education
        </span>
        <h1 className="page-header-title">
          Admission Cutoff <span>Predictor & Analyzer</span>
        </h1>
        <p className="page-header-subtitle">
          Forecast projected closing ranks and percentile cutoffs based on historical admission cycles, 
          intake capacity, and applicant shifts across Rajasthan polytechnic institutions.
        </p>
      </header>

      {/* 2. Predictor Form */}
      <section className="cutoff-form-card">
        <form onSubmit={handlePredictSubmit} className="cutoff-form">
          <div className="cutoff-grid-4">
            
            {/* College Selection / Input */}
            <div className="form-group">
              <label htmlFor="collegeInput">College Name</label>
              <input
                id="collegeInput"
                type="text"
                list="collegeDatalist"
                className="form-input"
                placeholder="Select or type polytechnic college"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                required
              />
              <datalist id="collegeDatalist">
                {collegesList.length > 0
                  ? collegesList.map((c) => (
                      <option key={c.id || c.code} value={c.name} />
                    ))
                  : COMMON_COLLEGES.map((c) => (
                      <option key={c} value={c} />
                    ))}
              </datalist>
            </div>

            {/* Branch Selection */}
            <div className="form-group">
              <label htmlFor="branchInput">Branch / Stream</label>
              <select
                id="branchInput"
                className="form-input"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                {COMMON_BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Category Selection */}
            <div className="form-group">
              <label htmlFor="catInput">Admission Category</label>
              <select
                id="catInput"
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Admission Year Selection */}
            <div className="form-group">
              <label htmlFor="yearInput">Target Admission Year</label>
              <select
                id="yearInput"
                className="form-input"
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
              >
                <option value="2026">2026-27 (Upcoming Cycle)</option>
                <option value="2025">2025-26 (Past Year Reference)</option>
                <option value="2024">2024-25 (Historical)</option>
              </select>
            </div>

          </div>

          <div className="cutoff-submit-row">
            <button type="submit" className="btn-predict" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner-sm"></span> Computing Trend Models...
                </span>
              ) : (
                'Run Cutoff Prediction →'
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Error alert */}
      {error && (
        <div className="cutoff-error-alert">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* 3. Prediction Result Card */}
      {prediction && (
        <section className="prediction-result-card">
          
          <div className="prediction-header">
            <div>
              <span className="pred-cycle-badge">
                Year {targetYear} Projection • {category} Category
              </span>
              <h2 className="pred-college-title">{collegeName}</h2>
              <p className="pred-branch-sub">{branch}</p>
            </div>

            {/* Expected cutoff badge */}
            <div className="expected-cutoff-box">
              <span className="cutoff-box-label">
                {prediction.estimated_closing_rank != null ? 'Projected Closing Rank' : 'Projected Cutoff Score'}
              </span>
              <span className="cutoff-box-value">
                {prediction.estimated_closing_rank != null
                  ? `Rank ${prediction.estimated_closing_rank}`
                  : (prediction.expected_cutoff || prediction.predicted_cutoff || prediction.cutoff || 'N/A')}
              </span>
              <span className="cutoff-box-sub">
                {prediction.target_year ? `Target Session ${prediction.target_year}` : 'Estimated Merit Threshold'}
              </span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="metrics-grid">
            
            <div className="metric-box">
              <span className="metric-title">Model Confidence</span>
              <span className="metric-val">
                {prediction.confidence ? `${prediction.confidence} Confidence` : (prediction.confidence_interval ? `${prediction.confidence_interval[0]}% – ${prediction.confidence_interval[1]}%` : '±2.5% variation range')}
              </span>
              <span className="metric-note">
                {prediction.methodology || 'Projected statistical boundary'}
              </span>
            </div>

            <div className="metric-box">
              <span className="metric-title">Cutoff Trend</span>
              <span className="metric-val trend-highlight">
                {prediction.trend
                  ? prediction.trend.charAt(0).toUpperCase() + prediction.trend.slice(1)
                  : (prediction.competition_trend || 'Stable')}
              </span>
              <span className="metric-note">Compared to preceding counseling cycle</span>
            </div>

            <div className="metric-box">
              <span className="metric-title">Recommendation Level</span>
              <span className="metric-val">
                {prediction.recommendation || (prediction.explanation ? 'Trend Modeled' : 'Competitive Choice')}
              </span>
              <span className="metric-note">
                {prediction.explanation || 'Keep safe backup options'}
              </span>
            </div>

          </div>

          {/* Historical Data Comparison */}
          <div className="historical-trends-section">
            <h3 className="section-subheading">Historical Counseling Thresholds</h3>
            <div className="table-responsive">
              <table className="historical-table">
                <thead>
                  <tr>
                    <th>Academic Session</th>
                    <th>Opening Rank / Score</th>
                    <th>Closing Rank / Score</th>
                    <th>Source / Session</th>
                    <th>Record Status</th>
                  </tr>
                </thead>
                <tbody>
                  {prediction.historical_records && prediction.historical_records.length > 0 ? (
                    prediction.historical_records.map((rec, i) => (
                      <tr key={i}>
                        <td>Session {rec.admission_year || rec.year}</td>
                        <td>{rec.opening_rank != null ? `Rank ${rec.opening_rank}` : (rec.opening_cutoff || 'N/A')}</td>
                        <td>{rec.closing_rank != null ? `Rank ${rec.closing_rank}` : (rec.closing_cutoff || 'N/A')}</td>
                        <td>{rec.source || `DTE Report ${rec.source_year || ''}`}</td>
                        <td><span className="badge-verified">Official Record</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-history-cell" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                        No verified historical cutoff records are available for this selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Explanation and Limitations Notice */}
          <div className="prediction-disclaimer">
            <div className="disclaimer-icon">⚖️</div>
            <div className="disclaimer-content">
              <strong>Important Disclaimer & Limitations:</strong>
              <p>
                {prediction.disclaimer || (
                  <>
                    Cutoff predictions are estimated using regression algorithms based on historical DTE counseling
                    records and seat capacities. <strong>Predictions do not guarantee seat allotment.</strong>
                    Actual cutoffs vary each round depending on the total registered candidates, state merit ranks,
                    and reservation category preferences for the active academic session.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="prediction-actions-row">
            <Link
              to={`/chatbot?q=${encodeURIComponent(`What was the counseling cutoff for ${collegeName} in ${branch}?`)}`}
              className="btn-ask-more"
            >
              💬 Ask AI Chatbot About This College
            </Link>
            <Link to="/recommendations" className="btn-secondary-link">
              Find Alternate Colleges →
            </Link>
          </div>

        </section>
      )}

      {/* Database Cutoffs Table (if verified records exist) */}
      {databaseCutoffs.length > 0 && (
        <section className="db-cutoffs-section">
          <h3 className="section-subheading">Official Cutoff Records in Database</h3>
          <div className="table-responsive">
            <table className="historical-table">
              <thead>
                <tr>
                  <th>College</th>
                  <th>Course</th>
                  <th>Category</th>
                  <th>Year</th>
                  <th>Opening Rank</th>
                  <th>Closing Rank</th>
                </tr>
              </thead>
              <tbody>
                {databaseCutoffs.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.college?.name || collegeName}</td>
                    <td>{item.courseName || item.course || branch}</td>
                    <td>{item.category}</td>
                    <td>{item.admissionYear}</td>
                    <td>{item.openingRank ? `Rank ${item.openingRank}` : 'N/A'}</td>
                    <td>{item.closingRank ? `Rank ${item.closingRank}` : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}

export default CutoffPredictorPage;
