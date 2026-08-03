import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import InternDashboard from './pages/InternDashboard';
import SubmissionForm from './pages/SubmissionForm';
import SeniorReviewDashboard from './pages/SeniorReviewDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AttendanceScreen from './pages/AttendanceScreen';
import KnowledgeBaseChat from './pages/KnowledgeBaseChat';
import ImpactTracker from './pages/ImpactTracker';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'intern') return <Navigate to="/intern" replace />;
  if (user.role === 'senior_reviewer') return <Navigate to="/senior-review" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/intern" replace />;
}

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/intern" element={
            <ProtectedRoute allowedRoles={['intern', 'admin']}>
              <InternDashboard />
            </ProtectedRoute>
          } />

          <Route path="/submit" element={
            <ProtectedRoute allowedRoles={['intern', 'admin']}>
              <SubmissionForm />
            </ProtectedRoute>
          } />

          <Route path="/senior-dashboard" element={
            <ProtectedRoute allowedRoles={['senior_reviewer', 'admin']}>
              <SeniorReviewDashboard initialTab="history" />
            </ProtectedRoute>
          } />

          <Route path="/senior-review" element={
            <ProtectedRoute allowedRoles={['senior_reviewer', 'admin']}>
              <SeniorReviewDashboard initialTab="file_report" />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin', 'senior_reviewer']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/attendance-screen" element={
            <ProtectedRoute>
              <AttendanceScreen />
            </ProtectedRoute>
          } />

          <Route path="/knowledge-chat" element={
            <ProtectedRoute>
              <KnowledgeBaseChat />
            </ProtectedRoute>
          } />

          <Route path="/impact" element={
            <ProtectedRoute allowedRoles={['admin', 'senior_reviewer']}>
              <ImpactTracker />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
