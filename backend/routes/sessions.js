const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateDailyQRToken } = require('../services/scheduler');
const { autoAdvanceRotation } = require('./rotation');

function getTodayString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/sessions/today
router.get('/today', authenticateToken, async (req, res) => {
  try {
    await autoAdvanceRotation();
    const today = getTodayString(1); // Starting from tomorrow (2026-08-04)
    let [sessions] = await pool.query(
      `SELECT s.*, 
              p.name as presenter_name, p.email as presenter_email, p.department as presenter_dept,
              r.name as reviewer_name, r.email as reviewer_email
       FROM sessions s
       LEFT JOIN users p ON s.presenter_id = p.id
       LEFT JOIN users r ON s.reviewer_id = r.id
       WHERE s.session_date = ?`, [today]
    );

    // If no session exists for today yet, create/ensure one from rotations
    if (sessions.length === 0) {
      // Find presenter from presenter_rotation
      const [pRot] = await pool.query(
        `SELECT intern_id FROM presenter_rotation WHERE scheduled_date = ? LIMIT 1`, [today]
      );
      // Find reviewer from reviewer_rotation
      const [rRot] = await pool.query(
        `SELECT reviewer_id FROM reviewer_rotation WHERE scheduled_date = ? LIMIT 1`, [today]
      );

      const presenterId = pRot.length > 0 ? pRot[0].intern_id : null;
      const reviewerId = rRot.length > 0 ? rRot[0].reviewer_id : null;

      const [insertRes] = await pool.query(
        `INSERT INTO sessions (session_date, presenter_id, reviewer_id, status) VALUES (?, ?, ?, 'scheduled')`,
        [today, presenterId, reviewerId]
      );

      // Fetch newly created session
      [sessions] = await pool.query(
        `SELECT s.*, 
                p.name as presenter_name, p.email as presenter_email, p.department as presenter_dept,
                r.name as reviewer_name, r.email as reviewer_email
         FROM sessions s
         LEFT JOIN users p ON s.presenter_id = p.id
         LEFT JOIN users r ON s.reviewer_id = r.id
         WHERE s.id = ?`, [insertRes.insertId]
      );
    }

    let session = sessions[0];

    // Auto-resolve presenter or reviewer if null
    let needUpdate = false;
    let pId = session.presenter_id;
    let rId = session.reviewer_id;

    if (!pId) {
      const [subs] = await pool.query('SELECT intern_id FROM tool_submissions WHERE session_id = ? LIMIT 1', [session.id]);
      if (subs.length > 0) {
        pId = subs[0].intern_id;
      } else {
        const [interns] = await pool.query("SELECT id FROM users WHERE role = 'intern' ORDER BY id ASC LIMIT 1");
        if (interns.length > 0) pId = interns[0].id;
      }
      needUpdate = true;
    }

    if (!rId) {
      const [reviewers] = await pool.query("SELECT id FROM users WHERE role IN ('senior_reviewer', 'program_owner') ORDER BY id ASC LIMIT 1");
      if (reviewers.length > 0) rId = reviewers[0].id;
      needUpdate = true;
    }

    if (needUpdate && (pId || rId)) {
      await pool.query('UPDATE sessions SET presenter_id = ?, reviewer_id = ? WHERE id = ?', [pId, rId, session.id]);
      [sessions] = await pool.query(
        `SELECT s.*, 
                p.name as presenter_name, p.email as presenter_email, p.department as presenter_dept,
                r.name as reviewer_name, r.email as reviewer_email
         FROM sessions s
         LEFT JOIN users p ON s.presenter_id = p.id
         LEFT JOIN users r ON s.reviewer_id = r.id
         WHERE s.id = ?`, [session.id]
      );
      session = sessions[0];
    }

    // Check if there is an existing tool submission for today's session
    const [submissions] = await pool.query(
      `SELECT ts.*, u.name as intern_name 
       FROM tool_submissions ts
       JOIN users u ON ts.intern_id = u.id
       WHERE ts.session_id = ?`, [session.id]
    );

    // Check today's attendance count
    const [attStats] = await pool.query(
      `SELECT 
         COUNT(*) as total_marked,
         SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present_count,
         SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) as late_count,
         SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent_count
       FROM attendance WHERE session_id = ?`, [session.id]
    );

    res.json({
      success: true,
      data: {
        session,
        submission: submissions.length > 0 ? submissions[0] : null,
        attendanceStats: attStats[0]
      }
    });
  } catch (err) {
    console.error('Error fetching today session:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sessions/today/generate-qr
router.post('/today/generate-qr', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const today = getTodayString();
    const token = await generateDailyQRToken(today);
    res.json({ success: true, data: { qr_token: token, generated_at: new Date() }, message: 'New QR token generated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sessions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT s.*, 
             p.name as presenter_name, 
             r.name as reviewer_name,
             sr.id as report_id, sr.presentation_quality_rating, sr.session_summary
      FROM sessions s
      LEFT JOIN users p ON s.presenter_id = p.id
      LEFT JOIN users r ON s.reviewer_id = r.id
      LEFT JOIN session_reports sr ON sr.session_id = s.id
    `;
    const params = [];

    if (startDate && endDate) {
      query += ` WHERE s.session_date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    query += ` ORDER BY s.session_date DESC LIMIT 30`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
