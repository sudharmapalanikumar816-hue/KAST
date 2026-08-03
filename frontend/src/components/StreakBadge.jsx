import React from 'react';
import { Flame } from 'lucide-react';

export default function StreakBadge({ streakDays = 0 }) {
  let badgeTitle = 'Active Contributor';
  let badgeColor = '#4338ca';
  let badgeBg = '#e0e7ff';

  if (streakDays >= 10) {
    badgeTitle = 'Innovation Leader';
    badgeColor = '#92400e';
    badgeBg = '#fef3c7';
  } else if (streakDays >= 5) {
    badgeTitle = 'Consistent Presenter';
    badgeColor = '#065f46';
    badgeBg = '#d1fae5';
  }

  return (
    <div className="kast-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
        }}>
          <Flame size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{streakDays} Day Attendance Streak</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: badgeColor, background: badgeBg, padding: '3px 10px', borderRadius: '12px' }}>
              {badgeTitle}
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>Daily session participation & presentation record</p>
        </div>
      </div>
    </div>
  );
}
