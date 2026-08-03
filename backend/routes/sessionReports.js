const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { draftSessionReport } = require('../services/aiService');

function getTodayString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/session-reports/reviewer-invitations (Returns all sessions where Senior Reviewer was assigned/invited)
router.get('/reviewer-invitations', authenticateToken, requireRole('senior_reviewer', 'admin', 'program_owner'), async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const [rows] = await pool.query(
      `SELECT s.id as session_id, s.session_date, s.start_time, s.end_time, s.status as session_status,
              p.name as presenter_name, p.email as presenter_email, p.department as presenter_department,
              ts.tool_name, ts.category as tool_category,
              sr.id as report_id, sr.tool_presented, sr.presentation_quality_rating, sr.session_summary, sr.submitted_at as report_submitted_at
       FROM sessions s
       LEFT JOIN users p ON s.presenter_id = p.id
       LEFT JOIN tool_submissions ts ON ts.session_id = s.id AND ts.intern_id = s.presenter_id
       LEFT JOIN session_reports sr ON sr.session_id = s.id
       WHERE s.reviewer_id = ? OR sr.reporter_id = ?
       ORDER BY s.session_date DESC`,
      [reviewerId, reviewerId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/session-reports/reviewer-history (Returns all reports filed by the logged-in Senior Reviewer)
router.get('/reviewer-history', authenticateToken, requireRole('senior_reviewer', 'admin', 'program_owner'), async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const [rows] = await pool.query(
      `SELECT sr.*, 
              s.session_date, s.start_time, s.end_time,
              p.name as presenter_name, p.email as presenter_email, p.department as presenter_department,
              ts.category as tool_category, ts.poc_repo_url, ts.demo_url
       FROM session_reports sr
       JOIN sessions s ON sr.session_id = s.id
       JOIN users p ON sr.presenter_id = p.id
       LEFT JOIN tool_submissions ts ON ts.session_id = s.id AND ts.intern_id = sr.presenter_id
       WHERE sr.reporter_id = ?
       ORDER BY s.session_date DESC, sr.submitted_at DESC`,
      [reviewerId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/session-reports/my-reports (Returns review reports filed for the logged-in intern's presentations)
router.get('/my-reports', authenticateToken, async (req, res) => {
  try {
    const internId = req.user.id;
    const [rows] = await pool.query(
      `SELECT sr.*, 
              s.session_date, s.start_time, s.end_time,
              r.name as reporter_name, r.email as reporter_email, r.department as reporter_department,
              ts.category as tool_category, ts.poc_repo_url, ts.demo_url
       FROM session_reports sr
       JOIN sessions s ON sr.session_id = s.id
       JOIN users r ON sr.reporter_id = r.id
       LEFT JOIN tool_submissions ts ON ts.session_id = s.id AND ts.intern_id = sr.presenter_id
       WHERE sr.presenter_id = ?
       ORDER BY s.session_date DESC, sr.submitted_at DESC`,
      [internId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/session-reports/:sessionId/ai-draft
router.get('/:sessionId/ai-draft', authenticateToken, requireRole('senior_reviewer', 'admin', 'program_owner'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const reporterNotes = req.query.notes || '';

    const [sessions] = await pool.query(
      `SELECT s.*, p.name as presenter_name 
       FROM sessions s 
       JOIN users p ON s.presenter_id = p.id 
       WHERE s.id = ?`, [sessionId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const session = sessions[0];

    const [submissions] = await pool.query(
      'SELECT tool_name, description FROM tool_submissions WHERE session_id = ? ORDER BY id DESC LIMIT 1',
      [sessionId]
    );

    const toolName = submissions.length > 0 ? submissions[0].tool_name : 'AI Tool Session';
    const description = submissions.length > 0 ? submissions[0].description : '';

    const draft = await draftSessionReport(toolName, session.presenter_name, description, reporterNotes);
    res.json({ success: true, data: { aiDraftSummary: draft } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/session-reports/today
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const today = getTodayString();
    const [rows] = await pool.query(
      `SELECT sr.*, 
              s.session_date, s.start_time, s.end_time, s.status as session_status,
              r.name as reporter_name, r.email as reporter_email,
              p.name as presenter_name, p.email as presenter_email,
              ts.source_url, ts.poc_repo_url, ts.demo_url, ts.category as tool_category
       FROM session_reports sr
       JOIN sessions s ON sr.session_id = s.id
       JOIN users r ON sr.reporter_id = r.id
       JOIN users p ON sr.presenter_id = p.id
       LEFT JOIN tool_submissions ts ON ts.session_id = s.id AND ts.intern_id = p.id
       WHERE s.session_date = ?`, [today]
    );

    if (rows.length === 0) {
      return res.json({ success: true, data: null, message: 'No session report submitted for today yet.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/session-reports
router.post('/', authenticateToken, requireRole('senior_reviewer', 'admin', 'program_owner'), [
  body('sessionId').notEmpty().withMessage('sessionId is required'),
  body('presentationQualityRating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1 to 5')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { sessionId, toolPresented, presenterId, sessionSummary, presentationQualityRating, attendanceObservation, flags, aiDraftSummary } = req.body;
  const reporterId = req.user.id;

  try {
    const [sessions] = await pool.query('SELECT presenter_id FROM sessions WHERE id = ?', [sessionId]);
    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    let finalPresenterId = presenterId || sessions[0].presenter_id;
    if (!finalPresenterId) {
      const [subs] = await pool.query('SELECT intern_id FROM tool_submissions WHERE session_id = ? LIMIT 1', [sessionId]);
      if (subs.length > 0) {
        finalPresenterId = subs[0].intern_id;
      } else {
        const [interns] = await pool.query("SELECT id FROM users WHERE role = 'intern' LIMIT 1");
        finalPresenterId = interns.length > 0 ? interns[0].id : req.user.id;
      }
    }

    const [existing] = await pool.query('SELECT id FROM session_reports WHERE session_id = ?', [sessionId]);
    let reportId;

    if (existing.length > 0) {
      reportId = existing[0].id;
      await pool.query(
        `UPDATE session_reports SET
           reporter_id = ?, tool_presented = ?, presenter_id = ?, session_summary = ?,
           presentation_quality_rating = ?, attendance_observation = ?, flags = ?, ai_draft_summary = ?, submitted_at = NOW()
         WHERE id = ?`,
        [reporterId, toolPresented, finalPresenterId, sessionSummary, presentationQualityRating, attendanceObservation, flags, aiDraftSummary, reportId]
      );
    } else {
      const [result] = await pool.query(
        `INSERT INTO session_reports 
           (session_id, reporter_id, tool_presented, presenter_id, session_summary, presentation_quality_rating, attendance_observation, flags, ai_draft_summary, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [sessionId, reporterId, toolPresented, finalPresenterId, sessionSummary, presentationQualityRating, attendanceObservation, flags, aiDraftSummary]
      );
      reportId = result.insertId;
    }

    await pool.query('UPDATE sessions SET status = "completed" WHERE id = ?', [sessionId]);
    await pool.query('UPDATE tool_submissions SET status = "reviewed" WHERE session_id = ?', [sessionId]);

    const [admins] = await pool.query('SELECT id FROM users WHERE role IN ("admin", "program_owner") AND is_active = TRUE');
    for (const adm of admins) {
      await pool.query(
        'INSERT INTO notifications (user_id, type, message) VALUES (?, "report_submitted", ?)',
        [adm.id, `Daily Session Report filed for today's topic '${toolPresented}'. Rating: ${presentationQualityRating}/5.`]
      );
    }

    res.status(201).json({
      success: true,
      data: { id: reportId },
      message: 'Senior Reviewer Session Report filed successfully.'
    });
  } catch (err) {
    console.error('Session report filing error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/session-reports
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT sr.*, 
              s.session_date, 
              r.name as reporter_name, 
              p.name as presenter_name
       FROM session_reports sr
       JOIN sessions s ON sr.session_id = s.id
       JOIN users r ON sr.reporter_id = r.id
       JOIN users p ON sr.presenter_id = p.id
       ORDER BY s.session_date DESC LIMIT 30`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
