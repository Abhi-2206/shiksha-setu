import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import StudentPage from './pages/StudentPage';
import AuthPage from './pages/AuthPage';
import ChatbotPage from './pages/ChatbotPage';
import CutoffPredictorPage from './pages/CutoffPredictorPage';
import './App.css';

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <div className="app-container">
          {/* Reusable Common Navbar with Auth State */}
          <Navbar />

          {/* Page Content based on current route */}
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<AuthPage key="login" initialMode="login" />} />
              <Route path="/register" element={<AuthPage key="register" initialMode="register" />} />
              <Route path="/chatbot" element={<ChatbotPage />} />

              {/* Protected Routes — Student Management requires Administrator authorization */}
              <Route 
                path="/students" 
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <StudentPage />
                  </ProtectedRoute>
                } 
              />

              {/* Public Informational Placeholders */}
              <Route 
                path="/colleges" 
                element={
                  <div className="page-placeholder">
                    <h1>Colleges & Branches</h1>
                    <p>Explore polytechnic institutions and diploma streams across Rajasthan.</p>
                  </div>
                } 
              />
              <Route path="/cutoffs" element={<CutoffPredictorPage />} />

              {/* Catch-all redirect to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
