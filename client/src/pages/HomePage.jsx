import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

// Home Page Component
function HomePage() {
  // Quick access portal links data (Milestone 3)
  const quickAccessCards = [
    {
      id: 1,
      title: 'Student Management',
      description: 'Manage and access student-related information.',
      route: '/students',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      ),
    },
    {
      id: 2,
      title: 'Colleges & Branches',
      description: 'Explore technical colleges and available branches.',
      route: '/colleges',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="21" x2="21" y2="21" />
          <line x1="4" y1="10" x2="20" y2="10" />
          <polyline points="12 3 2 10 22 10" />
          <line x1="6" y1="10" x2="6" y2="21" />
          <line x1="10" y1="10" x2="10" y2="21" />
          <line x1="14" y1="10" x2="14" y2="21" />
          <line x1="18" y1="10" x2="18" y2="21" />
        </svg>
      ),
    },
    {
      id: 3,
      title: 'AI Chatbot',
      description: 'Get answers to your technical education queries.',
      route: '/chatbot',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <circle cx="9" cy="10" r="1" />
          <circle cx="15" cy="10" r="1" />
        </svg>
      ),
    },
    {
      id: 4,
      title: 'Admission Cutoff',
      description: 'Explore admission cutoff information.',
      route: '/cutoffs',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
          <line x1="2" y1="20" x2="22" y2="20" />
        </svg>
      ),
    },
  ];

  // Core platform objectives (Milestone 4)
  const platformObjectives = [
    'Provide students with easy access to technical education information.',
    'Help students explore colleges, courses and branches.',
    'Assist students in understanding admission-related information.',
    'Make important academic information easier to access.',
    'Provide AI-powered assistance for common student queries.',
  ];

  // Demonstration sample notices (Milestone 4)
  const sampleNotices = [
    {
      id: 1,
      tag: 'Session 2026-27',
      title: 'Academic Session Information (Demo)',
      date: 'Sample Entry • Academic Guidelines',
      description: 'Sample notice regarding registration timelines, academic calendar guidelines, and orientation schedules for polytechnic institutions.',
      details: 'This is a demonstration entry showcasing how academic calendar notices, semester commencement dates, and institute registration timelines will appear for students.',
    },
    {
      id: 2,
      tag: 'Examinations',
      title: 'Examination Schedule Announcement (Demo)',
      date: 'Sample Entry • Exam Advisory',
      description: 'Sample advisory regarding semester exam timetable preparations, admit card procedures, and assessment guidelines for polytechnic courses.',
      details: 'This is a demonstration entry illustrating examination schedules, practical exam windows, and admit card download instructions for enrolled students.',
    },
    {
      id: 3,
      tag: 'Student Welfare',
      title: 'Scholarship Application Information (Demo)',
      date: 'Sample Entry • Welfare Schemes',
      description: 'Sample overview of state technical education scholarship schemes, eligibility criteria, and financial assistance guidelines for enrolled students.',
      details: 'This is a demonstration entry explaining state welfare schemes such as Uttar Matric and fee assistance policies available for technical education applicants.',
    },
  ];

  // Simple state for viewing notice details modal
  const [selectedNotice, setSelectedNotice] = useState(null);

  return (
    <div className="home-page">
      
      {/* 1. Hero Section (Milestone 2) */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="gov-badge">
            Government of Rajasthan • Department of Technical Education
          </div>

          <h1 className="hero-title">
            Empowering Technical Education with <span className="highlight">ShikshaSetu</span>
          </h1>

          <p className="hero-description">
            The official AI-powered student assistance platform for Rajasthan technical education. 
            Explore polytechnic admissions, view college cutoffs, get instant answers from our AI chatbot, 
            and manage student academic profiles—all in one place.
          </p>

          <div className="hero-actions">
            <Link to="/chatbot" className="btn-primary">
              Ask AI Chatbot
            </Link>
            <Link to="/colleges" className="btn-secondary">
              Explore Colleges & Branches
            </Link>
          </div>

          <div className="hero-highlights">
            <div className="highlight-item">
              <span className="highlight-number">100+</span>
              <span className="highlight-label">Affiliated Polytechnic Colleges</span>
            </div>
            <div className="highlight-item">
              <span className="highlight-number">30+</span>
              <span className="highlight-label">Diploma & Engineering Streams</span>
            </div>
            <div className="highlight-item">
              <span className="highlight-number">24/7</span>
              <span className="highlight-label">AI Student Assistance</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Explore ShikshaSetu - Quick Access Cards (Milestone 3) */}
      <section className="explore-section">
        <div className="section-header">
          <h2 className="section-title">Explore ShikshaSetu</h2>
          <p className="section-subtitle">
            Direct access to key portals and technical education resources
          </p>
        </div>

        <div className="quick-cards-grid">
          {quickAccessCards.map((card) => (
            <Link key={card.id} to={card.route} className="access-card">
              <div className="card-top">
                <div className="card-icon-box">
                  {card.icon}
                </div>
                <h3 className="card-title">{card.title}</h3>
                <p className="card-description">{card.description}</p>
              </div>
              <div className="card-action">
                <span>Access Portal</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. About ShikshaSetu Section (Milestone 4) */}
      <section className="about-section">
        <div className="section-header">
          <h2 className="section-title">About ShikshaSetu</h2>
          <p className="section-subtitle">
            Dedicated digital portal under the Department of Technical Education, Government of Rajasthan
          </p>
        </div>

        <div className="about-card">
          <div className="about-layout">
            
            {/* Left: Overview text */}
            <div className="about-text">
              <p>
                <strong>ShikshaSetu</strong> is an AI-powered student assistance platform designed 
                specifically for students, parents, and aspirants under the Department of Technical Education (DTE), 
                Government of Rajasthan.
              </p>
              <p>
                Technical education forms the foundation of technical skill development and industrial 
                growth in Rajasthan. ShikshaSetu acts as a digital bridge, connecting students with certified 
                polytechnic institutions, transparent cutoff statistics, and real-time guidance.
              </p>

              <div className="about-concluding-box">
                <p>
                  🎯 Our goal is to make technical education information more accessible, transparent, 
                  and convenient for every student and parent across Rajasthan.
                </p>
              </div>
            </div>

            {/* Right: Key Objectives */}
            <div className="about-objectives">
              <div className="objectives-title">Key Objectives</div>
              {platformObjectives.map((obj, index) => (
                <div key={index} className="objective-item">
                  <span className="objective-number">{index + 1}</span>
                  <span className="objective-text">{obj}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* 4. Important Notices Section (Milestone 4) */}
      <section className="notices-section">
        <div className="section-header">
          <h2 className="section-title">Important Notices</h2>
          <p className="section-subtitle">
            Sample updates and circulars for technical education students
          </p>
        </div>

        {/* Clear Demo Notice Disclaimer */}
        <div className="notices-disclaimer">
          <span>ℹ️</span>
          <span>
            <strong>Demonstration Notice:</strong> The entries below are prototype sample notices for demonstration purposes. Official circulars are released at dte.rajasthan.gov.in.
          </span>
        </div>

        {/* 3 Notices Grid */}
        <div className="notices-grid">
          {sampleNotices.map((notice) => (
            <div key={notice.id} className="notice-card">
              <div>
                <div className="notice-meta">
                  <span className="notice-tag">{notice.tag}</span>
                  <span className="notice-date">{notice.date}</span>
                </div>
                <h3 className="notice-title" style={{ marginTop: '12px' }}>
                  {notice.title}
                </h3>
                <p className="notice-desc" style={{ marginTop: '8px' }}>
                  {notice.description}
                </p>
              </div>

              <button 
                type="button" 
                className="notice-action-btn"
                onClick={() => setSelectedNotice(notice)}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Notice Details Modal (Simple Beginner-Friendly State) */}
      {selectedNotice && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setSelectedNotice(null)}
        >
          <div 
            style={{
              backgroundColor: '#FFFFFF',
              maxWidth: '540px',
              width: '100%',
              borderRadius: '6px',
              padding: '28px 24px',
              borderTop: '4px solid #D4AF37',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className="notice-tag">{selectedNotice.tag}</span>
              <button 
                onClick={() => setSelectedNotice(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                ✕
              </button>
            </div>
            <h3 style={{ fontSize: '18px', color: '#252525', marginBottom: '8px' }}>
              {selectedNotice.title}
            </h3>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '14px' }}>
              {selectedNotice.date}
            </p>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.6, marginBottom: '20px' }}>
              {selectedNotice.details}
            </p>
            <div style={{ textAlign: 'right' }}>
              <button 
                className="btn-primary" 
                style={{ padding: '8px 18px', fontSize: '13px' }}
                onClick={() => setSelectedNotice(null)}
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subsequent milestones will add:
          - Footer (Milestone 5)
      */}

    </div>
  );
}

export default HomePage;
