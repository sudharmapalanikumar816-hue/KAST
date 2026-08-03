import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import kambaaLogo from '../assets/kambaa-logo.png';
import API from '../utils/api';
import { 
  Sparkles, QrCode, PlusCircle, MessageSquare, Target, 
  Shield, Bell, LogOut, FileText, UserCheck, Layers, Settings, LayoutDashboard, KeyRound, X, CheckCircle2, AlertCircle, Menu
} from 'lucide-react';

export default function Navbar() {
  const { user, notifications, logout, markNotificationsRead } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Admin Password Change Modal State
  const [showAdminPwdModal, setShowAdminPwdModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [allUsersList, setAllUsersList] = useState([]);
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdErr, setPwdErr] = useState(null);
  const [loadingPwd, setLoadingPwd] = useState(false);

  if (!user) return null;

  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleOpenAdminPwdModal = async () => {
    setPwdMsg(null);
    setPwdErr(null);
    setNewPassword('');
    setShowAdminPwdModal(true);
    setMobileMenuOpen(false);
    if (user) {
      setSelectedUserId(user.id);
    }
    try {
      const res = await API.get('/admin/users');
      if (res.success && res.data) {
        setAllUsersList(res.data);
      }
    } catch (err) {
      console.error('Error loading users list for password change:', err);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.trim().length < 6) {
      setPwdErr('Password must be at least 6 characters long.');
      return;
    }
    const targetId = selectedUserId || user?.id;
    if (!targetId) return;

    setLoadingPwd(true);
    setPwdMsg(null);
    setPwdErr(null);

    try {
      const res = await API.put(`/admin/users/${targetId}/change-password`, {
        newPassword
      });
      if (res.success) {
        setPwdMsg(res.message || 'Password updated successfully!');
        setNewPassword('');
      }
    } catch (err) {
      console.error('Error updating password:', err);
      setPwdErr(err.message || 'Failed to update password.');
    } finally {
      setLoadingPwd(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const renderNavLinks = (isMobile = false) => (
    <>
      {user.role === 'intern' && (
        <>
          <Link 
            to="/intern" 
            onClick={() => isMobile && setMobileMenuOpen(false)}
            className={`kast-btn ${isActive('/intern') ? 'kast-btn-primary' : 'kast-btn-secondary'}`} 
            style={{ padding: '8px 14px', fontSize: '0.85rem', justifyContent: isMobile ? 'flex-start' : 'center', width: isMobile ? '100%' : 'auto' }}
          >
            <Layers size={16} /> My Dashboard
          </Link>
          <Link 
            to="/submit" 
            onClick={() => isMobile && setMobileMenuOpen(false)}
            className={`kast-btn ${isActive('/submit') ? 'kast-btn-primary' : 'kast-btn-secondary'}`} 
            style={{ padding: '8px 14px', fontSize: '0.85rem', justifyContent: isMobile ? 'flex-start' : 'center', width: isMobile ? '100%' : 'auto' }}
          >
            <PlusCircle size={16} /> Tool Submission
          </Link>
          <Link 
            to="/attendance-screen" 
            onClick={() => isMobile && setMobileMenuOpen(false)}
            className={`kast-btn ${isActive('/attendance-screen') ? 'kast-btn-primary' : 'kast-btn-secondary'}`} 
            style={{ padding: '8px 14px', fontSize: '0.85rem', justifyContent: isMobile ? 'flex-start' : 'center', width: isMobile ? '100%' : 'auto' }}
          >
            <QrCode size={16} /> Scan Attendance
          </Link>
        </>
      )}

      {user.role === 'senior_reviewer' && (
        <>
          <Link 
            to="/senior-dashboard" 
            onClick={() => isMobile && setMobileMenuOpen(false)}
            className={`kast-btn ${isActive('/senior-dashboard') ? 'kast-btn-primary' : 'kast-btn-secondary'}`} 
            style={{ padding: '8px 14px', fontSize: '0.85rem', justifyContent: isMobile ? 'flex-start' : 'center', width: isMobile ? '100%' : 'auto' }}
          >
            <LayoutDashboard size={16} /> My Dashboard
          </Link>
          <Link 
            to="/senior-review" 
            onClick={() => isMobile && setMobileMenuOpen(false)}
            className={`kast-btn ${isActive('/senior-review') ? 'kast-btn-primary' : 'kast-btn-secondary'}`} 
            style={{ padding: '8px 14px', fontSize: '0.85rem', justifyContent: isMobile ? 'flex-start' : 'center', width: isMobile ? '100%' : 'auto' }}
          >
            <UserCheck size={16} /> File Session Report
          </Link>
        </>
      )}

      {user.role === 'admin' && (
        <>
          <Link 
            to="/admin" 
            onClick={() => isMobile && setMobileMenuOpen(false)}
            className={`kast-btn ${isActive('/admin') ? 'kast-btn-primary' : 'kast-btn-secondary'}`} 
            style={{ padding: '8px 14px', fontSize: '0.85rem', justifyContent: isMobile ? 'flex-start' : 'center', width: isMobile ? '100%' : 'auto' }}
          >
            <Shield size={16} /> Progress Feed
          </Link>
          <Link 
            to="/attendance-screen" 
            onClick={() => isMobile && setMobileMenuOpen(false)}
            className={`kast-btn ${isActive('/attendance-screen') ? 'kast-btn-primary' : 'kast-btn-secondary'}`} 
            style={{ padding: '8px 14px', fontSize: '0.85rem', justifyContent: isMobile ? 'flex-start' : 'center', width: isMobile ? '100%' : 'auto' }}
          >
            <QrCode size={16} /> Room QR Display
          </Link>
          <Link 
            to="/impact" 
            onClick={() => isMobile && setMobileMenuOpen(false)}
            className={`kast-btn ${isActive('/impact') ? 'kast-btn-primary' : 'kast-btn-secondary'}`} 
            style={{ padding: '8px 14px', fontSize: '0.85rem', justifyContent: isMobile ? 'flex-start' : 'center', width: isMobile ? '100%' : 'auto' }}
          >
            <Target size={16} /> Impact Tracker
          </Link>
        </>
      )}

      <Link 
        to="/knowledge-chat" 
        onClick={() => isMobile && setMobileMenuOpen(false)}
        className={`kast-btn ${isActive('/knowledge-chat') ? 'kast-btn-primary' : 'kast-btn-secondary'}`} 
        style={{ padding: '8px 14px', fontSize: '0.85rem', justifyContent: isMobile ? 'flex-start' : 'center', width: isMobile ? '100%' : 'auto' }}
      >
        <MessageSquare size={16} /> AI Chat
      </Link>
    </>
  );

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 20px rgba(148, 163, 184, 0.08)'
    }}>
      <div className="kast-container" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand Logo */}
        <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <img 
            src={kambaaLogo} 
            alt="Kambaa Logo" 
            style={{ height: '34px', width: 'auto', objectFit: 'contain' }} 
          />
          <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: '10px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '4px', lineHeight: 1.2 }}>
              KAST <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4338ca', background: '#e0e7ff', padding: '1px 5px', borderRadius: '4px' }}>AI</span>
            </span>
            <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginTop: '1px' }}>
              Knowledge Tracker
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {renderNavLinks(false)}
        </nav>

        {/* Desktop User Controls */}
        <div className="desktop-user-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          
          {/* Notifications Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => {
                setShowNotifs(!showNotifs);
                if (unreadCount > 0) markNotificationsRead();
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '8px',
                color: '#475569',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '44px',
                width: '300px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '14px',
                padding: '14px',
                boxShadow: '0 10px 30px rgba(148, 163, 184, 0.25)',
                zIndex: 200
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px', color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Notifications</span>
                  <span style={{ fontSize: '0.75rem', color: '#4338ca' }}>Recent Alerts</span>
                </div>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>No new notifications.</p>
                ) : (
                  <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notifications.map((n, i) => (
                      <div key={i} style={{
                        fontSize: '0.78rem',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: n.type === 'escalation' ? '#ffe4e6' : '#f1f5f9',
                        borderLeft: `3px solid ${n.type === 'escalation' ? '#ef4444' : '#6366f1'}`,
                        color: '#334155'
                      }}>
                        {n.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{user.name}</div>
              <div style={{ fontSize: '0.7rem', color: '#4338ca', textTransform: 'capitalize', fontWeight: 600 }}>
                {user.role.replace('_', ' ')}
              </div>
            </div>
            {isAdmin && (
              <button 
                onClick={handleOpenAdminPwdModal} 
                title="Admin Password Control"
                style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  padding: '8px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <KeyRound size={16} />
              </button>
            )}
            <button 
              onClick={handleLogout} 
              title="Logout"
              style={{
                background: '#ffe4e6',
                border: '1px solid #fecdd3',
                color: '#9f1239',
                padding: '8px',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>

        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="mobile-menu-btn" style={{ display: 'none' }}>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '8px',
              color: '#0f172a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Toggle mobile navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

      </div>

      {/* Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-drawer" style={{
          background: '#ffffff',
          borderBottom: '1px solid #cbd5e1',
          padding: '16px 20px 24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}>
          {/* User Profile Summary */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '4px' }}>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{user.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#4338ca', textTransform: 'capitalize', fontWeight: 600 }}>
                {user.role.replace('_', ' ')}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isAdmin && (
                <button 
                  onClick={handleOpenAdminPwdModal} 
                  title="Admin Password Control"
                  className="kast-btn"
                  style={{ background: '#fef3c7', color: '#92400e', padding: '6px 10px', fontSize: '0.8rem' }}
                >
                  <KeyRound size={15} /> Password Control
                </button>
              )}
              <button 
                onClick={handleLogout} 
                className="kast-btn"
                style={{ background: '#ffe4e6', color: '#9f1239', padding: '6px 10px', fontSize: '0.8rem' }}
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          </div>

          {/* Navigation Links list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {renderNavLinks(true)}
          </div>
        </div>
      )}

      {/* ADMIN CHANGE PASSWORD OVERLAY MODAL */}
      {showAdminPwdModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="kast-card" style={{
            width: '100%', maxWidth: '460px', background: '#ffffff',
            borderRadius: '16px', position: 'relative', padding: '24px'
          }}>
            <button 
              onClick={() => setShowAdminPwdModal(false)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: '#f1f5f9', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer'
              }}
            >
              <X size={18} color="#64748b" />
            </button>

            <h2 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={22} color="#d97706" /> Admin Password Control
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
              System Admin can change password for Admin self, regular users, or senior employees.
            </p>

            {pwdMsg && (
              <div style={{ padding: '10px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontSize: '0.85rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} /> {pwdMsg}
              </div>
            )}

            {pwdErr && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {pwdErr}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="kast-label">Select User / Employee</label>
                <select 
                  className="kast-select" 
                  style={{ color: '#0f172a', background: '#ffffff' }}
                  value={selectedUserId} 
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  {allUsersList.length === 0 ? (
                    <option value={user?.id}>{user?.name} (Admin Self)</option>
                  ) : (
                    allUsersList.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.role ? u.role.replace('_', ' ').toUpperCase() : 'USER'} ({u.email})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="kast-label">New Password</label>
                <input 
                  type="password" 
                  className="kast-input" 
                  placeholder="Enter new password (min 6 chars)..." 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                  minLength={6}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAdminPwdModal(false)} className="kast-btn kast-btn-secondary">
                  Close
                </button>
                <button type="submit" disabled={loadingPwd} className="kast-btn kast-btn-primary" style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', borderColor: '#d97706' }}>
                  {loadingPwd ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
