import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import confetti from 'canvas-confetti';
import { Trophy, Award, Flame, Download, Zap, Crown, Star } from 'lucide-react';

export default function Leaderboard() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRankings() {
      try {
        const res = await API.get('/leaderboard');
        if (res.success) setRankings(res.data);
      } catch (err) {
        console.error('Error loading leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRankings();
  }, []);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleDownloadCertificate = () => {
    triggerConfetti();
    const token = localStorage.getItem('kast_token');
    window.open(`/api/leaderboard/certificate?token=${token}`, '_blank');
  };

  if (loading) {
    return <div className="kast-container" style={{ textAlign: 'center', paddingTop: '60px', color: '#0f172a' }}>Loading Leaderboard Rankings...</div>;
  }

  return (
    <div className="kast-container">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={26} color="#d97706" /> Innovation Rankings & Badges
          </h1>
          <p style={{ color: '#475569', fontSize: '0.95rem' }}>
            Participant rankings based on daily physical session attendance, research presentations, and attendance streaks.
          </p>
        </div>

        <button 
          onClick={handleDownloadCertificate} 
          className="kast-btn kast-btn-primary"
          style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', boxShadow: '0 4px 15px rgba(217, 119, 6, 0.35)' }}
        >
          <Download size={16} /> Download PDF Certificate
        </button>
      </div>

      {/* Podium Top 3 Cards */}
      <div className="kast-grid-3" style={{ marginBottom: '32px' }}>
        {rankings.slice(0, 3).map((user, idx) => (
          <div key={user.id} className="kast-card" style={{
            textAlign: 'center',
            border: idx === 0 ? '2px solid #f59e0b' : idx === 1 ? '1px solid #94a3b8' : '1px solid #d97706',
            background: idx === 0 ? '#fef3c7' : '#ffffff'
          }}>
            <div style={{ margin: '0 auto 12px auto', width: '48px', height: '48px', borderRadius: '50%', background: idx === 0 ? '#fde68a' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {idx === 0 ? <Crown size={28} color="#d97706" /> : <Award size={24} color={idx === 1 ? '#64748b' : '#b45309'} />}
            </div>

            <span className="kast-badge" style={{ background: '#ffffff', color: '#0f172a', marginBottom: '8px', border: '1px solid #cbd5e1' }}>
              Rank #{idx + 1}
            </span>

            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '4px' }}>{user.name}</h3>
            <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '12px' }}>{user.department || 'Engineering'}</p>

            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#d97706' }}>
              <Flame size={16} style={{ display: 'inline', marginRight: '4px' }} /> {user.streak} Day Streak
            </div>
          </div>
        ))}
      </div>

      {/* Rankings Table */}
      <div className="kast-card">
        <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '16px' }}>All Participant Rankings</h3>
        
        <div className="kast-table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', background: '#f8fafc' }}>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Rank</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Participant</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Role</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>Attendance Streak</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>AI Tools Presented</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: u.rank <= 3 ? '#d97706' : '#64748b' }}>
                    #{u.rank}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>{u.name}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className="kast-badge kast-badge-primary">{u.role.replace('_', ' ')}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#d97706', fontWeight: 700 }}>
                    <Flame size={14} style={{ display: 'inline', marginRight: '4px' }} /> {u.streak} Days
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#4338ca' }}>{u.total_presentations} Tools</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
