import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#818cf8' }}>
        <p>Loading KAST App...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect user to appropriate dashboard based on their role
    if (user.role === 'intern') return <Navigate to="/intern" replace />;
    if (user.role === 'senior_reviewer') return <Navigate to="/senior-review" replace />;
    if (user.role === 'admin' || user.role === 'program_owner') return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}
