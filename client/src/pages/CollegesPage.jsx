import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collegeApi } from '../api';
import { useAuth } from '../context/AuthContext';
import './CollegesPage.css';

const DISTRICTS = [
  'Jaipur', 'Jodhpur', 'Kota', 'Ajmer', 'Bikaner',
  'Udaipur', 'Alwar', 'Bharatpur', 'Bhilwara', 'Sikar',
];

function CollegesPage() {
  const { isAdmin } = useAuth();

  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');

  const fetchColleges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (selectedDistrict !== 'ALL') params.district = selectedDistrict;

      const res = await collegeApi.getColleges(params);
      if (res.success && Array.isArray(res.colleges)) {
        setColleges(res.colleges);
      } else {
        setColleges([]);
      }
    } catch (err) {
      console.error('Fetch colleges error:', err);
      setError(err.message || 'Failed to fetch colleges.');
      setColleges([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedDistrict]);

  useEffect(() => {
    fetchColleges();
  }, [fetchColleges]);

  return (
    <div className="colleges-page">
      
      {/* 1. Header */}
      <header className="page-header">
        <div className="header-flex">
          <div>
            <span className="page-header-badge">
              Affiliated Institutions • Department of Technical Education
            </span>
            <h1 className="page-header-title">
              Polytechnic Colleges <span>& Diploma Branches</span>
            </h1>
            <p className="page-header-subtitle">
              Browse Government, Aided, and Private polytechnic colleges across Rajasthan districts. 
              Review approved diploma branches, seat intake, and campus facilities.
            </p>
          </div>
          {isAdmin && (
            <Link to="/admin" className="btn-admin-manage">
              ⚙️ Admin College Management
            </Link>
          )}
        </div>
      </header>

      {/* 2. Search & Filter Bar */}
      <section className="colleges-filter-card">
        <div className="filter-row">
          
          <div className="search-input-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="college-search-input"
              placeholder="Search by college name, code, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>

          <select
            className="district-select"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
          >
            <option value="ALL">All Districts</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <button
            type="button"
            className="btn-refresh"
            onClick={fetchColleges}
          >
            Filter
          </button>

        </div>
      </section>

      {/* 3. Colleges Grid */}
      {loading ? (
        <div className="colleges-state-box">
          <div className="spinner"></div>
          <p>Loading polytechnic institutions...</p>
        </div>
      ) : error ? (
        <div className="colleges-state-box state-error">
          <p>⚠️ {error}</p>
          <button onClick={fetchColleges} className="btn-retry">Try Again</button>
        </div>
      ) : colleges.length === 0 ? (
        <div className="colleges-state-box">
          <div className="empty-icon">🏛️</div>
          <h3>No Colleges Found</h3>
          <p>
            {searchTerm || selectedDistrict !== 'ALL'
              ? 'No institutions match your search criteria. Try clearing your filters.'
              : 'No college records have been added to the system yet.'}
          </p>
          {(searchTerm || selectedDistrict !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDistrict('ALL');
              }}
              className="btn-retry"
              style={{ marginTop: '10px' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="colleges-catalog-grid">
          {colleges.map((col) => {
            const branches = col.branches || [];
            return (
              <div key={col.id} className="college-catalog-card">
                <div className="card-top-info">
                  <span className="type-badge">
                    {col.type || 'Government Polytechnic'}
                  </span>
                  {col.code && (
                    <span className="code-badge">Code: {col.code}</span>
                  )}
                </div>

                <h3 className="card-college-name">{col.name}</h3>

                <div className="card-location">
                  <span>📍 {col.location || col.city || col.district || 'Rajasthan'}</span>
                  {col.district && <span>• District: {col.district}</span>}
                </div>

                {col.description && (
                  <p className="card-college-desc">{col.description}</p>
                )}

                {/* Branches Offered */}
                <div className="branches-section">
                  <span className="branches-label">
                    Offered Diploma Branches ({branches.length}):
                  </span>
                  {branches.length > 0 ? (
                    <div className="branch-tags-wrap">
                      {branches.map((b) => (
                        <span key={b.id || b.name} className="branch-tag">
                          {b.name || b.branchName}
                          {b.intake && <small> ({b.intake} seats)</small>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="no-branches-text">General Engineering Streams</span>
                  )}
                </div>

                {/* Card Actions */}
                <div className="card-actions-bar">
                  <Link
                    to={`/cutoffs?college=${encodeURIComponent(col.name)}`}
                    className="action-link"
                  >
                    View Cutoffs →
                  </Link>
                  <Link
                    to={`/chatbot?q=${encodeURIComponent(`What diploma courses and facilities are offered at ${col.name}?`)}`}
                    className="action-ai-btn"
                  >
                    Ask AI
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default CollegesPage;
