import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Teammate pages preserved
import HomePage from './pages/HomePage';
import StudentPage from './pages/StudentPage';

// Task 3 pages
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import ChatbotPage from './pages/ChatbotPage';
import RecommendationsPage from './pages/RecommendationsPage';
import CutoffPredictorPage from './pages/CutoffPredictorPage';
import ProfilePage from './pages/ProfilePage';
import CollegesPage from './pages/CollegesPage';
import AdminDashboard from './pages/AdminDashboard';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="app-container">
          
          {/* Reusable Common Navbar with Role-Based Navigation */}
          <Navbar />

          {/* Page Content based on current route */}
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/colleges" element={<CollegesPage />} />
              <Route path="/cutoffs" element={<CutoffPredictorPage />} />
              <Route path="/chatbot" element={<ChatbotPage />} />

              {/* Student Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recommendations"
                element={<RecommendationsPage />}
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Administrator Protected Routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/students"
                element={
                  <AdminRoute>
                    <StudentPage />
                  </AdminRoute>
                }
              />

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
