import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, UserPlus, Calendar, PlusCircle, Shield, UserCheck, 
  CheckCircle2, AlertCircle, RefreshCw, Sparkles, Send, Settings, ChevronRight, Mail,
  Pencil, Trash2, X, KeyRound, Lock
} from 'lucide-react';

export default function ProgramOwnerManagement() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const [users, setUsers] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Password Reset Modal State (Admin Only)
  const [pwdModalUser, setPwdModalUser] = useState(null);
  const [newPwdInput, setNewPwdInput] = useState('');

  // New User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Password123!');
  const [newRole, setNewRole] = useState('intern');
  const [newDepartment, setNewDepartment] = useState('Engineering');
  const [newOrderIndex, setNewOrderIndex] = useState(1);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('intern');
  const [editDepartment, setEditDepartment] = useState('Engineering');
  const [editOrderIndex, setEditOrderIndex] = useState(1);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');

  // Session Creator Form State
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPresenterId, setSelectedPresenterId] = useState('');
  const [selectedReviewerId, setSelectedReviewerId] = useState('');

  const [userMsg, setUserMsg] = useState(null);
  const [sessionMsg, setSessionMsg] = useState(null);
  const [reminderMsg, setReminderMsg] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      const [usersRes, revRes] = await Promise.all([
        API.get('/admin/users').catch(e => { console.error('Error fetching users:', e); return { success: false, data: [] }; }),
        API.get('/admin/reviewers').catch(e => { console.error('Error fetching reviewers:', e); return { success: false, data: [] }; })
      ]);

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
        const interns = usersRes.data.filter(u => u.role && u.role.toLowerCase().includes('intern'));
        if (interns.length > 0) setSelectedPresenterId(interns[0].id);
      }
      
      if (revRes.success && revRes.data && revRes.data.length > 0) {
        setReviewers(revRes.data);
        setSelectedReviewerId(revRes.data[0].id);
      } else if (usersRes.success && usersRes.data) {
        const revs = usersRes.data.filter(u => u.role && !u.role.toLowerCase().includes('intern'));
        setReviewers(revs);
        if (revs.length > 0) setSelectedReviewerId(revs[0].id);
      }
    } catch (err) {
      console.error('Error loading management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);
    setUserMsg(null);

    const payload = {
      name: newName,
      email: newEmail,
      password: newPassword,
      role: newRole,
      department: newDepartment,
      orderIndex: newOrderIndex
    };

    try {
      let res;
      try {
        res = await API.post('/admin/users', payload);
      } catch (err1) {
        res = await API.post('/auth/register', payload);
      }

      if (res && res.success) {
        setUserMsg(res.message || `User '${newName}' created successfully!`);
        setNewName('');
        setNewEmail('');
        loadData();
      }
    } catch (err) {
      console.error('Error creating user:', err);
      const msg = (err && err.message) || (typeof err === 'string' ? err : 'Failed to create user.');
      setError(msg);
    }
  };

  const handleOpenEditModal = (u) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditEmail(u.email || '');
    setEditRole(u.role || 'intern');
    setEditDepartment(u.department || 'Engineering');
    setEditOrderIndex(u.order_index || 1);
    setEditIsActive(u.is_active !== undefined ? Boolean(u.is_active) : true);
    setEditPassword('');
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    setError(null);
    setUserMsg(null);

    try {
      const res = await API.put(`/admin/users/${editingUser.id}`, {
        name: editName,
        email: editEmail,
        role: editRole,
        department: editDepartment,
        orderIndex: editOrderIndex,
        isActive: editIsActive,
        password: editPassword
      });

      if (res.success) {
        setUserMsg(res.message || `User '${editName}' updated successfully!`);
        setEditingUser(null);
        loadData();
      }
    } catch (err) {
      console.error('Error updating user:', err);
      const msg = (err && err.message) || 'Failed to update user.';
      setError(msg);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Are you sure you want to delete user '${u.name}' (${u.email})? This action cannot be undone.`)) {
      return;
    }
    setError(null);
    setUserMsg(null);

    try {
      const res = await API.delete(`/admin/users/${u.id}`);
      if (res.success) {
        setUserMsg(res.message || `User '${u.name}' deleted successfully.`);
        loadData();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      const msg = (err && err.message) || 'Failed to delete user.';
      setError(msg);
    }
  };

  const handleAdminChangePassword = async (e) => {
    e.preventDefault();
    if (!newPwdInput || newPwdInput.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setUserMsg(null);

    try {
      const res = await API.put(`/admin/users/${pwdModalUser.id}/change-password`, {
        newPassword: newPwdInput
      });

      if (res.success) {
        setUserMsg(res.message || `Password for '${pwdModalUser.name}' updated successfully.`);
        setPwdModalUser(null);
        setNewPwdInput('');
        loadData();
      }
    } catch (err) {
      console.error('Error changing user password:', err);
      const msg = (err && err.message) || 'Failed to update password.';
      setError(msg);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setError(null);
    setSessionMsg(null);

    if (!selectedPresenterId || !selectedReviewerId) {
      setError('Please select both a Rotational Presenter and a Senior Reviewer.');
      return;
    }

    try {
      const res = await API.post('/admin/create-session', {
        sessionDate,
        presenterId: selectedPresenterId,
        reviewerId: selectedReviewerId
      });

      if (res.success) {
        setSessionMsg(res.message);
      }
    } catch (err) {
      console.error('Error creating session:', err);
      const msg = (err && err.message) || (typeof err === 'string' ? err : 'Failed to create session.');
      setError(msg);
    }
  };

  const handleTriggerReminders = async () => {
    setError(null);
    setReminderMsg(null);

    try {
      const res = await API.post('/admin/trigger-reminders', {});
      if (res.success) {
        setReminderMsg(res.message);
      }
    } catch (err) {
      console.error('Error dispatching email reminders:', err);
      const msg = (err && err.message) || 'Failed to dispatch email reminders.';
      setError(msg);
    }
  };

  const handleClearPresentedHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all presented tool history, session reports, and catalog entries?')) return;
    setError(null);
    setUserMsg(null);
    try {
      const res = await API.post('/admin/clear-presented-history');
      if (res.success) {
        setUserMsg(res.message);
        loadData();
      }
    } catch (err) {
      console.error('Error clearing presented history:', err);
      setError((err && err.message) || 'Failed to clear presented history.');
    }
  };

  const handleClearDummyData = async () => {
    if (!window.confirm('Are you sure you want to clear all dummy submissions, session reports, attendance logs, and catalog entries?')) return;
    setError(null);
    setUserMsg(null);
    try {
      const res = await API.post('/admin/clear-dummy-data');
      if (res.success) {
        setUserMsg(res.message);
        loadData();
      }
    } catch (err) {
      console.error('Error clearing dummy data:', err);
      setError((err && err.message) || 'Failed to clear dummy data.');
    }
  };

  if (loading) {
    return <div className="kast-container" style={{ textAlign: 'center', paddingTop: '60px', color: '#0f172a' }}>Loading Management Portal...</div>;
  }

  const internsList = users.filter(u => u.role && u.role.toLowerCase().includes('intern'));
  const reviewersList = reviewers.length > 0 
    ? reviewers 
    : users.filter(u => u.role && !u.role.toLowerCase().includes('intern'));

  return (
    <div className="kast-container">
      
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={26} color="#4338ca" /> Website Management Portal
          </h1>
          <p style={{ color: '#475569', fontSize: '0.95rem' }}>
            Manage user accounts, configure rotational presenter schedules, create morning AI sessions, and invite senior reviewers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={handleTriggerReminders}
            className="kast-btn kast-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', fontWeight: 600 }}
          >
            <Mail size={18} color="#4338ca" /> Dispatch Email Reminders
          </button>
          
          <button 
            type="button"
            onClick={handleClearPresentedHistory}
            className="kast-btn kast-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', fontWeight: 600 }}
          >
            <Trash2 size={18} color="#be123c" /> Clear Presented History
          </button>
        </div>
      </div>

      {reminderMsg && (
        <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> {reminderMsg}
        </div>
      )}

      {error && (
        <div style={{ background: '#ffe4e6', border: '1px solid #fecdd3', color: '#9f1239', padding: '12px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="kast-grid-2" style={{ marginBottom: '32px' }}>
        
        {/* CREATE AI SESSION & ASSIGN ROTATIONAL PRESENTER / INVITE REVIEWER */}
        <div className="kast-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="#4338ca" /> Create AI Session & Assign Rotational Presenter
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '16px' }}>
            Schedule daily morning 9:00 - 9:30 AM session, assign day's rotational intern, and invite a Senior Reviewer.
          </p>

          {sessionMsg && (
            <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> {sessionMsg}
            </div>
          )}

          <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="kast-label">Session Date</label>
              <input 
                type="date" 
                className="kast-input" 
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="kast-label">Assign Rotational Presenter (Intern)</label>
              <select 
                className="kast-select" 
                style={{ color: '#0f172a', background: '#ffffff' }}
                value={selectedPresenterId} 
                onChange={(e) => setSelectedPresenterId(e.target.value)}
                required
              >
                {internsList.length === 0 && (
                  <option value="" style={{ color: '#0f172a' }}>-- Select Intern --</option>
                )}
                {internsList.map(intern => (
                  <option key={intern.id} value={intern.id} style={{ color: '#0f172a', background: '#ffffff' }}>
                    Cycle Position #{intern.order_index || 1} — {intern.name} ({intern.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="kast-label">Invite Senior Reviewer (Duty Monitor)</label>
              <select 
                className="kast-select" 
                style={{ color: '#0f172a', background: '#ffffff' }}
                value={selectedReviewerId} 
                onChange={(e) => setSelectedReviewerId(e.target.value)}
                required
              >
                {reviewersList.length === 0 && (
                  <option value="" style={{ color: '#0f172a' }}>-- Select Reviewer --</option>
                )}
                {reviewersList.map(rev => (
                  <option key={rev.id} value={rev.id} style={{ color: '#0f172a', background: '#ffffff' }}>
                    {rev.name} ({rev.email} - {rev.department || 'Senior Lead'})
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="kast-btn kast-btn-primary" style={{ marginTop: '6px' }}>
              <Calendar size={16} /> Create Morning Session & Send Invites
            </button>
          </form>
        </div>

        {/* CREATE NEW SYSTEM USER */}
        <div className="kast-card" style={{ borderLeft: '4px solid #10b981' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={20} color="#059669" /> Add / Register New User
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '16px' }}>
            Register new Interns, Senior Reviewers, or System Admins into KAST.
          </p>

          {userMsg && (
            <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> {userMsg}
            </div>
          )}

          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="kast-grid-2">
              <div>
                <label className="kast-label">Full Name *</label>
                <input 
                  type="text" 
                  className="kast-input" 
                  placeholder="e.g. Rahul Verma" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="kast-label">Email Address *</label>
                <input 
                  type="email" 
                  className="kast-input" 
                  placeholder="rahul@kambaa.com" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="kast-grid-2">
              <div>
                <label className="kast-label">System Role</label>
                <select className="kast-select" style={{ color: '#0f172a', background: '#ffffff' }} value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  <option value="intern" style={{ color: '#0f172a', background: '#ffffff' }}>Intern Presenter</option>
                  <option value="senior_reviewer" style={{ color: '#0f172a', background: '#ffffff' }}>Senior Reviewer</option>
                  <option value="admin" style={{ color: '#0f172a', background: '#ffffff' }}>System Admin</option>
                </select>
              </div>

              <div>
                <label className="kast-label">Rotation Sequence Index</label>
                <input 
                  type="number" 
                  className="kast-input" 
                  min={1} 
                  value={newOrderIndex}
                  onChange={(e) => setNewOrderIndex(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div>
              <label className="kast-label">Password</label>
              <input 
                type="text" 
                className="kast-input" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="kast-btn kast-btn-primary" style={{ background: '#059669', marginTop: '6px' }}>
              <UserPlus size={16} /> Add User to System
            </button>
          </form>
        </div>

      </div>

      {/* SYSTEM USERS DIRECTORY TABLE */}
      <div className="kast-card">
        <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={20} color="#4338ca" /> Manage System Users Directory ({users.length})
        </h3>

        <div className="kast-table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', background: '#f8fafc' }}>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Name</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Email</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>System Role</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Department</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Rotation Index</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Account Status</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>{u.name}</td>
                  <td style={{ padding: '12px 14px', color: '#334155' }}>{u.email}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className={`kast-badge ${u.role && u.role.toLowerCase().includes('intern') ? 'kast-badge-primary' : u.role && u.role.toLowerCase().includes('reviewer') ? 'kast-badge-live' : 'kast-badge-warning'}`}>
                      {u.role ? u.role.replace('_', ' ').toUpperCase() : 'USER'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#475569' }}>{u.department || 'Engineering'}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#4338ca' }}>
                    {u.role && u.role.toLowerCase().includes('intern') ? `Position #${u.order_index || 1}` : 'N/A'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className={`kast-badge ${u.is_active ? 'kast-badge-live' : 'kast-badge-danger'}`}>
                      {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => handleOpenEditModal(u)} 
                        className="kast-btn kast-btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => { setPwdModalUser(u); setNewPwdInput(''); setError(null); }} 
                          className="kast-btn" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <KeyRound size={13} /> Password
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteUser(u)} 
                        className="kast-btn" 
                        style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#ffe4e6', color: '#9f1239', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT USER OVERLAY MODAL */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="kast-card" style={{
            width: '100%',
            maxWidth: '540px',
            background: '#ffffff',
            borderRadius: '16px',
            position: 'relative',
            padding: '24px'
          }}>
            <button 
              onClick={() => setEditingUser(null)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: '#f1f5f9', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer'
              }}
            >
              <X size={18} color="#64748b" />
            </button>

            <h2 style={{ fontSize: '1.3rem', color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pencil size={20} color="#4338ca" /> Edit User Profile ({editingUser.name})
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
              Update account role, contact details, rotation sequence index, or reset password.
            </p>

            <form onSubmit={handleSaveUserEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="kast-label">Full Name</label>
                  <input 
                    type="text" 
                    className="kast-input" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label className="kast-label">Email Address</label>
                  <input 
                    type="email" 
                    className="kast-input" 
                    value={editEmail} 
                    onChange={(e) => setEditEmail(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="kast-label">System Role</label>
                  <select className="kast-select" style={{ color: '#0f172a', background: '#ffffff' }} value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                    <option value="intern">Intern Presenter</option>
                    <option value="senior_reviewer">Senior Reviewer</option>
                    <option value="admin">System Admin</option>
                    <option value="program_owner">Program Owner</option>
                  </select>
                </div>
                <div>
                  <label className="kast-label">Department</label>
                  <input 
                    type="text" 
                    className="kast-input" 
                    value={editDepartment} 
                    onChange={(e) => setEditDepartment(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="kast-label">Rotation Order Index</label>
                  <input 
                    type="number" 
                    className="kast-input" 
                    min={1} 
                    value={editOrderIndex} 
                    onChange={(e) => setEditOrderIndex(parseInt(e.target.value) || 1)} 
                  />
                </div>
                <div>
                  <label className="kast-label">Account Status</label>
                  <select 
                    className="kast-select" 
                    style={{ color: '#0f172a', background: '#ffffff' }} 
                    value={editIsActive ? 'true' : 'false'} 
                    onChange={(e) => setEditIsActive(e.target.value === 'true')}
                  >
                    <option value="true">ACTIVE</option>
                    <option value="false">INACTIVE</option>
                  </select>
                </div>
              </div>

              {isAdmin ? (
                <div>
                  <label className="kast-label">New Password (leave blank to keep current)</label>
                  <input 
                    type="password" 
                    className="kast-input" 
                    placeholder="Enter new password..." 
                    value={editPassword} 
                    onChange={(e) => setEditPassword(e.target.value)} 
                  />
                </div>
              ) : (
                <div>
                  <label className="kast-label">Password Modification</label>
                  <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={14} color="#94a3b8" /> Only System Admin is authorized to change user passwords.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingUser(null)} className="kast-btn kast-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="kast-btn kast-btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN CHANGE PASSWORD OVERLAY MODAL */}
      {pwdModalUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="kast-card" style={{
            width: '100%', maxWidth: '440px', background: '#ffffff',
            borderRadius: '16px', position: 'relative', padding: '24px'
          }}>
            <button 
              onClick={() => setPwdModalUser(null)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: '#f1f5f9', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer'
              }}
            >
              <X size={18} color="#64748b" />
            </button>

            <h2 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={20} color="#d97706" /> Admin Password Change
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
              Set a new password for <strong>{pwdModalUser.name}</strong> ({pwdModalUser.role?.replace('_', ' ')}).
            </p>

            <form onSubmit={handleAdminChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="kast-label">New Password</label>
                <input 
                  type="password" 
                  className="kast-input" 
                  placeholder="Enter new secure password..." 
                  value={newPwdInput} 
                  onChange={(e) => setNewPwdInput(e.target.value)} 
                  required 
                  minLength={6}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setPwdModalUser(null)} className="kast-btn kast-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="kast-btn kast-btn-primary" style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', borderColor: '#d97706' }}>
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
