const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Kambaa Office Geofence Target Location (Coimbatore)
const KAMBAA_LAT = 11.023933;
const KAMBAA_LNG = 77.006895;
const MAX_ALLOWED_DISTANCE_METERS = 300; // 300 meters tolerance radius for physical attendance room

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// GET /api/attendance/summary (Calculates Present / Late / Absent statistics excluding Sundays)
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || (req.user.role === 'intern' ? req.user.id : null);

    // Get all past non-Sunday session dates up to today
    const [sessions] = await pool.query(
      `SELECT id, session_date, start_time 
       FROM sessions 
       WHERE DAYOFWEEK(session_date) != 1 AND session_date <= CURDATE()
       ORDER BY session_date DESC`
    );

    const totalWorkdays = sessions.length || 1;

    let attRecords = [];
    if (targetUserId) {
      const [rows] = await pool.query(
        `SELECT a.*, s.session_date 
         FROM attendance a
         JOIN sessions s ON a.session_id = s.id
         WHERE a.user_id = ? AND DAYOFWEEK(s.session_date) != 1`,
        [targetUserId]
      );
      attRecords = rows;
    } else {
      // Overall program attendance statistics for Admin / Senior Reviewers
      const [rows] = await pool.query(
        `SELECT a.*, s.session_date 
         FROM attendance a
         JOIN sessions s ON a.session_id = s.id
         WHERE DAYOFWEEK(s.session_date) != 1`
      );
      attRecords = rows;
    }

    const presentCount = attRecords.filter(r => r.status === 'present').length;
    const lateCount = attRecords.filter(r => r.status === 'late').length;
    const recordedAbsents = attRecords.filter(r => r.status === 'absent').length;

    let totalAbsents = recordedAbsents;
    if (targetUserId) {
      const recordedSessionIds = new Set(attRecords.map(r => r.session_id));
      const unrecordedWorkdays = sessions.filter(s => !recordedSessionIds.has(s.id)).length;
      totalAbsents += unrecordedWorkdays;
    }

    const presentOrLate = presentCount + lateCount;
    const denominator = targetUserId ? totalWorkdays : (attRecords.length || 1);
    const attendancePercentage = Math.min(100, Math.round((presentOrLate / denominator) * 100));

    res.json({
      success: true,
      data: {
        totalWorkdays,
        present: presentCount,
        late: lateCount,
        absent: totalAbsents,
        attendancePercentage,
        note: targetUserId ? 'Calculated based on mandatory workday sessions' : 'Overall program attendance statistics across all active interns'
      }
    });
  } catch (err) {
    console.error('Error fetching attendance summary:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/reports (Returns attendance reports; interns only see their own punch-in records)
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const { sessionId, allHistory } = req.query;
    let sql = `
      SELECT a.*, s.session_date, s.start_time, u.name as user_name, u.email as user_email, u.department
      FROM attendance a
      JOIN sessions s ON a.session_id = s.id
      JOIN users u ON a.user_id = u.id
    `;
    const params = [];
    const conditions = [];

    // Interns can ONLY view their own punch-in details
    if (req.user.role === 'intern') {
      conditions.push(`a.user_id = ?`);
      params.push(req.user.id);
    }

    if (sessionId) {
      conditions.push(`a.session_id = ?`);
      params.push(sessionId);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY s.session_date DESC, a.marked_at DESC`;

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching attendance reports:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/history (Returns scanned history with scan timestamps)
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query;
    let sql = `
      SELECT a.*, s.session_date, s.start_time, u.name as user_name, u.email as user_email, u.department, m.name as marked_by_name
      FROM attendance a
      JOIN sessions s ON a.session_id = s.id
      JOIN users u ON a.user_id = u.id
      LEFT JOIN users m ON a.marked_by = m.id
    `;
    const params = [];
    const conditions = [];

    // Interns can ONLY view their own punch-in details
    if (req.user.role === 'intern') {
      conditions.push(`a.user_id = ?`);
      params.push(req.user.id);
    } else if (userId) {
      conditions.push(`a.user_id = ?`);
      params.push(userId);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY s.session_date DESC, a.marked_at DESC`;

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching attendance history:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/scan (Process QR Attendance Scan with Geofencing Verification)
router.post('/scan', authenticateToken, async (req, res) => {
  try {
    const { qrToken, latitude, longitude } = req.body;
    const today = getTodayString();

    let distanceMeters = null;
    let isGeofencedValid = true;

    // STRICT GEOFENCE VERIFICATION: Geolocation is mandatory for recording attendance
    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
      return res.status(403).json({
        success: false,
        message: '📍 Geofence Check Failed: Device GPS location is required to record attendance. Please enable location permissions in your browser and try again.'
      });
    }

    distanceMeters = calculateHaversineDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      KAMBAA_LAT,
      KAMBAA_LNG
    );

    if (distanceMeters > MAX_ALLOWED_DISTANCE_METERS) {
      return res.status(403).json({
        success: false,
        message: `📍 Physical Geofence Verification Failed: You are ${distanceMeters}m away from Kambaa Office (Peelamedu, Coimbatore). Attendance can only be recorded physically on premises (within ${MAX_ALLOWED_DISTANCE_METERS}m).`
      });
    }

    const [sessions] = await pool.query(
      'SELECT id, session_date, start_time FROM sessions WHERE session_date = ?',
      [today]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'No AI Session scheduled for today.' });
    }

    const session = sessions[0];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let status = 'present';
    if (currentHour > 9 || (currentHour === 9 && currentMinute > 5)) {
      status = 'late';
    }

    const [existing] = await pool.query(
      'SELECT id, status, marked_at FROM attendance WHERE session_id = ? AND user_id = ?',
      [session.id, req.user.id]
    );

    if (existing.length > 0) {
      return res.json({
        success: true,
        alreadyMarked: true,
        message: `Attendance already marked as '${existing[0].status}' for today's session at ${existing[0].marked_at}.`,
        data: existing[0]
      });
    }

    const [result] = await pool.query(
      `INSERT INTO attendance (session_id, user_id, status, method, marked_by, marked_at, latitude, longitude)
       VALUES (?, ?, ?, 'qr', ?, NOW(), ?, ?)`,
      [session.id, req.user.id, status, req.user.id, latitude || null, longitude || null]
    );

    // If marked LATE, check if this intern has already been scheduled/presented in the current circle
    if (status === 'late' && req.user.role === 'intern') {
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Fetch active interns count to check circle boundaries
        const [activeInterns] = await pool.query("SELECT id FROM users WHERE role = 'intern' AND is_active = TRUE");
        const totalInterns = activeInterns.length || 14;

        const [allRotations] = await pool.query(
          'SELECT id, intern_id, scheduled_date FROM presenter_rotation ORDER BY scheduled_date ASC, id ASC'
        );

        const totalPast = allRotations.length;
        const currentCircle = Math.floor(totalPast / totalInterns);
        const circleStartIndex = currentCircle * totalInterns;

        const scheduledInCircle = new Set(
          allRotations.slice(circleStartIndex, totalPast).map(r => r.intern_id)
        );

        // Only assign this late intern if they have NOT already scheduled/presented in the current circle
        if (!scheduledInCircle.has(req.user.id)) {
          const [upcomingPR] = await pool.query(
            'SELECT id FROM presenter_rotation WHERE scheduled_date = ? AND status = "upcoming"',
            [tomorrowStr]
          );

          if (upcomingPR.length > 0) {
            await pool.query(
              'UPDATE presenter_rotation SET intern_id = ? WHERE id = ?',
              [req.user.id, upcomingPR[0].id]
            );
          } else {
            await pool.query(
              'INSERT INTO presenter_rotation (intern_id, scheduled_date, order_index, status) VALUES (?, ?, ?, "upcoming")',
              [req.user.id, tomorrowStr, totalPast + 1]
            );
          }
        }
      } catch (rotErr) {
        console.error('Error updating presenter rotation for late comer:', rotErr.message);
      }
    }

    res.json({
      success: true,
      message: status === 'present' 
        ? `🟢 Attendance marked ON-TIME (Present) at ${now.toLocaleTimeString()}!` 
        : `🟡 Attendance marked LATE at ${now.toLocaleTimeString()}! You are scheduled to present in tomorrow's session.`,
      data: {
        id: result.insertId,
        status,
        markedAt: now,
        distanceMeters
      }
    });
  } catch (err) {
    console.error('Error scanning attendance:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
