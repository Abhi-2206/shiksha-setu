import React from 'react';
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
      // Graduation cap / Student icon
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
      // Institute / Building icon
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
      // Chat message / AI robot icon
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
      // Bar chart / Rank metrics icon
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

  return (
    <div className="home-page">
      
      {/* 1. Hero Section (Milestone 2) */}
      <section className="hero-section">
        <div className="hero-content">
          
          {/* Government Badge */}
          <div className="gov-badge">
            Government of Rajasthan • Department of Technical Education
          </div>

          {/* Heading */}
          <h1 className="hero-title">
            Empowering Technical Education with <span className="highlight">ShikshaSetu</span>
          </h1>

          {/* Description */}
          <p className="hero-description">
            The official AI-powered student assistance platform for Rajasthan technical education. 
            Explore polytechnic admissions, view college cutoffs, get instant answers from our AI chatbot, 
            and manage student academic profiles—all in one place.
          </p>

          {/* Call to Action Buttons */}
          <div className="hero-actions">
            <Link to="/chatbot" className="btn-primary">
              Ask AI Chatbot
            </Link>
            <Link to="/colleges" className="btn-secondary">
              Explore Colleges & Branches
            </Link>
          </div>

          {/* Key Platform Highlights */}
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

        {/* 4-Card Responsive Grid */}
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

      {/* Subsequent milestones will add:
          - About & Notices (Milestone 4)
          - Footer (Milestone 5)
      */}

    </div>
  );
}

export default HomePage;
