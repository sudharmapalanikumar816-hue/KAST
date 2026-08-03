import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';
import RatingStars from '../components/RatingStars';
import { 
  Sparkles, UserCheck, AlertCircle, CheckCircle2, FileText, 
  Send, Calendar, Tag, History, Search, User, Clock, LayoutDashboard, MailCheck, ExternalLink
} from 'lucide-react';

export default function SeniorReviewDashboard({ initialTab = 'history' }) {
  const [todaySession, setTodaySession] = useState(null);
  const [presenterSubmission, setPresenterSubmission] = useState(null);
  const [myHistoryReports, setMyHistoryReports] = useState([]);
  const [myInvitations, setMyInvitations] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab); // 'file_report' or 'history'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  // Form state
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [toolPresented, setToolPresented] = useState('');
  const [sessionSummary, setSessionSummary] = useState('');
  const [qualityRating, setQualityRating] = useState(5);
  const [attendanceObs, setAttendanceObs] = useState('');
  const [flags, setFlags] = useState('None. Session ran on time.');
  const [reporterNotes, setReporterNotes] = useState('');

  // AI draft state
  const [generatingDraft, setGeneratingDraft] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadData = async () => {
    try {
      const [sessRes, histRes, invRes] = await Promise.all([
        API.get('/sessions/today'),
        API.get('/session-reports/reviewer-history'),
        API.get('/session-reports/reviewer-invitations')
      ]);

      if (sessRes.success && sessRes.data.session) {
        const sess = sessRes.data.session;
        setTodaySession(sess);
        setSessionDate(sess.session_date || new Date().toISOString().split('T')[0]);
        setToolPresented(sessRes.data.submission ? sessRes.data.submission.tool_name : '');
        setPresenterSubmission(sessRes.data.submission);
        
        if (sessRes.data.attendanceStats) {
          const { present_count, late_count, absent_count } = sessRes.data.attendanceStats;
          setAttendanceObs(`${present_count || 0} Present, ${late_count || 0} Late, ${absent_count || 0} Absent.`);
        }
      }

      if (histRes.success) setMyHistoryReports(histRes.data);
      if (invRes.success) setMyInvitations(invRes.data);
    } catch (err) {
      console.error('Error loading senior review data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateAIDraft = async () => {
    if (!todaySession) return;
    setGeneratingDraft(true);
    setError(null);

    try {
      const res = await API.get(`/session-reports/${todaySession.id}/ai-draft?notes=${encodeURIComponent(reporterNotes)}`);
      if (res.success && res.data.aiDraftSummary) {
        setSessionSummary(res.data.aiDraftSummary);
      }
    } catch (err) {
      setError('Failed to generate AI draft summary: ' + err.message);
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!todaySession) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        sessionId: todaySession.id,
        toolPresented,
        presenterId: todaySession.presenter_id,
        sessionSummary,
        presentationQualityRating: qualityRating,
        attendanceObservation: attendanceObs,
        flags,
        aiDraftSummary: sessionSummary
      };

      const res = await API.post('/session-reports', payload);
      if (res.success) {
        setSuccessMsg(`Session Report for '${toolPresented}' (${sessionDate}) filed successfully! Admin feed has been updated.`);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit session report');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="kast-container" style={{ textAlign: 'center', paddingTop: '60px', color: '#0f172a' }}>Loading Senior Reviewer Dashboard...</div>;
  }

  const filteredHistory = myHistoryReports.filter(rep => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (rep.tool_presented && rep.tool_presented.toLowerCase().includes(term)) ||
      (rep.presenter_name && rep.presenter_name.toLowerCase().includes(term)) ||
      (rep.session_date && rep.session_date.toLowerCase().includes(term)) ||
      (rep.session_summary && rep.session_summary.toLowerCase().includes(term))
    );
  });

  return (
    <div className="kast-container" style={{ maxWidth: '950px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          {activeTab === 'history' ? <LayoutDashboard size={26} color="#059669" /> : <UserCheck size={26} color="#059669" />}
          <h1 style={{ fontSize: '1.8rem', color: '#0f172a' }}>
            {activeTab === 'history' ? 'Senior Reviewer Dashboard' : 'File Today\'s Session Report'}
          </h1>
        </div>
        <p style={{ color: '#475569', fontSize: '0.95rem' }}>
          {activeTab === 'history' 
            ? 'Overview of days invited to review, upcoming sessions, and completed session evaluation reports.'
            : 'Observe today\'s 9:00 - 9:30 AM physical session and file one summary report for Admin.'}
        </p>
      </div>

      {/* DASHBOARD PAGE (when on /senior-dashboard) */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SECTION 1: DAYS INVITED TO REVIEW (Duty Invitations Schedule) */}
          <div className="kast-card" style={{ borderLeft: '4px solid #4338ca' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MailCheck size={22} color="#4338ca" />
                <h3 style={{ fontSize: '1.2rem', color: '#0f172a', margin: 0 }}>Days Invited to Review (Session Duties)</h3>
              </div>
              <span className="kast-badge kast-badge-primary">
                {myInvitations.length} Total Invitation(s)
              </span>
            </div>

            {myInvitations.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.88rem', textAlign: 'center', padding: '20px' }}>
                No session review invitations logged yet.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', background: '#f8fafc' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Invited Session Date</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Intern Presenter</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Research Topic</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Review Status</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myInvitations.map((inv) => {
                      const isFiled = !!inv.report_id;
                      return (
                        <tr key={inv.session_id} style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{inv.session_date}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{inv.presenter_name || 'Assigned Intern'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{inv.presenter_email}</div>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#4338ca', fontWeight: 600 }}>
                            {inv.tool_name || inv.tool_presented || 'AI Research Session'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className={`kast-badge ${isFiled ? 'kast-badge-live' : 'kast-badge-warning'}`}>
                              {isFiled ? 'Report Filed ✅' : 'Pending Review ⏳'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {!isFiled ? (
                              <Link to="/senior-review" className="kast-btn kast-btn-primary" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                                File Report →
                              </Link>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
                                Completed ({inv.presentation_quality_rating}/5 ⭐)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 2: DAYS REVIEWED & REPORTED ON (Reviewed Session History) */}
          <div className="kast-card">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={22} color="#059669" />
                <h3 style={{ fontSize: '1.2rem', color: '#0f172a', margin: 0 }}>Days Reviewed & Reported On ({myHistoryReports.length})</h3>
              </div>

              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input 
                  type="text" 
                  className="kast-input" 
                  placeholder="Search by intern, topic, date..." 
                  style={{ paddingLeft: '36px', padding: '8px 12px 8px 36px', fontSize: '0.85rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
                <UserCheck size={32} color="#059669" style={{ marginBottom: '8px' }} />
                <p>No reviewed session reports filed by you yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {filteredHistory.map((rep) => (
                  <div key={rep.id} style={{
                    background: '#ffffff',
                    border: '2px solid #a7f3d0',
                    borderRadius: '14px',
                    padding: '20px',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.08)'
                  }}>
                    
                    {/* Card Header: Session Date, Topic, Intern Presenter Name */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px' }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          📅 REVIEWED DATE: {rep.session_date}
                        </div>
                        <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginTop: '2px' }}>
                          AI Topic: <span className="gradient-text">{rep.tool_presented}</span>
                        </h3>
                        <div style={{ fontSize: '0.88rem', color: '#334155', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} color="#059669" /> Intern Presenter Evaluated: <strong style={{ color: '#0f172a' }}>{rep.presenter_name}</strong> ({rep.presenter_email})
                        </div>
                      </div>

                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '8px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065f46' }}>Rating Awarded:</span>
                        <RatingStars rating={rep.presentation_quality_rating} readOnly />
                        <span style={{ fontWeight: 800, color: '#065f46' }}>{rep.presentation_quality_rating}/5</span>
                      </div>
                    </div>

                    {/* Session Summary Body */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '10px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#3730a3', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Reported Session Summary:
                      </div>
                      <p style={{ color: '#1e293b', fontSize: '0.92rem', lineHeight: '1.6' }}>
                        {rep.session_summary}
                      </p>
                    </div>

                    {/* Attendance & Flags */}
                    <div className="kast-grid-2" style={{ fontSize: '0.85rem' }}>
                      <div style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: '8px', border: '1px solid #a7f3d0', color: '#065f46' }}>
                        <strong>Attendance Observation:</strong> {rep.attendance_observation || 'On-time physical session.'}
                      </div>
                      <div style={{ background: '#fff1f2', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fecdd3', color: '#9f1239' }}>
                        <strong>Escalation Flags:</strong> {rep.flags || 'None.'}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '12px', textAlign: 'right' }}>
                      Report Filed at: {new Date(rep.submitted_at).toLocaleString()}
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      )}

      {/* FILE TODAY'S SESSION REPORT PAGE (when on /senior-review) */}
      {activeTab === 'file_report' && (
        <div>
          {/* Today Presenter & Session Details Overview Box */}
          <div className="kast-card" style={{ marginBottom: '24px', borderLeft: '4px solid #10b981', background: '#ecfdf5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#065f46', margin: 0 }}>
                Today's Session Presentation Info
              </h3>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#065f46', background: '#d1fae5', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} /> Session Date: {sessionDate}
              </span>
            </div>
            
            <div className="kast-grid-2" style={{ fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#475569' }}>Presenter: </span>
                <strong style={{ color: '#0f172a' }}>{todaySession?.presenter_name || 'Assigned Intern'}</strong>
              </div>
              <div>
                <span style={{ color: '#475569' }}>Presentation Topic: </span>
                <strong style={{ color: '#0f172a' }}>{presenterSubmission?.tool_name || toolPresented}</strong>
              </div>
              <div>
                <span style={{ color: '#475569' }}>POC Repo: </span>
                {presenterSubmission?.poc_repo_url ? (
                  <a href={presenterSubmission.poc_repo_url} target="_blank" rel="noreferrer" style={{ color: '#4338ca', fontWeight: 600 }}>
                    {presenterSubmission.poc_repo_url}
                  </a>
                ) : 'None attached'}
              </div>
              <div>
                <span style={{ color: '#475569' }}>Submission Status: </span>
                <span className="kast-badge kast-badge-live">{presenterSubmission?.status || 'Submitted'}</span>
              </div>
            </div>
          </div>

          {/* Main Report Form */}
          <div className="kast-card">
            <h2 style={{ fontSize: '1.3rem', color: '#0f172a', marginBottom: '20px' }}>File End-of-Session Report</h2>

            {error && (
              <div style={{ background: '#ffe4e6', border: '1px solid #fecdd3', color: '#9f1239', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            {successMsg && (
              <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} /> {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Session Date & Presentation Topic Fields */}
              <div className="kast-grid-2">
                <div>
                  <label className="kast-label">Session Date *</label>
                  <input 
                    type="date" 
                    className="kast-input" 
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="kast-label">Presentation Topic / Tool Name *</label>
                  <input 
                    type="text" 
                    className="kast-input" 
                    placeholder="e.g. V0 by Vercel, Claude Artifacts..."
                    value={toolPresented}
                    onChange={(e) => setToolPresented(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Quick Notes & AI Draft Button Row */}
              <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <label className="kast-label" style={{ marginBottom: 0, color: '#3730a3' }}>Quick Observations / Notes for AI Draft:</label>
                  <button 
                    type="button" 
                    onClick={handleGenerateAIDraft} 
                    className="kast-btn kast-btn-ai"
                    style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                    disabled={generatingDraft}
                  >
                    <Sparkles size={16} /> {generatingDraft ? 'Drafting...' : 'AI Draft Summary'}
                  </button>
                </div>
                <input 
                  type="text" 
                  className="kast-input" 
                  placeholder="e.g. Great live demo, answered QA well, 1 intern late..."
                  value={reporterNotes}
                  onChange={(e) => setReporterNotes(e.target.value)}
                />
              </div>

              {/* Final Session Summary */}
              <div>
                <label className="kast-label">Session Summary (Read by Admin right after 9:30 AM) *</label>
                <textarea 
                  className="kast-textarea" 
                  rows={4} 
                  placeholder="Polished summary covering what was presented, demo execution, and relevance..."
                  value={sessionSummary}
                  onChange={(e) => setSessionSummary(e.target.value)}
                  required
                />
              </div>

              {/* Rating & Attendance Observation */}
              <div className="kast-grid-2">
                <div>
                  <label className="kast-label">Presentation Quality Rating (1 to 5 Stars)</label>
                  <div style={{ padding: '8px 0' }}>
                    <RatingStars rating={qualityRating} onChange={setQualityRating} />
                  </div>
                </div>

                <div>
                  <label className="kast-label">Attendance Observations</label>
                  <input 
                    type="text" 
                    className="kast-input" 
                    placeholder="e.g. 2 late, 1 absent..."
                    value={attendanceObs}
                    onChange={(e) => setAttendanceObs(e.target.value)}
                  />
                </div>
              </div>

              {/* Flags logging */}
              <div>
                <label className="kast-label">Flags / Admin Escalation Notes</label>
                <input 
                  type="text" 
                  className="kast-input" 
                  placeholder="Log any tech issue, no-show, low engagement, or duplicate concerns..."
                  value={flags}
                  onChange={(e) => setFlags(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="kast-btn kast-btn-primary" 
                style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
                disabled={submitting}
              >
                <Send size={18} /> {submitting ? 'Submitting Report...' : `File Session Report for ${toolPresented || 'Topic'} (${sessionDate})`}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
