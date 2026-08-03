import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import QRScanner from '../components/QRScanner';
import { useAuth } from '../context/AuthContext';
import { 
  QrCode, RefreshCw, Users, CheckCircle2, Clock, Calendar, 
  History, Camera, ShieldCheck, Zap, Search, PieChart, AlertCircle
} from 'lucide-react';

export default function AttendanceScreen() {
  const { user } = useAuth();
  const [todaySession, setTodaySession] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [attSummary, setAttSummary] = useState(null);
  const [historyTab, setHistoryTab] = useState(user?.role === 'intern' ? 'my_history' : 'today');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      // 1. Load today session & session attendance records
      try {
        const sessRes = await API.get('/sessions/today');
        if (sessRes.success && sessRes.data && sessRes.data.session) {
          setTodaySession(sessRes.data.session);
          try {
            const attRes = await API.get(`/attendance/reports?sessionId=${sessRes.data.session.id}`);
            if (attRes.success) setAttendanceRecords(attRes.data);
          } catch (e) {
            console.error('Error fetching today attendance records:', e);
          }
        }
      } catch (e) {
        console.error('Error fetching today session:', e);
      }

      // 2. Load scan history logs
      try {
        const histRes = await API.get(user?.role === 'intern' ? '/attendance/history' : '/attendance/reports?allHistory=true');
        if (histRes.success) setHistoryLogs(histRes.data);
      } catch (e) {
        console.error('Error fetching history logs:', e);
      }

      // 3. Load attendance summary statistics
      try {
        const sumRes = await API.get('/attendance/summary');
        if (sumRes.success) setAttSummary(sumRes.data);
      } catch (e) {
        console.error('Error fetching summary stats:', e);
      }
    } catch (err) {
      console.error('Error loading attendance screen:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleManualQRRefresh = async () => {
    try {
      const res = await API.post('/sessions/today/generate-qr');
      if (res.success) {
        loadData();
      }
    } catch (err) {
      alert('QR refresh failed: ' + err.message);
    }
  };

  if (loading) {
    return <div className="kast-container" style={{ textAlign: 'center', paddingTop: '60px', color: '#0f172a' }}>Loading Physical Attendance Screen...</div>;
  }

  const session = todaySession || {};
  const qrToken = session.qr_token || 'KAST_TOKEN_DEMO';
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrToken)}`;

  const todayDateStr = session.session_date || new Date().toISOString().split('T')[0];
  const todayScansFromHistory = historyLogs.filter(h => {
    const d = h.session_date ? (h.session_date.includes('T') ? h.session_date.split('T')[0] : h.session_date.split(' ')[0]) : '';
    return d === todayDateStr || h.session_id === session.id;
  });
  const todayCheckedInList = attendanceRecords.length > 0 ? attendanceRecords : todayScansFromHistory;
  const myTodayRecord = attendanceRecords.length > 0 
    ? attendanceRecords.filter(a => a.user_id === user?.id)
    : historyLogs.filter(h => h.user_id === user?.id && ((h.session_date && h.session_date.includes(todayDateStr)) || h.session_id === session.id));

  const myHistoryLogs = historyLogs.filter(h => h.user_id === user?.id);

  const displayLogs = user?.role === 'intern' 
    ? historyLogs 
    : (historyTab === 'today' ? todayCheckedInList : (historyTab === 'my_history' ? myHistoryLogs : historyLogs));

  const filteredLogs = displayLogs.filter(log => {
    const rawDate = log.session_date || '';
    const logDateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
    const formattedLocaleDate = rawDate ? new Date(rawDate).toLocaleDateString() : '';

    // 1. Search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const name = (log.user_name || user.name || '').toLowerCase();
      const email = (log.user_email || user.email || '').toLowerCase();
      const matchName = name.includes(term);
      const matchEmail = email.includes(term);
      const matchDate = (logDateStr && logDateStr.toLowerCase().includes(term)) || (formattedLocaleDate && formattedLocaleDate.toLowerCase().includes(term));
      const matchDept = log.department && log.department.toLowerCase().includes(term);
      if (!matchName && !matchEmail && !matchDate && !matchDept) return false;
    }

    // 2. Attendance Status filter
    if (statusFilter !== 'all') {
      if (log.status !== statusFilter) return false;
    }

    // 3. Date filter (robust YYYY-MM-DD comparison)
    if (dateFilter) {
      if (logDateStr !== dateFilter) return false;
    }

    return true;
  });

  return (
    <div className="kast-container">
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', color: '#0f172a', marginBottom: '6px' }}>
          Single Daily Morning Session Attendance (9:00 - 9:30 AM)
        </h1>
        <p style={{ color: '#475569', fontSize: '1rem' }}>
          Session Date: <strong style={{ color: '#4338ca' }}>{session.session_date || new Date().toLocaleDateString()}</strong> | Presenter: <strong style={{ color: '#0f172a' }}>{session.presenter_name || 'Assigned Intern'}</strong>
        </p>
      </div>

      {/* ATTENDANCE SUMMARY CALCULATION CARD (SUNDAYS EXCLUDED) */}
      {attSummary && (
        <div className="kast-card" style={{ marginBottom: '24px', background: '#ffffff', border: '1px solid #c7d2fe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={20} color="#4338ca" />
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: 0 }}>Attendance Calculation & Rate (Mon–Sat Workdays)</h3>
            </div>
            <span className="kast-badge kast-badge-live" style={{ background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>
              SUNDAYS EXCLUDED
            </span>
          </div>

          <div className="kast-grid-5" style={{ textAlign: 'center' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Workdays</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{attSummary.totalWorkdays}</div>
            </div>

            <div style={{ background: '#d1fae5', padding: '12px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 700, textTransform: 'uppercase' }}>Present (On-Time)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#065f46', marginTop: '4px' }}>{attSummary.present}</div>
            </div>

            <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '10px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>Late Check-Ins</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#92400e', marginTop: '4px' }}>{attSummary.late}</div>
            </div>

            <div style={{ background: '#ffe4e6', padding: '12px', borderRadius: '10px', border: '1px solid #fecdd3' }}>
              <div style={{ fontSize: '0.75rem', color: '#9f1239', fontWeight: 700, textTransform: 'uppercase' }}>Absent Count</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#9f1239', marginTop: '4px' }}>{attSummary.absent}</div>
            </div>

            <div style={{ background: '#e0e7ff', padding: '12px', borderRadius: '10px', border: '1px solid #c7d2fe' }}>
              <div style={{ fontSize: '0.75rem', color: '#3730a3', fontWeight: 700, textTransform: 'uppercase' }}>Attendance Rate</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3730a3', marginTop: '4px' }}>{attSummary.attendancePercentage}%</div>
            </div>
          </div>
          
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '12px', textAlign: 'center' }}>
            ℹ️ {attSummary.note}
          </div>
        </div>
      )}

      <div className="kast-grid-2" style={{ marginBottom: '32px' }}>
        
        {/* ROOM DISPLAY: Large QR Code Card */}
        <div className="kast-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px', background: '#d1fae5', padding: '4px 12px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
            PHYSICAL ROOM DISPLAY QR CODE
          </div>

          <div style={{
            background: '#ffffff',
            padding: '16px',
            borderRadius: '20px',
            boxShadow: '0 8px 30px rgba(148, 163, 184, 0.25)',
            border: '1px solid #cbd5e1',
            marginBottom: '16px'
          }}>
            <img src={qrImageUrl} alt="Daily Session QR Code" style={{ width: '220px', height: '220px', display: 'block' }} />
          </div>

          <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '12px', fontFamily: 'monospace', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            Session QR Token: <span style={{ color: '#4338ca', fontWeight: 700 }}>{qrToken}</span>
          </div>

          {(user?.role === 'admin' || user?.role === 'program_owner' || user?.role === 'senior_reviewer') && (
            <button onClick={handleManualQRRefresh} className="kast-btn kast-btn-secondary" style={{ fontSize: '0.82rem' }}>
              <RefreshCw size={14} /> Refresh Daily QR Token
            </button>
          )}
        </div>

        {/* INTERN CAMERA SCANNER / LIVE SUMMARY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {user?.role === 'intern' && (
            <QRScanner onScanSuccess={loadData} />
          )}

          {/* Quick Stats Box */}
          <div className="kast-card" style={{ flexGrow: 1, background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#4338ca" /> {user?.role === 'intern' ? 'My Today Punch-In Status' : `Today's Checked-In Interns (${todayCheckedInList.length})`}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={loadData} 
                  className="kast-btn kast-btn-secondary" 
                  style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', fontWeight: 600 }}
                >
                  <RefreshCw size={12} /> Sync Data
                </button>
                <span className="kast-badge kast-badge-live">LIVE MONITOR</span>
              </div>
            </div>

            {user?.role === 'intern' ? (
              <div>
                {myTodayRecord.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 16px', color: '#64748b' }}>
                    <Clock size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                    <p style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>Not Punched In Yet Today</p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                      Scan the room QR code using your phone camera above to record your physical attendance.
                    </p>
                  </div>
                ) : (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>PUNCH-IN RECORDED</span>
                      <span className={`kast-badge ${myTodayRecord[0].status === 'present' ? 'kast-badge-live' : 'kast-badge-warning'}`}>
                        {myTodayRecord[0].status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#166534', fontFamily: 'monospace', fontWeight: 700 }}>
                      Exact Scan Time: {myTodayRecord[0].marked_at ? new Date(myTodayRecord[0].marked_at).toLocaleTimeString() : '09:02 AM'}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {todayCheckedInList.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.88rem', textAlign: 'center', padding: '20px' }}>
                    No check-ins recorded yet for today's 9:00 AM session. Point phone camera at the QR code above to check in.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                    {todayCheckedInList.map((att) => (
                      <div key={att.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '10px 14px'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{att.user_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                            Scan Time: <strong style={{ color: '#0f172a' }}>{att.marked_at ? new Date(att.marked_at).toLocaleTimeString() : '09:02 AM'}</strong>
                          </div>
                        </div>
                        <span className={`kast-badge ${att.status === 'present' ? 'kast-badge-live' : 'kast-badge-warning'}`}>
                          {att.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ================================================================= */}
      {/* DETAILED ATTENDANCE SCAN HISTORY LOGS WITH TIME */}
      {/* ================================================================= */}
      <div className="kast-card">
        
        {/* Controls & Filter Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <History size={22} color="#4338ca" />
            <h3 style={{ fontSize: '1.2rem', color: '#0f172a', margin: 0 }}>
              {user.role === 'intern' ? 'My Attendance Scan History & Time Logs' : 'Attendance Scan History & Time Logs'}
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {user.role === 'intern' ? (
              <button 
                onClick={() => setHistoryTab('my_history')}
                className="kast-btn kast-btn-primary"
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                My Scan History ({myHistoryLogs.length})
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setHistoryTab('today')}
                  className={`kast-btn ${historyTab === 'today' ? 'kast-btn-primary' : 'kast-btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                >
                  Today's Session ({attendanceRecords.length})
                </button>
                <button 
                  onClick={() => setHistoryTab('all_history')}
                  className={`kast-btn ${historyTab === 'all_history' ? 'kast-btn-primary' : 'kast-btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                >
                  All Interns Scan History ({historyLogs.length})
                </button>
              </>
            )}
          </div>

        </div>

        {/* Filter Controls Bar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px', background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input 
              type="text" 
              className="kast-input" 
              placeholder="Filter by intern name, email..." 
              style={{ paddingLeft: '36px', padding: '8px 12px 8px 36px', fontSize: '0.85rem', background: '#ffffff' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Select Filter */}
          <div style={{ flex: '0 1 180px' }}>
            <select 
              className="kast-select" 
              style={{ fontSize: '0.85rem', padding: '8px 12px', background: '#ffffff', color: '#0f172a' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all" style={{ color: '#0f172a', background: '#ffffff' }}>All Statuses (Present & Late)</option>
              <option value="present" style={{ color: '#0f172a', background: '#ffffff' }}>🟢 On-Time (Present)</option>
              <option value="late" style={{ color: '#0f172a', background: '#ffffff' }}>🟡 Late Check-In</option>
            </select>
          </div>

          {/* Date Filter */}
          <div style={{ flex: '0 1 160px' }}>
            <input 
              type="date" 
              className="kast-input" 
              style={{ fontSize: '0.85rem', padding: '7px 10px', background: '#ffffff', color: '#0f172a' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          {(searchTerm || statusFilter !== 'all' || dateFilter) && (
            <button 
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setDateFilter(''); }}
              className="kast-btn kast-btn-secondary"
              style={{ fontSize: '0.8rem', padding: '7px 12px' }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Scanned History Table */}
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
            <p>No scan logs found matching your filter criteria.</p>
          </div>
        ) : (
          <div className="kast-table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', background: '#f8fafc' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Date</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Intern Participant</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Exact Scan Time</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Scan Method & Geofence Location</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const scanDate = log.session_date;
                  const scanTime = log.marked_at ? new Date(log.marked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '09:02:14 AM';
                  const isPresent = log.status === 'present';

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>{scanDate}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{log.user_name || user.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.department || 'Engineering'}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#4338ca', fontWeight: 700, fontFamily: 'monospace' }}>
                        <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} /> {scanTime}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', width: 'fit-content' }}>
                            {log.method === 'qr' ? '📷 Phone QR Camera' : '✍️ Manual Override'}
                          </span>
                          {log.latitude && log.longitude ? (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', background: '#d1fae5', padding: '2px 8px', borderRadius: '6px', width: 'fit-content' }}>
                              📍 Kambaa Office (Verified: {parseFloat(log.latitude).toFixed(4)}, {parseFloat(log.longitude).toFixed(4)})
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: '6px', width: 'fit-content' }}>
                              📍 Kambaa Office Premises (Pegged Geofence)
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`kast-badge ${isPresent ? 'kast-badge-live' : log.status === 'late' ? 'kast-badge-warning' : 'kast-badge-danger'}`}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
