import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import kambaaLogo from '../assets/kambaa-logo.png';
import { Sparkles, Shield, User, UserCheck, Key, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'intern') navigate('/intern', { replace: true });
      else if (user.role === 'senior_reviewer') navigate('/senior-review', { replace: true });
      else if (user.role === 'admin') navigate('/admin', { replace: true });
      else navigate('/intern', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === 'intern') navigate('/intern', { replace: true });
      else if (loggedUser.role === 'senior_reviewer') navigate('/senior-review', { replace: true });
      else if (loggedUser.role === 'admin') navigate('/admin', { replace: true });
      else navigate('/intern', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src={kambaaLogo} 
            alt="Kambaa Logo" 
            style={{ width: '220px', height: 'auto', maxWidth: '85%', objectFit: 'contain', margin: '0 auto 14px auto', display: 'block' }} 
          />
          <h1 className="gradient-text" style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.02em' }}>KAST AI</h1>
          <p style={{ color: '#475569', fontSize: '0.92rem', fontWeight: 600, margin: 0 }}>Kambaa Knowledge Sharing Tracker</p>
        </div>

        {/* Login Form Card */}
        <div className="kast-card">
          <h2 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '20px', fontWeight: 700 }}>Sign in to your account</h2>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '12px',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '0.88rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="kast-label">Email Address</label>
              <input 
                type="email" 
                className="kast-input" 
                placeholder="name@kambaa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="kast-label">Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="kast-input" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: '42px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'color 0.2s'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="kast-btn kast-btn-primary" 
              style={{ width: '100%', padding: '12px', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={18} />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
