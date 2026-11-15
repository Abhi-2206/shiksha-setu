import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import StudentPage from './pages/StudentPage';
import './App.css';

function App() {
  return (
    <HashRouter>
      <div className="app-container">
        {/* Reusable Common Navbar */}
        <Navbar />

        {/* Page Content based on current route */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/students" element={<StudentPage />} />
            <Route 
              path="/colleges" 
              element={
                <div className="page-placeholder">
                  <h1>Colleges & Branches</h1>
                  <p>Explore polytechnic institutions and diploma streams across Rajasthan.</p>
                </div>
              } 
            />
            <Route 
              path="/chatbot" 
              element={
                <div className="page-placeholder">
                  <h1>AI Chatbot</h1>
                  <p>AI-Powered student assistance chatbot interface.</p>
                </div>
              } 
            />
            <Route 
              path="/cutoffs" 
              element={
                <div className="page-placeholder">
                  <h1>Admission Cutoff</h1>
                  <p>View historical cutoff marks and counseling ranks for Rajasthan colleges.</p>
                </div>
              } 
            />
            <Route 
              path="/login" 
              element={
                <div className="page-placeholder">
                  <h1>Student / Admin Login</h1>
                  <p>Portal login authentication interface.</p>
                </div>
              } 
            />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
