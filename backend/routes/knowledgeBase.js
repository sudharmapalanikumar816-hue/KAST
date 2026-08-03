const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { answerKnowledgeQuery } = require('../services/aiService');

function getTodayString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// POST /api/knowledge-base/ask
router.post('/ask', authenticateToken, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || question.trim() === '') {
      return res.status(400).json({ success: false, message: 'Question prompt is required.' });
    }

    const today = getTodayString();

    // 1. Fetch Today's Session details
    const [sessions] = await pool.query(
      `SELECT s.*, 
              p.name as presenter_name, p.email as presenter_email,
              r.name as reviewer_name, r.email as reviewer_email
       FROM sessions s
       LEFT JOIN users p ON s.presenter_id = p.id
       LEFT JOIN users r ON s.reviewer_id = r.id
       WHERE s.session_date = ?`, [today]
    );
    const todaySession = sessions.length > 0 ? sessions[0] : null;

    // 2. Active interns only (matches admin dashboard)
    const [allInterns] = await pool.query(
      "SELECT id, name, email, department, COALESCE(order_index, 1) as order_index FROM users WHERE role = 'intern' AND is_active = TRUE ORDER BY name"
    );

    let presentInterns = [];
    let lateInterns = [];
    let absentInterns = [];

    if (todaySession) {
      const [attRecords] = await pool.query(
        `SELECT a.*, u.name as user_name, u.email as user_email, u.department
         FROM attendance a
         JOIN users u ON a.user_id = u.id
         WHERE a.session_id = ?
         ORDER BY a.marked_at ASC`, [todaySession.id]
      );

      const markedUserIds = new Set(attRecords.map(a => a.user_id));
      presentInterns = attRecords.filter(a => a.status === 'present');
      lateInterns = attRecords.filter(a => a.status === 'late');
      absentInterns = allInterns.filter(i => !markedUserIds.has(i.id));
    } else {
      absentInterns = allInterns;
    }

    // 3. Today's tool submission
    let todayTool = null;
    if (todaySession) {
      const [todaySub] = await pool.query(
        `SELECT ts.*, u.name as intern_name
         FROM tool_submissions ts
         JOIN users u ON ts.intern_id = u.id
         WHERE ts.session_id = ? LIMIT 1`, [todaySession.id]
      );
      if (todaySub.length > 0) todayTool = todaySub[0];
    }

    // 4. Today's session report (daily summary)
    let todaySessionReport = null;
    if (todaySession) {
      const [todayReports] = await pool.query(
        `SELECT sr.*, r.name as reporter_name, p.name as presenter_name
         FROM session_reports sr
         JOIN users r ON sr.reporter_id = r.id
         JOIN users p ON sr.presenter_id = p.id
         WHERE sr.session_id = ?`, [todaySession.id]
      );
      if (todayReports.length > 0) todaySessionReport = todayReports[0];
    }

    // 5. All session reports with daily summaries (admin needs full history)
    const [allSessionReports] = await pool.query(
      `SELECT sr.*, 
              s.session_date, 
              p.name as presenter_name, 
              r.name as reporter_name, 
              COALESCE(ts.tool_name, sr.tool_presented) as tool_name, 
              ts.category,
              ts.description as tool_description,
              ts.poc_repo_url,
              ts.demo_url,
              ts.use_cases
       FROM session_reports sr
       JOIN sessions s ON sr.session_id = s.id
       JOIN users p ON sr.presenter_id = p.id
       JOIN users r ON sr.reporter_id = r.id
       LEFT JOIN tool_submissions ts ON ts.session_id = s.id
       ORDER BY s.session_date DESC`
    );

    const [myReviewedReports] = await pool.query(
      `SELECT sr.*, 
              s.session_date, 
              p.name as presenter_name, 
              r.name as reporter_name, 
              COALESCE(ts.tool_name, sr.tool_presented) as tool_name, 
              ts.category,
              ts.description as tool_description,
              ts.poc_repo_url,
              ts.use_cases
       FROM session_reports sr
       JOIN sessions s ON sr.session_id = s.id
       JOIN users p ON sr.presenter_id = p.id
       JOIN users r ON sr.reporter_id = r.id
       LEFT JOIN tool_submissions ts ON ts.session_id = s.id
       ${req.user.role === 'senior_reviewer' ? 'WHERE sr.reporter_id = ' + pool.escape(req.user.id) : ''}
       ORDER BY s.session_date DESC`
    );

    const [pendingReports] = await pool.query(
      `SELECT s.*, p.name as presenter_name, r.name as reviewer_name
       FROM sessions s
       LEFT JOIN users p ON s.presenter_id = p.id
       LEFT JOIN users r ON s.reviewer_id = r.id
       LEFT JOIN session_reports sr ON sr.session_id = s.id
       WHERE sr.id IS NULL
       ${req.user.role === 'senior_reviewer' ? 'AND s.reviewer_id = ' + pool.escape(req.user.id) : ''}
       ORDER BY s.session_date DESC`
    );

    // 6. Tool catalog & submissions
    const [catalogRows] = await pool.query(
      `SELECT tc.*, u.name as first_presented_by_name
       FROM tool_catalog tc
       LEFT JOIN users u ON tc.first_presented_by = u.id
       ORDER BY tc.id DESC`
    );
    const [allSubmissions] = await pool.query(
      `SELECT ts.*, s.session_date, u.name as intern_name, u.id as intern_id
       FROM tool_submissions ts
       JOIN sessions s ON ts.session_id = s.id
       JOIN users u ON ts.intern_id = u.id
       ORDER BY s.session_date DESC`
    );

    // 7. Per-intern attendance profiles
    const [workdayRow] = await pool.query(
      'SELECT COUNT(id) as count FROM sessions WHERE DAYOFWEEK(session_date) != 1 AND session_date <= CURDATE()'
    );
    const totalWorkdays = workdayRow[0].count || 1;

    const [internAttStats] = await pool.query(
      `SELECT u.id, u.name, u.email, u.department,
              SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
              SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count
       FROM users u
       LEFT JOIN attendance a ON a.user_id = u.id
       LEFT JOIN sessions s ON a.session_id = s.id AND DAYOFWEEK(s.session_date) != 1
       WHERE u.role = 'intern' AND u.is_active = TRUE
       GROUP BY u.id, u.name, u.email, u.department
       ORDER BY u.name`
    );

    const internProfiles = internAttStats.map(row => {
      const present = Number(row.present_count) || 0;
      const late = Number(row.late_count) || 0;
      const absent = Math.max(0, totalWorkdays - (present + late));
      const attPct = Math.min(100, Math.round(((present + late) / totalWorkdays) * 100));
      const toolsPresented = allSubmissions.filter(s => s.intern_id === row.id);
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        department: row.department,
        attendance: { totalWorkdays, present, late, absent, attendancePercentage: attPct },
        toolsPresented
      };
    });

    // 8. Detailed attendance history (last 60 records for date-specific queries)
    const [attendanceHistory] = await pool.query(
      `SELECT s.session_date, u.id as intern_id, u.name as intern_name, a.status, a.marked_at
       FROM attendance a
       JOIN sessions s ON a.session_id = s.id
       JOIN users u ON a.user_id = u.id
       WHERE u.role = 'intern' AND u.is_active = TRUE AND DAYOFWEEK(s.session_date) != 1
       ORDER BY s.session_date DESC, u.name ASC
       LIMIT 500`
    );

    // 9. Dashboard aggregate stats
    const [attStats] = await pool.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) as present_total
       FROM attendance`
    );
    const totalAttRecords = attStats[0].total || 1;
    const overallAttPct = Math.round((attStats[0].present_total / totalAttRecords) * 100);

    const [categoryRows] = await pool.query(
      `SELECT category, COUNT(*) as count FROM tool_catalog GROUP BY category ORDER BY count DESC`
    );

    // 10. Upcoming rotations
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

    const [upcomingRotations] = await pool.query(
      `SELECT pr.*, 
              u.name as intern_name, u.email as intern_email, u.department,
              r.name as reviewer_name, r.email as reviewer_email
       FROM presenter_rotation pr
       JOIN users u ON pr.intern_id = u.id
       LEFT JOIN reviewer_rotation rr ON pr.scheduled_date = rr.scheduled_date
       LEFT JOIN users r ON rr.reviewer_id = r.id
       ORDER BY pr.scheduled_date ASC LIMIT 30`
    );

    const tomorrowRotation = upcomingRotations.find(r => r.scheduled_date === tomorrowStr) || null;

    const liveContext = {
      todayDate: today,
      tomorrowDate: tomorrowStr,
      currentUser: req.user,
      session: todaySession,
      presentInterns,
      lateInterns,
      absentInterns,
      totalInternsCount: allInterns.length,
      todayTool,
      todaySessionReport,
      tomorrowRotation,
      upcomingRotations,
      catalog: catalogRows,
      totalToolsDiscussed: catalogRows.length || allSubmissions.length,
      allSubmissions,
      allSessionReports,
      internProfiles,
      attendanceHistory,
      dashboardStats: {
        overallAttendancePct: overallAttPct,
        totalToolsPresented: catalogRows.length,
        categoryBreakdown: categoryRows
      },
      myReviewedReports,
      pendingReports
    };

    const answer = await answerKnowledgeQuery(question, liveContext);

    res.json({
      success: true,
      data: {
        question,
        answer,
        referencedToolsCount: catalogRows.length || allSubmissions.length
      }
    });
  } catch (err) {
    console.error('Knowledge Base Query error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
