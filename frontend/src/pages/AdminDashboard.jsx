import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import RatingStars from '../components/RatingStars';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, CheckCircle2, AlertTriangle, Users, Calendar, 
  BookOpen, ExternalLink, Zap, RefreshCw, Eye, TrendingUp, Award, Bell,
  FileText, Clock, Download, X, Search, User, FileCode2, Sparkles, UserCheck, AlertCircle, Trash2
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeAdminTab, setActiveAdminTab] = useState('progress_feed'); // 'progress_feed', 'interns_cards', 'seniors_cards'
  
  const [todayFeed, setTodayFeed] = useState(null);
  const [stats, setStats] = useState(null);
  const [presenters, setPresenters] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [seniorsList, setSeniorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Today attendance breakdown sub-tab state ('present', 'late', 'absent')
  const [todayAttTab, setTodayAttTab] = useState('present');

  // Intern Card Detail Modal State
  const [selectedInternId, setSelectedInternId] = useState(null);
  const [internDetailData, setInternDetailData] = useState(null);
  const [modalTab, setModalTab] = useState('attendance'); // 'attendance' or 'tools_presented'
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedToolId, setExpandedToolId] = useState(null);

  // Senior Card Detail Modal State
  const [selectedSeniorId, setSelectedSeniorId] = useState(null);
  const [seniorDetailData, setSeniorDetailData] = useState(null);
  const [loadingSeniorDetail, setLoadingSeniorDetail] = useState(false);

  // Search filter for intern & senior cards
  const [internSearch, setInternSearch] = useState('');
  const [seniorSearch, setSeniorSearch] = useState('');

  const handleClearPresentedHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all presented tool history, session reports, and catalog entries?')) return;
    try {
      const res = await API.post('/admin/clear-presented-history');
      if (res.success) {
        alert(res.message);
        loadAllData();
      }
    } catch (err) {
      alert('Error clearing presented history: ' + err.message);
    }
  };

  const handleDeleteSubmission = async (subId) => {
    if (!window.confirm('Are you sure you want to delete this tool submission record?')) return;
    try {
      const res = await API.delete(`/admin/submissions/${subId}`);
      if (res.success) {
        if (selectedInternId) handleOpenInternModal(selectedInternId);
        loadAllData();
      }
    } catch (err) {
      alert('Error deleting submission: ' + err.message);
    }
  };

  const loadAllData = async () => {
    try {
      const [feedRes, statsRes, presRes, revRes, usersRes] = await Promise.all([
        API.get('/admin/today-feed'),
        API.get('/admin/dashboard-stats'),
        API.get('/rotation/presenters'),
        API.get('/rotation/reviewers'),
        API.get('/admin/users')
      ]);

      if (feedRes.success) setTodayFeed(feedRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (presRes.success) setPresenters(presRes.data);
      if (revRes.success) setReviewers(revRes.data);
      if (usersRes.success) {
        setUsersList(usersRes.data.filter(u => u.role === 'intern'));
        setSeniorsList(usersRes.data.filter(u => u.role === 'senior_reviewer'));
      }
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleOpenInternModal = async (internId) => {
    setSelectedInternId(internId);
    setModalTab('attendance');
    setLoadingDetail(true);
    setExpandedToolId(null);

    try {
      const res = await API.get(`/admin/intern-detail/${internId}`);
      if (res.success) {
        setInternDetailData(res.data);
      }
    } catch (err) {
      alert('Error fetching intern details: ' + err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenSeniorModal = async (seniorId) => {
    setSelectedSeniorId(seniorId);
    setLoadingSeniorDetail(true);

    try {
      const res = await API.get(`/admin/senior-detail/${seniorId}`);
      if (res.success) {
        setSeniorDetailData(res.data);
      }
    } catch (err) {
      alert('Error fetching senior employee details: ' + err.message);
    } finally {
      setLoadingSeniorDetail(false);
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return { label: 'Admin User', bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', badgeClass: 'kast-badge-warning' };
    } else if (role === 'program_owner') {
      return { label: 'Program Owner', bg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', badgeClass: 'kast-badge-live' };
    } else {
      return { label: 'Senior Reviewer', bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', badgeClass: 'kast-badge-primary' };
    }
  };

  if (loading) {
    return <div className="kast-container" style={{ textAlign: 'center', paddingTop: '60px', color: '#0f172a' }}>Loading Admin Dashboard...</div>;
  }

  const report = todayFeed?.report;
  const session = todayFeed?.session;
  const submission = todayFeed?.submission;
  const attSummary = todayFeed?.attendanceSummary;

  const todayPresentList = todayFeed?.todayPresentList || [];
  const todayLateList = todayFeed?.todayLateList || [];
  const todayAbsentList = todayFeed?.todayAbsentList || [];

  const filteredInterns = usersList.filter(u => {
    if (!internSearch.trim()) return true;
    const term = internSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.department && u.department.toLowerCase().includes(term))
    );
  });

  const filteredSeniors = seniorsList.filter(u => {
    if (!seniorSearch.trim()) return true;
    const term = seniorSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term) ||
      (u.department && u.department.toLowerCase().includes(term))
    );
  });

  return (
    <div className="kast-container">
      
      {/* Header & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={26} color="#d97706" /> Kambaa Admin Monitoring Dashboard
          </h1>
          <p style={{ color: '#475569', fontSize: '0.92rem' }}>
            Monitor daily session progress, physical attendance, and inspect detailed intern performance cards.
          </p>
        </div>
        
        <button onClick={loadAllData} className="kast-btn kast-btn-secondary" style={{ fontSize: '0.85rem' }}>
          <RefreshCw size={16} /> Refresh Dashboard
        </button>
      </div>

      {/* Top Navigation Tabs Header */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveAdminTab('progress_feed')}
          className={`kast-btn ${activeAdminTab === 'progress_feed' ? 'kast-btn-primary' : 'kast-btn-secondary'}`}
          style={{ fontSize: '0.92rem', padding: '10px 18px' }}
        >
          <Zap size={16} /> Morning Session Progress Feed
        </button>

        <button
          onClick={() => setActiveAdminTab('interns_cards')}
          className={`kast-btn ${activeAdminTab === 'interns_cards' ? 'kast-btn-primary' : 'kast-btn-secondary'}`}
          style={{ fontSize: '0.92rem', padding: '10px 18px', background: activeAdminTab === 'interns_cards' ? 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)' : '' }}
        >
          <Users size={16} /> All Interns Directory & Cards ({usersList.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('seniors_cards')}
          className={`kast-btn ${activeAdminTab === 'seniors_cards' ? 'kast-btn-primary' : 'kast-btn-secondary'}`}
          style={{ fontSize: '0.92rem', padding: '10px 18px', background: activeAdminTab === 'seniors_cards' ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : '' }}
        >
          <UserCheck size={16} /> Senior Reviewer Cards ({seniorsList.length})
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: MORNING SESSION PROGRESS FEED */}
      {/* ================================================================= */}
      {activeAdminTab === 'progress_feed' && (
        <div>
          {/* Autonomous Rotation Banner Note */}
          <div style={{
            background: '#eef2ff',
            border: '1px solid #c7d2fe',
            borderRadius: '12px',
            padding: '14px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Zap size={20} color="#4338ca" />
              <span style={{ fontSize: '0.88rem', color: '#1e293b' }}>
                <strong>Autonomous Engine Active</strong>: Daily morning session turn advances automatically through fixed intern cycle order. Interns are auto-notified at 18:00 PM the evening before.
              </span>
            </div>
            <span className="kast-badge kast-badge-live">AUTOPILOT ON</span>
          </div>

          {/* HERO CARD: "WHAT HAPPENED TODAY" DAILY SESSION REPORT FEED */}
          <div className="kast-card" style={{
            border: '2px solid #818cf8',
            background: '#ffffff',
            marginBottom: '24px',
            boxShadow: '0 12px 30px rgba(99, 102, 241, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#fef3c7', padding: '4px 10px', borderRadius: '12px', border: '1px solid #fde68a' }}>
                  TODAY'S MORNING SESSION REPORT FEED ({todayFeed?.date})
                </span>
              </div>
              <span className={`kast-badge ${session?.status === 'completed' ? 'kast-badge-live' : 'kast-badge-warning'}`}>
                {session?.status ? session.status.toUpperCase() : 'NO SESSION YET'}
              </span>
            </div>

            {report ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '4px' }}>
                      Topic Presented: <span className="gradient-text">{report.tool_presented || 'AI Tool'}</span>
                    </h2>
                    <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                      Auto-Scheduled Presenter: <strong style={{ color: '#0f172a' }}>{report.presenter_name}</strong> | Senior Monitor: <strong style={{ color: '#0f172a' }}>{report.reporter_name}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Presentation Quality:</span>
                    <RatingStars rating={report.presentation_quality_rating} readOnly />
                    <span style={{ fontWeight: 800, color: '#b45309' }}>{report.presentation_quality_rating}/5</span>
                  </div>
                </div>

                {/* Session Summary Body */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#3730a3', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Senior Monitor Summary & Coverage:
                  </div>
                  <p style={{ color: '#1e293b', fontSize: '0.95rem', lineHeight: '1.6' }}>{report.session_summary}</p>
                </div>

                {/* Attendance Snapshot & Flags Grid */}
                <div className="kast-grid-2" style={{ gap: '16px' }}>
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Attendance Observation:
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>{report.attendance_observation || '100% Present on time.'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '4px' }}>
                      Physical Check-in Rate: <strong>{attSummary?.percentage || 100}%</strong> ({attSummary?.present || 0} On Time, {attSummary?.late || 0} Late, {attSummary?.absent || 0} Absent)
                    </div>
                  </div>

                  <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '12px 16px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#9f1239', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Flags Logged for Attention:
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{report.flags || 'No flags reported.'}</div>
                    {submission?.poc_repo_url && (
                      <div style={{ marginTop: '4px' }}>
                        <a href={submission.poc_repo_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: 700 }}>
                          🔗 View Intern's POC Code Repo
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                <AlertTriangle size={36} color="#d97706" style={{ marginBottom: '12px' }} />
                <h3 style={{ color: '#0f172a', marginBottom: '4px' }}>Today's Session Report Pending</h3>
                <p style={{ color: '#475569', fontSize: '0.9rem' }}>
                  Auto-scheduled presenter ({session?.presenter_name || 'Assigned Intern'}) and reviewer ({session?.reviewer_name || 'Senior Lead'}) are conducting today's single 9:00 AM morning session.
                </p>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* TODAY'S ATTENDANCE DETAILS WITH EXACT SCAN TIMES */}
          {/* ================================================================= */}
          <div className="kast-card" style={{ marginBottom: '32px', borderLeft: '4px solid #10b981' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#059669" />
                <h3 style={{ fontSize: '1.2rem', color: '#0f172a', margin: 0 }}>
                  Today's Session Attendance & Scan Times (9:00 - 9:30 AM)
                </h3>
              </div>

              {/* Sub-tab pills: Present, Late, Absent */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setTodayAttTab('present')}
                  className={`kast-btn ${todayAttTab === 'present' ? 'kast-btn-primary' : 'kast-btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '6px 12px', background: todayAttTab === 'present' ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : '' }}
                >
                  🟢 Present ({todayPresentList.length})
                </button>

                <button
                  onClick={() => setTodayAttTab('late')}
                  className={`kast-btn ${todayAttTab === 'late' ? 'kast-btn-primary' : 'kast-btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '6px 12px', background: todayAttTab === 'late' ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' : '' }}
                >
                  🟡 Late Comers ({todayLateList.length})
                </button>

                <button
                  onClick={() => setTodayAttTab('absent')}
                  className={`kast-btn ${todayAttTab === 'absent' ? 'kast-btn-primary' : 'kast-btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '6px 12px', background: todayAttTab === 'absent' ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : '' }}
                >
                  🔴 Absentees ({todayAbsentList.length})
                </button>
              </div>
            </div>

            {/* PRESENT ON-TIME TAB */}
            {todayAttTab === 'present' && (
              <div>
                {todayPresentList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                    No on-time check-in scans recorded yet for today.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', background: '#f8fafc' }}>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Intern Participant</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Department</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Exact Scan Timestamp</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Check-in Method</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayPresentList.map((item) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{item.user_name}</td>
                            <td style={{ padding: '10px 12px', color: '#475569' }}>{item.department || 'Engineering'}</td>
                            <td style={{ padding: '10px 12px', color: '#059669', fontWeight: 700, fontFamily: 'monospace' }}>
                              <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                              {item.marked_at ? new Date(item.marked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '09:02:15 AM'}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#475569' }}>
                              {item.method === 'qr' ? '📷 Phone QR Scan' : '✍️ Manual Check-in'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span className="kast-badge kast-badge-live">PRESENT (ON TIME)</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* LATE COMERS TAB */}
            {todayAttTab === 'late' && (
              <div>
                {todayLateList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                    Great news! No late check-ins recorded for today's session.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', background: '#f8fafc' }}>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Late Participant</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Department</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Exact Late Scan Timestamp</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Check-in Method</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayLateList.map((item) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{item.user_name}</td>
                            <td style={{ padding: '10px 12px', color: '#475569' }}>{item.department || 'Engineering'}</td>
                            <td style={{ padding: '10px 12px', color: '#d97706', fontWeight: 700, fontFamily: 'monospace' }}>
                              <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                              {item.marked_at ? new Date(item.marked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '09:14:32 AM'}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#475569' }}>
                              {item.method === 'qr' ? '📷 Phone QR Scan' : '✍️ Manual Check-in'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span className="kast-badge kast-badge-warning">LATE CHECK-IN</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ABSENTEES TAB */}
            {todayAttTab === 'absent' && (
              <div>
                {todayAbsentList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#059669', fontWeight: 700 }}>
                    🎉 100% Attendance! All registered interns have scanned or checked in for today's session.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', background: '#f8fafc' }}>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Absent Intern</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Email</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Department</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700 }}>Attendance Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayAbsentList.map((item) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{item.name}</td>
                            <td style={{ padding: '10px 12px', color: '#64748b' }}>{item.email}</td>
                            <td style={{ padding: '10px 12px', color: '#475569' }}>{item.department || 'Engineering'}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span className="kast-badge kast-badge-danger">NO SCAN / ABSENT</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Automatic Presenter Rotation Cycle Schedule Table */}
          <div className="kast-card" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#4338ca" /> Automated Morning Session Presenter Schedule
              </h3>
              <button 
                type="button"
                onClick={handleClearPresentedHistory}
                className="kast-btn kast-btn-secondary"
                style={{ fontSize: '0.8rem', padding: '5px 12px', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={14} color="#be123c" /> Clear Presented History
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', background: '#f8fafc' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Date</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Auto-Scheduled Presenter</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Assigned Senior Reviewer</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Cycle Order Index</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Auto-Notification Status</th>
                  </tr>
                </thead>
                <tbody>
                  {presenters.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{p.scheduled_date}</td>
                      <td style={{ padding: '10px 14px', color: '#1e293b' }}>{p.intern_name} ({p.department || 'Engineering'})</td>
                      <td style={{ padding: '10px 14px', color: '#4338ca', fontWeight: 700 }}>{p.reviewer_name || 'Senior Reviewer (Dev Lead)'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="kast-badge kast-badge-primary">Position #{p.order_index}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {p.status === 'presented' || p.notification_status === 'PRESENTED' ? (
                          <span className="kast-badge kast-badge-live">PRESENTED</span>
                        ) : p.notification_status === 'AUTO-REMINDED' ? (
                          <span className="kast-badge kast-badge-warning" title="18:00 Evening Auto-Reminder Dispatched to Next Presenter & Reviewer">
                            AUTO-REMINDED
                          </span>
                        ) : (
                          <span className="kast-badge kast-badge-primary" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                            SCHEDULED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: ALL INTERNS DIRECTORY & INTERACTIVE CARDS */}
      {/* ================================================================= */}
      {activeAdminTab === 'interns_cards' && (
        <div>
          
          {/* Search Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '0.9rem', color: '#475569' }}>
              Click any intern card to inspect full physical attendance logs, scan times, tools presented, attached PPTs/videos, and Senior Reviewer reports.
            </div>

            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input 
                type="text" 
                className="kast-input" 
                placeholder="Search intern name, email, department..." 
                style={{ paddingLeft: '36px', padding: '8px 12px 8px 36px', fontSize: '0.85rem' }}
                value={internSearch}
                onChange={(e) => setInternSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Intern Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredInterns.map((intern) => (
              <div 
                key={intern.id} 
                className="kast-card"
                onClick={() => handleOpenInternModal(intern.id)}
                style={{
                  padding: '20px',
                  cursor: 'pointer',
                  border: '1px solid #cbd5e1',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(99, 102, 241, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.1rem'
                    }}>
                      {intern.name.charAt(0)}
                    </div>
                    <span className="kast-badge kast-badge-primary">
                      Order #{intern.order_index}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 800, marginBottom: '2px' }}>
                    {intern.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: 600, marginBottom: '6px' }}>
                    {intern.department || 'Software Engineering'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '14px' }}>
                    {intern.email}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>
                    Inspect Details →
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                    Intern Profile
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: SENIOR EMPLOYEES & LEADERSHIP DIRECTORY & CARDS */}
      {/* ================================================================= */}
      {activeAdminTab === 'seniors_cards' && (
        <div>
          
          {/* Search Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '0.9rem', color: '#475569' }}>
              Inspect senior reviewers, evaluation reports, and reviewer rotation logs.
            </div>

            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input 
                type="text" 
                className="kast-input" 
                placeholder="Search senior reviewer name, email, dept..." 
                style={{ paddingLeft: '36px', padding: '8px 12px 8px 36px', fontSize: '0.85rem' }}
                value={seniorSearch}
                onChange={(e) => setSeniorSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Senior Employee Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredSeniors.map((senior) => {
              const roleMeta = getRoleBadge(senior.role);
              return (
                <div 
                  key={senior.id} 
                  className="kast-card"
                  onClick={() => handleOpenSeniorModal(senior.id)}
                  style={{
                    padding: '22px',
                    cursor: 'pointer',
                    border: '1px solid #cbd5e1',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(16, 185, 129, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '14px',
                        background: roleMeta.bg,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.2rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}>
                        {senior.name.charAt(0)}
                      </div>
                      <span className={`kast-badge ${roleMeta.badgeClass}`}>
                        {roleMeta.label}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 800, marginBottom: '4px' }}>
                      {senior.name}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700, marginBottom: '6px' }}>
                      {senior.department || 'Management & Engineering'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
                      {senior.email}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700 }}>
                      Inspect Reviews & Duty Logs →
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                      Senior Profile
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ================================================================= */}
      {/* INTERACTIVE INTERN CARD DETAIL OVERLAY MODAL */}
      {/* ================================================================= */}
      {selectedInternId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="kast-card" style={{
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#ffffff',
            borderRadius: '20px',
            position: 'relative',
            padding: '28px'
          }}>
            
            {/* Close Button */}
            <button 
              onClick={() => {
                setSelectedInternId(null);
                setInternDetailData(null);
              }}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={20} />
            </button>

            {loadingDetail || !internDetailData ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#0f172a' }}>
                <Sparkles size={28} className="pulse-animation" color="#4338ca" style={{ marginBottom: '10px' }} />
                <p>Loading intern records & history...</p>
              </div>
            ) : (
              <div>
                
                {/* Modal Header: Intern Bio Snapshot */}
                <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.25rem'
                    }}>
                      {internDetailData.intern.name.charAt(0)}
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>
                        {internDetailData.intern.name}
                      </h2>
                      <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                        {internDetailData.intern.email} | Dept: <strong style={{ color: '#0f172a' }}>{internDetailData.intern.department}</strong> | Rotation Index: <strong style={{ color: '#4338ca' }}>Position #{internDetailData.intern.order_index}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Summary Bar */}
                  <div className="kast-grid-5" style={{ gap: '10px', marginTop: '16px', textAlign: 'center' }}>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>MON-SAT WORKDAYS</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{internDetailData.attendanceSummary.totalWorkdays}</div>
                    </div>
                    <div style={{ background: '#d1fae5', padding: '10px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                      <div style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: 700 }}>PRESENT (ON TIME)</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#065f46' }}>{internDetailData.attendanceSummary.present}</div>
                    </div>
                    <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 700 }}>LATE CHECK-INS</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#92400e' }}>{internDetailData.attendanceSummary.late}</div>
                    </div>
                    <div style={{ background: '#ffe4e6', padding: '10px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                      <div style={{ fontSize: '0.7rem', color: '#9f1239', fontWeight: 700 }}>ABSENT COUNT</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#9f1239' }}>{internDetailData.attendanceSummary.absent}</div>
                    </div>
                    <div style={{ background: '#e0e7ff', padding: '10px', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                      <div style={{ fontSize: '0.7rem', color: '#3730a3', fontWeight: 700 }}>ATTENDANCE RATE</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3730a3' }}>{internDetailData.attendanceSummary.attendancePercentage}%</div>
                    </div>
                  </div>
                </div>

                {/* Sub-Tabs inside Modal */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <button
                    onClick={() => setModalTab('attendance')}
                    className={`kast-btn ${modalTab === 'attendance' ? 'kast-btn-primary' : 'kast-btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '6px 14px' }}
                  >
                    <Clock size={14} /> Attendance History ({internDetailData.attendanceHistory.length})
                  </button>

                  <button
                    onClick={() => setModalTab('tools_presented')}
                    className={`kast-btn ${modalTab === 'tools_presented' ? 'kast-btn-primary' : 'kast-btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '6px 14px', background: modalTab === 'tools_presented' ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : '' }}
                  >
                    <FileCode2 size={14} /> Tools Presented & Senior Reports ({internDetailData.toolsPresented.length})
                  </button>
                </div>

                {/* SUB-TAB A: ATTENDANCE HISTORY */}
                {modalTab === 'attendance' && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '10px' }}>
                      Physical session check-in timestamps for {internDetailData.intern.name} (Sundays excluded):
                    </div>

                    {internDetailData.attendanceHistory.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', background: '#f8fafc', borderRadius: '10px' }}>
                        No physical attendance scans recorded for this intern yet.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', maxHeight: '320px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', background: '#f8fafc' }}>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>Session Date</th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>Exact Scan Timestamp</th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>Method</th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {internDetailData.attendanceHistory.map((log) => (
                              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>{log.session_date}</td>
                                <td style={{ padding: '8px 12px', color: '#4338ca', fontWeight: 700, fontFamily: 'monospace' }}>
                                  {log.marked_at ? new Date(log.marked_at).toLocaleTimeString() : '09:02:15 AM'}
                                </td>
                                <td style={{ padding: '8px 12px', color: '#475569' }}>
                                  {log.method === 'qr' ? '📷 Phone QR Scan' : '✍️ Manual Override'}
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                  <span className={`kast-badge ${log.status === 'present' ? 'kast-badge-live' : log.status === 'late' ? 'kast-badge-warning' : 'kast-badge-danger'}`}>
                                    {log.status.toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-TAB B: TOOLS PRESENTED & SENIOR EMPLOYEE REPORTS */}
                {modalTab === 'tools_presented' && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
                      AI tools presented by {internDetailData.intern.name}. Click any tool card to view attached PPTs/videos and Senior Reviewer reports:
                    </div>

                    {internDetailData.toolsPresented.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', background: '#f8fafc', borderRadius: '10px' }}>
                        No tools presented by this intern yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '380px', overflowY: 'auto' }}>
                        {internDetailData.toolsPresented.map((tool) => {
                          const isExpanded = expandedToolId === tool.id;

                          return (
                            <div key={tool.id} style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '12px',
                              padding: '16px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase' }}>
                                    SESSION DATE: {tool.session_date}
                                  </div>
                                  <h4 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>{tool.tool_name}</h4>
                                </div>
                                <span className="kast-badge kast-badge-primary">{tool.category || 'AI Tool'}</span>
                              </div>

                              <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: '1.5', marginBottom: '12px' }}>
                                {tool.description}
                              </p>

                              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                <button 
                                  onClick={() => setExpandedToolId(isExpanded ? null : tool.id)}
                                  className="kast-btn kast-btn-secondary"
                                  style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                                >
                                  {isExpanded ? 'Hide Attached Details & Senior Report ▲' : 'View Attached Files & Senior Report ▼'}
                                </button>
                                <button 
                                  onClick={() => handleDeleteSubmission(tool.id)}
                                  className="kast-btn"
                                  style={{ fontSize: '0.78rem', padding: '4px 10px', background: '#ffe4e6', color: '#9f1239', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Trash2 size={13} /> Delete Submission
                                </button>
                              </div>

                              {/* EXPANDED DETAILS: ATTACHED DOCUMENTS & SENIOR REPORT */}
                              {isExpanded && (
                                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  
                                  {/* Attached Files & Documents */}
                                  <div style={{ background: '#eef2ff', padding: '12px', borderRadius: '10px', border: '1px solid #c7d2fe' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#3730a3', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <FileText size={14} /> Attached Files & Uploads ({tool.documents?.length || 0})
                                    </div>
                                    {!tool.documents || tool.documents.length === 0 ? (
                                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>No research files attached.</div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {tool.documents.map((doc) => (
                                          <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}>
                                            <span>📄 {doc.file_name}</span>
                                            <a href={doc.file_path} target="_blank" rel="noreferrer" className="kast-btn kast-btn-secondary" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                              <Download size={12} /> Open File
                                            </a>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Senior Employee Review Report */}
                                  {tool.reviewer_summary ? (
                                    <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <UserCheck size={14} /> Senior Reviewer Report (by {tool.reporter_name})
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <RatingStars rating={tool.presentation_quality_rating} readOnly />
                                          <span style={{ fontWeight: 800, color: '#065f46', fontSize: '0.85rem' }}>{tool.presentation_quality_rating}/5</span>
                                        </div>
                                      </div>
                                      <p style={{ fontSize: '0.88rem', color: '#0f172a', lineHeight: '1.5' }}>
                                        {tool.reviewer_summary}
                                      </p>
                                      {tool.flags && (
                                        <div style={{ fontSize: '0.78rem', color: '#9f1239', marginTop: '6px' }}>
                                          <strong>Escalation Flags:</strong> {tool.flags}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                                      No Senior Employee review report filed for this presentation yet.
                                    </div>
                                  )}

                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* INTERACTIVE SENIOR EMPLOYEE CARD DETAIL OVERLAY MODAL */}
      {/* ================================================================= */}
      {selectedSeniorId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="kast-card" style={{
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#ffffff',
            borderRadius: '20px',
            position: 'relative',
            padding: '28px'
          }}>
            <button 
              onClick={() => setSelectedSeniorId(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={20} />
            </button>

            {loadingSeniorDetail ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
                Loading Senior Employee details...
              </div>
            ) : seniorDetailData ? (
              <div>
                {/* Senior Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: getRoleBadge(seniorDetailData.senior.role).bg,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.6rem',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.15)'
                  }}>
                    {seniorDetailData.senior.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ fontSize: '1.5rem', color: '#0f172a', margin: 0 }}>
                        {seniorDetailData.senior.name}
                      </h2>
                      <span className={`kast-badge ${getRoleBadge(seniorDetailData.senior.role).badgeClass}`}>
                        {getRoleBadge(seniorDetailData.senior.role).label}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '4px' }}>
                      {seniorDetailData.senior.email} | Dept: <strong style={{ color: '#0f172a' }}>{seniorDetailData.senior.department || 'Management & Engineering'}</strong>
                    </div>
                  </div>
                </div>

                {/* Summary Stat Cards */}
                <div className="kast-grid-2" style={{ gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>Session Reports Filed</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>
                      {seniorDetailData.stats.totalReportsFiled}
                    </div>
                  </div>

                  <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.78rem', color: '#3730a3', fontWeight: 800, textTransform: 'uppercase' }}>Reviewer Rotations Assigned</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#4338ca', marginTop: '4px' }}>
                      {seniorDetailData.stats.totalRotationsAssigned}
                    </div>
                  </div>
                </div>

                {/* Section 1: Session Reports Filed */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color="#059669" /> Senior Reviewer Reports Filed ({seniorDetailData.reportsFiled.length})
                  </h3>

                  {seniorDetailData.reportsFiled.length === 0 ? (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', color: '#64748b', fontSize: '0.88rem' }}>
                      No session reports filed by this senior reviewer yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {seniorDetailData.reportsFiled.map((report) => (
                        <div key={report.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4338ca' }}>
                              📅 {report.session_date} — Presented by {report.presenter_name || 'Intern'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <RatingStars rating={report.presentation_quality_rating} readOnly />
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309' }}>{report.presentation_quality_rating}/5</span>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 700, marginBottom: '6px' }}>
                            Topic: <span style={{ color: '#059669' }}>{report.tool_presented || 'AI Tool'}</span>
                          </div>
                          <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: '1.5', margin: 0 }}>
                            {report.session_summary}
                          </p>
                          {report.flags && (
                            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#9f1239', background: '#fff1f2', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fecdd3' }}>
                              🚩 Flags: {report.flags}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 2: Reviewer Rotation Duty Schedule */}
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="#4338ca" /> Reviewer Rotation Duty Schedule
                  </h3>

                  {seniorDetailData.rotations.length === 0 ? (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', color: '#64748b', fontSize: '0.88rem' }}>
                      No reviewer rotation slots assigned yet.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Scheduled Date</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Session Status</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Confirmation Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {seniorDetailData.rotations.map((rot) => (
                            <tr key={rot.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>{rot.scheduled_date}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <span className={`kast-badge ${rot.session_status === 'completed' ? 'kast-badge-live' : 'kast-badge-warning'}`}>
                                  {rot.session_status || 'scheduled'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', color: rot.confirmed ? '#059669' : '#d97706', fontWeight: 600 }}>
                                {rot.confirmed ? `Confirmed at ${rot.confirmed_at || '08:30 AM'}` : 'Pending Confirmation'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}
