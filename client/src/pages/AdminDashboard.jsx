import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collegeApi, cutoffApi, apiBase } from '../api';
import './AdminDashboard.css';

const COMMON_BRANCHES = [
  'Computer Science & Engineering',
  'Civil Engineering',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Electronics Engineering',
  'Information Technology',
  'Automobile Engineering',
];

const CATEGORIES = ['GENERAL', 'OBC', 'SC', 'ST', 'EWS', 'MBC'];

function AdminDashboard() {
  const [stats, setStats] = useState({
    collegesCount: 0,
    cutoffsCount: 0,
    studentsCount: 0,
  });

  const [colleges, setColleges] = useState([]);
  const [cutoffs, setCutoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('colleges'); // 'colleges' | 'cutoffs'

  // Modals
  const [isAddCollegeModalOpen, setIsAddCollegeModalOpen] = useState(false);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [isAddCutoffModalOpen, setIsAddCutoffModalOpen] = useState(false);
  const [selectedCollegeForBranch, setSelectedCollegeForBranch] = useState(null);

  // Forms
  const [collegeFormData, setCollegeFormData] = useState({
    name: '',
    location: '',
    city: '',
    state: 'Rajasthan',
    district: 'Jaipur',
    code: '',
  });

  const [branchFormData, setBranchFormData] = useState({
    name: 'Computer Science & Engineering',
    intake: 60,
  });

  const [cutoffFormData, setCutoffFormData] = useState({
    collegeId: '',
    course: 'Computer Science & Engineering',
    category: 'GENERAL',
    admissionYear: 2026,
    openingRank: 65.0,
    closingRank: 78.5,
    sourceYear: 2025,
  });

  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [collegesRes, cutoffsRes] = await Promise.allSettled([
        collegeApi.getColleges({ limit: 100 }),
        cutoffApi.getCutoffs({}),
      ]);

      let cols = [];
      let cuts = [];

      if (collegesRes.status === 'fulfilled' && collegesRes.value.success) {
        cols = collegesRes.value.colleges || [];
        setColleges(cols);
      }

      if (cutoffsRes.status === 'fulfilled' && cutoffsRes.value.cutoffs) {
        cuts = cutoffsRes.value.cutoffs || [];
        setCutoffs(cuts);
      }

      // Also fetch students count
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      let studCount = 0;
      if (token) {
        try {
          const sRes = await fetch(`${apiBase}/api/students?limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const sData = await sRes.json();
          if (sData.success) {
            studCount = sData.total || sData.count || 0;
          }
        } catch {
          // ignore
        }
      }

      setStats({
        collegesCount: cols.length,
        cutoffsCount: cuts.length,
        studentsCount: studCount,
      });
    } catch (err) {
      console.error('Admin data load error:', err);
      setError(err.message || 'Failed to load administrator records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Add College
  const handleAddCollegeSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);
    setModalSubmitting(true);

    try {
      const res = await collegeApi.createCollege({
        name: collegeFormData.name.trim(),
        location: collegeFormData.location.trim() || collegeFormData.district,
        city: collegeFormData.city.trim() || collegeFormData.district,
        state: collegeFormData.state.trim() || 'Rajasthan',
        district: collegeFormData.district.trim(),
        code: collegeFormData.code.trim() || undefined,
      });

      if (res.success) {
        setSuccessBanner(`College "${res.college?.name}" created successfully.`);
        setIsAddCollegeModalOpen(false);
        setCollegeFormData({ name: '', location: '', city: '', state: 'Rajasthan', district: 'Jaipur', code: '' });
        loadData();
      } else {
        throw new Error(res.message || 'Failed to create college.');
      }
    } catch (err) {
      setModalError(err.message || 'Error creating college record.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Add Branch
  const handleAddBranchSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCollegeForBranch) return;

    setModalError(null);
    setModalSubmitting(true);

    try {
      const res = await collegeApi.addBranch(selectedCollegeForBranch.id, {
        name: branchFormData.name,
        intake: parseInt(branchFormData.intake, 10),
      });

      if (res.success) {
        setSuccessBanner(`Branch "${branchFormData.name}" added to ${selectedCollegeForBranch.name}.`);
        setIsAddBranchModalOpen(false);
        loadData();
      } else {
        throw new Error(res.message || 'Failed to add branch.');
      }
    } catch (err) {
      setModalError(err.message || 'Error adding branch.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Add Cutoff
  const handleAddCutoffSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);
    setModalSubmitting(true);

    try {
      const res = await cutoffApi.createCutoff({
        collegeId: cutoffFormData.collegeId,
        course: cutoffFormData.course,
        category: cutoffFormData.category,
        admissionYear: parseInt(cutoffFormData.admissionYear, 10),
        openingRank: parseFloat(cutoffFormData.openingRank) || null,
        closingRank: parseFloat(cutoffFormData.closingRank),
        sourceYear: parseInt(cutoffFormData.sourceYear, 10),
      });

      if (res.success) {
        setSuccessBanner('Official cutoff record added successfully.');
        setIsAddCutoffModalOpen(false);
        loadData();
      } else {
        throw new Error(res.message || 'Failed to add cutoff record.');
      }
    } catch (err) {
      setModalError(err.message || 'Error adding cutoff record.');
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="admin-dashboard-page">
      
      {/* 1. Header */}
      <header className="page-header">
        <span className="page-header-badge">
          DTE Rajasthan • Administration & Data Management Control
        </span>
        <h1 className="page-header-title">
          Administrator <span>Control Center</span>
        </h1>
        <p className="page-header-subtitle">
          Manage Rajasthan polytechnic institution master records, branch capacities, verified 
          DTE admission cutoffs, and monitor student counseling registrations.
        </p>
      </header>

      {/* Success banner */}
      {successBanner && (
        <div className="admin-success-banner">
          <span>✓ {successBanner}</span>
          <button onClick={() => setSuccessBanner(null)} className="alert-close">✕</button>
        </div>
      )}

      {error && (
        <div className="admin-error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="alert-close">✕</button>
        </div>
      )}

      {/* 2. Key Statistics */}
      <section className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-content">
            <span className="stat-label">Affiliated Colleges</span>
            <span className="stat-number">{stats.collegesCount}</span>
          </div>
          <div className="stat-icon-wrap gold-wrap">🏛️</div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-content">
            <span className="stat-label">Official Cutoff Records</span>
            <span className="stat-number">{stats.cutoffsCount}</span>
          </div>
          <div className="stat-icon-wrap blue-wrap">📊</div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-content">
            <span className="stat-label">Enrolled Students</span>
            <span className="stat-number">{stats.studentsCount}</span>
          </div>
          <div className="stat-icon-wrap green-wrap">👥</div>
        </div>
      </section>

      {/* 3. Navigation Bar to Student Directory */}
      <section className="admin-subnav-card">
        <div className="subnav-left">
          <button
            className={`admin-tab-btn ${activeTab === 'colleges' ? 'active' : ''}`}
            onClick={() => setActiveTab('colleges')}
          >
            🏛️ Colleges & Branches ({stats.collegesCount})
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'cutoffs' ? 'active' : ''}`}
            onClick={() => setActiveTab('cutoffs')}
          >
            📊 Cutoff Records ({stats.cutoffsCount})
          </button>
        </div>

        <div className="subnav-right">
          <Link to="/students" className="btn-goto-students">
            👥 Open Full Student Directory & Form →
          </Link>
        </div>
      </section>

      {/* 4. Tab A: Colleges Management */}
      {activeTab === 'colleges' && (
        <section className="admin-table-section">
          <div className="section-toolbar">
            <h2 className="toolbar-title">Affiliated Polytechnic Institutions</h2>
            <button
              type="button"
              className="btn-add-primary"
              onClick={() => {
                setModalError(null);
                setIsAddCollegeModalOpen(true);
              }}
            >
              + Add New College
            </button>
          </div>

          {loading ? (
            <div className="admin-loading-state">
              <div className="spinner"></div>
              <p>Loading colleges...</p>
            </div>
          ) : colleges.length === 0 ? (
            <div className="admin-empty-state">
              <p>No colleges in the database yet.</p>
              <button
                onClick={() => setIsAddCollegeModalOpen(true)}
                className="btn-add-primary"
                style={{ marginTop: '10px' }}
              >
                + Add First College
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>College Name</th>
                    <th>District</th>
                    <th>Branches / Intake</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {colleges.map((col) => (
                    <tr key={col.id}>
                      <td><strong>{col.code || 'N/A'}</strong></td>
                      <td>{col.name}</td>
                      <td>{col.district || col.city || 'Rajasthan'}</td>
                      <td>
                        {col.branches && col.branches.length > 0 ? (
                          <span className="branch-count-tag">
                            {col.branches.length} Branch{col.branches.length > 1 ? 'es' : ''}
                          </span>
                        ) : (
                          <span className="branch-none-tag">No branches added</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => {
                            setSelectedCollegeForBranch(col);
                            setModalError(null);
                            setIsAddBranchModalOpen(true);
                          }}
                        >
                          + Add Branch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 5. Tab B: Cutoff Records Management */}
      {activeTab === 'cutoffs' && (
        <section className="admin-table-section">
          <div className="section-toolbar">
            <h2 className="toolbar-title">Verified Admission Cutoff Thresholds</h2>
            <button
              type="button"
              className="btn-add-primary"
              onClick={() => {
                if (colleges.length > 0 && !cutoffFormData.collegeId) {
                  setCutoffFormData((prev) => ({ ...prev, collegeId: colleges[0].id }));
                }
                setModalError(null);
                setIsAddCutoffModalOpen(true);
              }}
            >
              + Add Official Cutoff
            </button>
          </div>

          {loading ? (
            <div className="admin-loading-state">
              <div className="spinner"></div>
              <p>Loading cutoff records...</p>
            </div>
          ) : cutoffs.length === 0 ? (
            <div className="admin-empty-state">
              <p>No verified cutoff records in the database.</p>
              <button
                onClick={() => setIsAddCutoffModalOpen(true)}
                className="btn-add-primary"
                style={{ marginTop: '10px' }}
              >
                + Add First Cutoff Entry
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>College</th>
                    <th>Course / Branch</th>
                    <th>Category</th>
                    <th>Year</th>
                    <th>Opening Rank</th>
                    <th>Closing Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {cutoffs.map((cut, idx) => (
                    <tr key={cut.id || idx}>
                      <td>{cut.college?.name || cut.collegeId}</td>
                      <td>{cut.course}</td>
                      <td><span className="badge-cat">{cut.category}</span></td>
                      <td>{cut.admissionYear}</td>
                      <td>{cut.openingRank !== null ? `${cut.openingRank}%` : 'N/A'}</td>
                      <td><strong>{cut.closingRank}%</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Modal: Add College */}
      {isAddCollegeModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsAddCollegeModalOpen(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Polytechnic College</h3>
              <button onClick={() => setIsAddCollegeModalOpen(false)}>✕</button>
            </div>
            {modalError && <div className="modal-alert-error">{modalError}</div>}
            <form onSubmit={handleAddCollegeSubmit} className="modal-form">
              <div className="form-group">
                <label>College Name <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Government Polytechnic College, Bikaner"
                  value={collegeFormData.name}
                  onChange={(e) => setCollegeFormData({ ...collegeFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>District</label>
                  <input
                    type="text"
                    className="form-input"
                    value={collegeFormData.district}
                    onChange={(e) => setCollegeFormData({ ...collegeFormData, district: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>College Code</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. GPC-BIK-01"
                    value={collegeFormData.code}
                    onChange={(e) => setCollegeFormData({ ...collegeFormData, code: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsAddCollegeModalOpen(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={modalSubmitting}>
                  {modalSubmitting ? 'Saving...' : 'Create College'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Branch to College */}
      {isAddBranchModalOpen && selectedCollegeForBranch && (
        <div className="admin-modal-overlay" onClick={() => setIsAddBranchModalOpen(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Diploma Branch to {selectedCollegeForBranch.name}</h3>
              <button onClick={() => setIsAddBranchModalOpen(false)}>✕</button>
            </div>
            {modalError && <div className="modal-alert-error">{modalError}</div>}
            <form onSubmit={handleAddBranchSubmit} className="modal-form">
              <div className="form-group">
                <label>Branch / Engineering Stream</label>
                <select
                  className="form-input"
                  value={branchFormData.name}
                  onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
                >
                  {COMMON_BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Approved Seat Intake</label>
                <input
                  type="number"
                  className="form-input"
                  min="10"
                  max="300"
                  value={branchFormData.intake}
                  onChange={(e) => setBranchFormData({ ...branchFormData, intake: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsAddBranchModalOpen(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={modalSubmitting}>
                  {modalSubmitting ? 'Adding...' : 'Add Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Cutoff */}
      {isAddCutoffModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsAddCutoffModalOpen(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Official Cutoff Record</h3>
              <button onClick={() => setIsAddCutoffModalOpen(false)}>✕</button>
            </div>
            {modalError && <div className="modal-alert-error">{modalError}</div>}
            <form onSubmit={handleAddCutoffSubmit} className="modal-form">
              <div className="form-group">
                <label>Institution</label>
                <select
                  className="form-input"
                  value={cutoffFormData.collegeId}
                  onChange={(e) => setCutoffFormData({ ...cutoffFormData, collegeId: e.target.value })}
                  required
                >
                  <option value="">Select College</option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Course / Branch</label>
                  <select
                    className="form-input"
                    value={cutoffFormData.course}
                    onChange={(e) => setCutoffFormData({ ...cutoffFormData, course: e.target.value })}
                  >
                    {COMMON_BRANCHES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    className="form-input"
                    value={cutoffFormData.category}
                    onChange={(e) => setCutoffFormData({ ...cutoffFormData, category: e.target.value })}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Opening Percentage / Rank</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="e.g. 84.5"
                    value={cutoffFormData.openingRank}
                    onChange={(e) => setCutoffFormData({ ...cutoffFormData, openingRank: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Closing Percentage / Rank <span className="req">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="e.g. 76.2"
                    value={cutoffFormData.closingRank}
                    onChange={(e) => setCutoffFormData({ ...cutoffFormData, closingRank: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsAddCutoffModalOpen(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={modalSubmitting}>
                  {modalSubmitting ? 'Saving...' : 'Add Cutoff Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;
