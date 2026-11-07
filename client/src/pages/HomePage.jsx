import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

// Home Page Component - Milestone 2: Hero Section
function HomePage() {
  return (
    <div className="home-page">
      
      {/* Hero Section */}
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

      {/* Subsequent milestones will add:
          - Quick Access Cards (Milestone 3)
          - About & Notices (Milestone 4)
          - Footer (Milestone 5)
      */}

    </div>
  );
}

export default HomePage;
