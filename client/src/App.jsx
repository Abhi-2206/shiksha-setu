import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Reusable Common Navbar */}
        <Navbar />

        {/* Page Content based on current route */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route 
              path="/students" 
              element={
                <div className="page-placeholder">
                  <h1>Student Management Page</h1>
                  <p>Student records, search, and profile management will be built in Milestone 6.</p>
                </div>
              } 
            />
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
    </BrowserRouter>
  );
}

export default App;
