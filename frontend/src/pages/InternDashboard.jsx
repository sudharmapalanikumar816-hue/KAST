import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import RatingStars from '../components/RatingStars';
import { 
  Calendar, CheckCircle, Clock, FileCode2, ExternalLink, 
  QrCode, BookOpen, FileText, Download, X, User, Search, UserCheck, Sparkles,
  Edit3, Trash2, Eye
} from 'lucide-react';

export default function InternDashboard() {
  const { user, points } = useAuth();
  const navigate = useNavigate();
  const [todaySession, setTodaySession] = useState(null);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [activeTab, setActiveTab] = useState('my_tools'); // 'my_tools', 'all_tools', 'review_reports'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTool, setSelectedTool] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleDeleteSubmission = async (subId) => {
    if (!window.confirm('Are you sure you want to delete this tool submission?')) return;
    try {
      const res = await API.delete(`/submissions/${subId}`);
      if (res.success) {
        setMySubmissions(prev => prev.filter(s => s.id !== subId));
        setAllSubmissions(prev => prev.filter(s => s.id !== subId));
        if (selectedTool && selectedTool.id === subId) {
          setSelectedTool(null);
        }
      }
    } catch (err) {
      const msg = typeof err === 'string' ? err : (err?.message || err?.data?.message || err?.response?.data?.message || 'Failed to delete submission');
      alert('Error deleting submission: ' + msg);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [sessRes, mySubRes, allSubRes, repRes] = await Promise.all([
          API.get('/sessions/today'),
          API.get(`/submissions?internId=${user.id}`),
          API.get('/submissions?allInterns=true'),
          API.get('/session-reports/my-reports')
        ]);

        if (sessRes.success) setTodaySession(sessRes.data);
        if (mySubRes.success) setMySubmissions(mySubRes.data);
        if (allSubRes.success) setAllSubmissions(allSubRes.data);
        if (repRes.success) setMyReports(repRes.data);
      } catch (err) {
        console.error('Error loading intern dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user.id]);

  if (loading) {
    return <div className="kast-container" style={{ textAlign: 'center', paddingTop: '60px', color: '#0f172a' }}>Loading Dashboard...</div>;
  }

  const session = todaySession ? todaySession.session : null;
  const isMyTurnToday = session && session.presenter_id === user.id;

  const filterList = (list) => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(item => 
      (item.tool_name && item.tool_name.toLowerCase().includes(term)) ||
      (item.tool_presented && item.tool_presented.toLowerCase().includes(term)) ||
      (item.category && item.category.toLowerCase().includes(term)) ||
      (item.description && item.description.toLowerCase().includes(term)) ||
      (item.session_summary && item.session_summary.toLowerCase().includes(term))
    );
  };

  const myFiltered = filterList(mySubmissions);
  const allFiltered = filterList(allSubmissions);
  const reportsFiltered = filterList(myReports);

  return (
    <div className="kast-container">
      
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 700, marginBottom: '4px' }}>
          Welcome, <span className="gradient-text">{user.name}</span>
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Daily AI Knowledge Sharing Hub | 9:00 – 9:30 AM Session
        </p>
      </div>

      {/* Session Overview & Protocol Cards */}
      <div className="kast-grid-2" style={{ marginTop: '20px' }}>
        
        {/* Today's Session Status */}
        <div className="kast-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {session?.session_date ? `Morning Session (${session.session_date})` : "Upcoming Morning Session (9:00 - 9:30 AM)"}
            </span>
            <span className={`kast-badge ${session?.status === 'live' ? 'kast-badge-live' : 'kast-badge-primary'}`}>
              {session?.status?.toUpperCase() || 'SCHEDULED'}
            </span>
          </div>

          <h3 style={{ fontSize: '1.15rem', color: '#0f172a', marginBottom: '8px', fontWeight: 700 }}>
            {isMyTurnToday ? 'You are scheduled to present today' : `Presenter: ${session?.presenter_name || 'Assigned Intern'}`}
          </h3>

          <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '16px' }}>
            Senior Reviewer: <strong style={{ color: '#0f172a' }}>{session?.reviewer_name || 'Senior Lead'}</strong>
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/attendance-screen" className="kast-btn kast-btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
              <QrCode size={15} /> Scan Attendance
            </Link>
          </div>
        </div>

        {/* Session Protocol Guidelines */}
        <div className="kast-card" style={{ borderLeft: '4px solid #059669' }}>
          <h3 style={{ fontSize: '1.05rem', color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <Clock size={16} color="#059669" /> Session Protocol
          </h3>
          <ul style={{ color: '#475569', fontSize: '0.85rem', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.45' }}>
            <li><strong>Schedule:</strong> Daily 9:00 – 9:30 AM in-person session.</li>
            <li><strong>Submission:</strong> Submit presentation details & POC links prior to 8:00 AM.</li>
            <li><strong>Attendance:</strong> Complete QR scan on premises prior to 9:05 AM.</li>
          </ul>
        </div>

      </div>

      {/* Explorer Navigation & Search Tabs */}
      <div className="kast-card" style={{ marginTop: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('my_tools')}
              className={`kast-btn ${activeTab === 'my_tools' ? 'kast-btn-primary' : 'kast-btn-secondary'}`}
              style={{ fontSize: '0.85rem', padding: '7px 14px' }}
            >
              <FileCode2 size={15} /> My Presented Tools ({mySubmissions.length})
            </button>

            <button
              onClick={() => setActiveTab('all_tools')}
              className={`kast-btn ${activeTab === 'all_tools' ? 'kast-btn-primary' : 'kast-btn-secondary'}`}
              style={{ fontSize: '0.85rem', padding: '7px 14px' }}
            >
              <BookOpen size={15} /> Knowledge Repository ({allSubmissions.length})
            </button>

            <button
              onClick={() => setActiveTab('review_reports')}
              className={`kast-btn ${activeTab === 'review_reports' ? 'kast-btn-primary' : 'kast-btn-secondary'}`}
              style={{ fontSize: '0.85rem', padding: '7px 14px' }}
            >
              <UserCheck size={15} /> My Review Reports ({myReports.length})
            </button>
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: '240px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input 
              type="text" 
              className="kast-input" 
              placeholder="Search tools & topics..." 
              style={{ paddingLeft: '32px', padding: '6px 12px 6px 32px', fontSize: '0.82rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

        </div>

        {/* Tab 1: My Presented Tools */}
        {activeTab === 'my_tools' && (
          <div>
            {myFiltered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                <p style={{ fontSize: '0.9rem' }}>No tools submitted yet. Use the "Tool Submission" tab when scheduled to present.</p>
              </div>
            ) : (
              <div className="kast-table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', background: '#f8fafc' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Tool Name</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Category</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Session Date</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Documents</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myFiltered.map((sub) => (
                      <tr 
                        key={sub.id} 
                        onClick={() => setSelectedTool(sub)}
                        style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{sub.tool_name}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className="kast-badge kast-badge-primary">{sub.category || 'AI Tool'}</span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{sub.session_date}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`kast-badge ${sub.status === 'reviewed' ? 'kast-badge-live' : 'kast-badge-primary'}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: sub.documents?.length > 0 ? '#4338ca' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FileText size={14} /> {sub.documents?.length || 0} File(s)
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button 
                              type="button" 
                              className="kast-btn kast-btn-secondary"
                              style={{ fontSize: '0.78rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTool(sub);
                              }}
                              title="View Details"
                            >
                              <Eye size={13} /> View
                            </button>

                            <button 
                              type="button" 
                              className="kast-btn kast-btn-secondary"
                              style={{ fontSize: '0.78rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/submit?editId=${sub.id}`);
                              }}
                              title="Edit Submission"
                            >
                              <Edit3 size={13} /> Edit
                            </button>

                            <button 
                              type="button" 
                              className="kast-btn kast-btn-secondary"
                              style={{ fontSize: '0.78rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubmission(sub.id);
                              }}
                              title="Delete Submission"
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
            )}
          </div>
        )}

        {/* Tab 2: Knowledge Repository */}
        {activeTab === 'all_tools' && (
          <div>
            {allFiltered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                <p style={{ fontSize: '0.9rem' }}>No matching tools found in repository.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px', marginTop: '10px' }}>
                {allFiltered.map((sub) => (
                  <div 
                    key={sub.id} 
                    className="kast-card"
                    onClick={() => setSelectedTool(sub)}
                    style={{ 
                      padding: '14px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      border: '1px solid #cbd5e1'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <h4 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>{sub.tool_name}</h4>
                        <span className="kast-badge kast-badge-primary" style={{ fontSize: '0.72rem' }}>{sub.category || 'AI Tool'}</span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '8px' }}>
                        Presenter: <strong style={{ color: '#0f172a' }}>{sub.intern_name}</strong> | {sub.session_date}
                      </div>

                      <p style={{ fontSize: '0.82rem', color: '#334155', lineHeight: '1.4', marginBottom: '10px' }}>
                        {sub.description ? (sub.description.length > 100 ? sub.description.substring(0, 100) + '...' : sub.description) : 'Research presentation.'}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={13} /> {sub.documents?.length || 0} File(s)
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 600 }}>
                        View Details →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: My Review Reports */}
        {activeTab === 'review_reports' && (
          <div>
            {reportsFiltered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#64748b', background: '#f8fafc', borderRadius: '10px' }}>
                <UserCheck size={28} color="#059669" style={{ marginBottom: '6px' }} />
                <p style={{ fontSize: '0.9rem' }}>No review reports recorded yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {reportsFiltered.map((rep) => (
                  <div key={rep.id} style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca' }}>
                          SESSION DATE: {rep.session_date}
                        </div>
                        <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginTop: '2px' }}>
                          Topic: {rep.tool_presented}
                        </h3>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                          Senior Reviewer: <strong style={{ color: '#0f172a' }}>{rep.reporter_name}</strong>
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Rating:</span>
                        <RatingStars rating={rep.presentation_quality_rating} readOnly />
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{rep.presentation_quality_rating}/5</span>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Reviewer Summary:
                      </div>
                      <p style={{ color: '#1e293b', fontSize: '0.88rem', lineHeight: '1.5' }}>
                        {rep.session_summary}
                      </p>
                    </div>

                    <div className="kast-grid-2" style={{ fontSize: '0.82rem' }}>
                      <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bbf7d0', color: '#166534' }}>
                        <strong>Attendance Observation:</strong> {rep.attendance_observation || 'On time.'}
                      </div>
                      <div style={{ background: '#fff1f2', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fecdd3', color: '#9f1239' }}>
                        <strong>Logged Flags:</strong> {rep.flags || 'None.'}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Tool Detail Overlay Modal */}
      {selectedTool && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="kast-card kast-modal-content" style={{
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#ffffff',
            borderRadius: '16px',
            position: 'relative',
            padding: '24px'
          }}>
            
            <button 
              onClick={() => setSelectedTool(null)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ marginBottom: '16px', paddingRight: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="kast-badge kast-badge-primary">{selectedTool.category || 'AI Tool'}</span>
                <span className="kast-badge kast-badge-live">{selectedTool.status?.toUpperCase() || 'SUBMITTED'}</span>
              </div>

              <h2 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: 700 }}>{selectedTool.tool_name}</h2>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                Presenter: <strong style={{ color: '#0f172a' }}>{selectedTool.intern_name}</strong> | Session Date: <strong style={{ color: '#0f172a' }}>{selectedTool.session_date}</strong>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                Research Summary:
              </h4>
              <p style={{ color: '#1e293b', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {selectedTool.description || 'No description provided.'}
              </p>
            </div>

            <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={15} /> Attached Research Files ({selectedTool.documents?.length || 0})
              </h4>

              {!selectedTool.documents || selectedTool.documents.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>No research files attached.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedTool.documents.map((doc) => (
                    <div key={doc.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '8px 12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} color="#4338ca" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{doc.file_name}</span>
                      </div>

                      <a 
                        href={doc.file_path} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="kast-btn kast-btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                      >
                        <Download size={13} /> View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedTool.use_cases && selectedTool.use_cases.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Kambaa Business Use Cases
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedTool.use_cases.map((uc, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                        {uc.title || `Use Case #${idx + 1}`}
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#334155' }}>{uc.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              {selectedTool.poc_repo_url && (
                <a href={selectedTool.poc_repo_url} target="_blank" rel="noreferrer" className="kast-btn kast-btn-primary" style={{ fontSize: '0.82rem' }}>
                  <FileCode2 size={15} /> Code Repository
                </a>
              )}
              {selectedTool.demo_url && (
                <a href={selectedTool.demo_url} target="_blank" rel="noreferrer" className="kast-btn kast-btn-secondary" style={{ fontSize: '0.82rem' }}>
                  <ExternalLink size={15} /> Live Demo
                </a>
              )}

              {(selectedTool.intern_id === user.id || selectedTool.user_id === user.id) && (
                <>
                  <button 
                    onClick={() => {
                      const editId = selectedTool.id;
                      setSelectedTool(null);
                      navigate(`/submit?editId=${editId}`);
                    }} 
                    className="kast-btn kast-btn-secondary" 
                    style={{ fontSize: '0.82rem', background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe' }}
                  >
                    <Edit3 size={15} /> Edit Submission
                  </button>

                  <button 
                    onClick={() => handleDeleteSubmission(selectedTool.id)} 
                    className="kast-btn kast-btn-secondary" 
                    style={{ fontSize: '0.82rem', background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3' }}
                  >
                    <Trash2 size={15} /> Delete Submission
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
