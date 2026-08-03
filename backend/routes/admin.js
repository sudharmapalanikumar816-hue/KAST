const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { send1800EveningReminders } = require('../services/scheduler');
const { verifySmtpConnection, sendInternPresenterReminderEmail, sendSeniorReviewerReminderEmail } = require('../services/emailService');

function getTodayString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/admin/today-feed ("What Happened Today" Hero Feed with Detailed Attendance Lists & Scan Times)
router.get('/today-feed', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const today = getTodayString();

    const [sessions] = await pool.query(
      `SELECT s.*, 
              p.name as presenter_name, p.email as presenter_email,
              r.name as reviewer_name, r.email as reviewer_email
       FROM sessions s
       LEFT JOIN users p ON s.presenter_id = p.id
       LEFT JOIN users r ON s.reviewer_id = r.id
       WHERE s.session_date = ?`, [today]
    );

    const session = sessions.length > 0 ? sessions[0] : null;

    let report = null;
    if (session) {
      const [reports] = await pool.query(
        `SELECT sr.*, r.name as reporter_name 
         FROM session_reports sr
         JOIN users r ON sr.reporter_id = r.id
         WHERE sr.session_id = ?`, [session.id]
      );
      report = reports.length > 0 ? reports[0] : null;
    }

    let submission = null;
    if (session) {
      const [subs] = await pool.query(
        'SELECT * FROM tool_submissions WHERE session_id = ? ORDER BY id DESC LIMIT 1',
        [session.id]
      );
      submission = subs.length > 0 ? subs[0] : null;
    }

    let attendanceSummary = { total_interns: 0, present: 0, late: 0, absent: 0, percentage: 0 };
    let todayPresentList = [];
    let todayLateList = [];
    let todayAbsentList = [];

    if (session) {
      const [allInterns] = await pool.query('SELECT id, name, email, department FROM users WHERE role = "intern" AND is_active = TRUE ORDER BY name');
      const totalInterns = allInterns.length || 1;

      const [scans] = await pool.query(
        `SELECT a.*, u.name as user_name, u.email as user_email, u.department
         FROM attendance a
         JOIN users u ON a.user_id = u.id
         WHERE a.session_id = ?
         ORDER BY a.marked_at ASC`,
        [session.id]
      );

      todayPresentList = scans.filter(s => s.status === 'present');
      todayLateList = scans.filter(s => s.status === 'late');

      const checkedUserIds = new Set(scans.map(s => s.user_id));
      todayAbsentList = allInterns.filter(u => !checkedUserIds.has(u.id));

      const presentCount = todayPresentList.length;
      const lateCount = todayLateList.length;
      const actualAbsent = todayAbsentList.length;
      const pct = Math.round(((presentCount + lateCount) / totalInterns) * 100);

      attendanceSummary = {
        total_interns: totalInterns,
        present: presentCount,
        late: lateCount,
        absent: actualAbsent,
        percentage: pct
      };
    }

    res.json({
      success: true,
      data: {
        date: today,
        session,
        report,
        submission,
        attendanceSummary,
        todayPresentList,
        todayLateList,
        todayAbsentList
      }
    });
  } catch (err) {
    console.error('Admin today-feed error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/dashboard-stats
router.get('/dashboard-stats', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const [attStats] = await pool.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) as present_total
       FROM attendance`
    );
    const totalAttRecords = attStats[0].total || 1;
    const overallAttPct = Math.round((attStats[0].present_total / totalAttRecords) * 100);

    const [tools] = await pool.query('SELECT COUNT(*) as total FROM tool_catalog');
    const totalTools = tools[0].total;

    const [categories] = await pool.query(
      `SELECT category, COUNT(*) as count FROM tool_catalog GROUP BY category ORDER BY count DESC`
    );

    res.json({
      success: true,
      data: {
        overallAttendancePct: overallAttPct,
        totalToolsPresented: totalTools,
        categoryBreakdown: categories
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/intern-detail/:internId
router.get('/intern-detail/:internId', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const { internId } = req.params;

    const [users] = await pool.query(
      'SELECT id, name, email, department, COALESCE(order_index, 1) as order_index, is_active FROM users WHERE id = ?',
      [internId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Intern not found.' });
    }
    const intern = users[0];

    const [attRows] = await pool.query(
      `SELECT a.*, s.session_date, s.start_time, m.name as marked_by_name
       FROM attendance a
       JOIN sessions s ON a.session_id = s.id
       LEFT JOIN users m ON a.marked_by = m.id
       WHERE a.user_id = ? AND DAYOFWEEK(s.session_date) != 1
       ORDER BY s.session_date DESC, a.marked_at DESC`,
      [internId]
    );

    const [workdayRow] = await pool.query(
      'SELECT COUNT(id) as count FROM sessions WHERE DAYOFWEEK(session_date) != 1 AND session_date <= CURDATE()'
    );
    const totalWorkdays = workdayRow[0].count || 1;
    const presentOnTime = attRows.filter(r => r.status === 'present').length;
    const lateCount = attRows.filter(r => r.status === 'late').length;
    const absentCount = Math.max(0, totalWorkdays - (presentOnTime + lateCount));
    const attPct = Math.min(100, Math.round(((presentOnTime + lateCount) / totalWorkdays) * 100));

    const [subRows] = await pool.query(
      `SELECT ts.*, s.session_date,
              sr.id as report_id, sr.session_summary as reviewer_summary, sr.presentation_quality_rating, sr.flags,
              r.name as reporter_name, r.email as reporter_email
       FROM tool_submissions ts
       JOIN sessions s ON ts.session_id = s.id
       LEFT JOIN session_reports sr ON sr.session_id = s.id
       LEFT JOIN users r ON sr.reporter_id = r.id
       WHERE ts.intern_id = ?
       ORDER BY s.session_date DESC, ts.submitted_at DESC`,
      [internId]
    );

    for (const sub of subRows) {
      const [docs] = await pool.query('SELECT * FROM documents WHERE submission_id = ?', [sub.id]);
      sub.documents = docs;
      if (typeof sub.use_cases === 'string') {
        try {
          sub.use_cases = JSON.parse(sub.use_cases);
        } catch (e) {
          sub.use_cases = [];
        }
      }
    }

    res.json({
      success: true,
      data: {
        intern,
        attendanceSummary: {
          totalWorkdays,
          present: presentOnTime,
          late: lateCount,
          absent: absentCount,
          attendancePercentage: attPct
        },
        attendanceHistory: attRows,
        toolsPresented: subRows
      }
    });
  } catch (err) {
    console.error('Error fetching intern detail:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/senior-detail/:seniorId
router.get('/senior-detail/:seniorId', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const { seniorId } = req.params;

    const [users] = await pool.query(
      'SELECT id, name, email, role, department, is_active, created_at FROM users WHERE id = ?',
      [seniorId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Senior employee not found.' });
    }
    const senior = users[0];

    // Fetch reports filed by this senior reviewer
    const [reportsFiled] = await pool.query(
      `SELECT sr.*, s.session_date, p.name as presenter_name, p.email as presenter_email
       FROM session_reports sr
       JOIN sessions s ON sr.session_id = s.id
       LEFT JOIN users p ON sr.presenter_id = p.id
       WHERE sr.reporter_id = ?
       ORDER BY s.session_date DESC`,
      [seniorId]
    );

    // Fetch reviewer rotation schedule assigned to this senior employee
    const [rotations] = await pool.query(
      `SELECT rr.*, s.id as session_id, s.status as session_status
       FROM reviewer_rotation rr
       LEFT JOIN sessions s ON rr.scheduled_date = s.session_date
       WHERE rr.reviewer_id = ?
       ORDER BY rr.scheduled_date DESC`,
      [seniorId]
    );

    res.json({
      success: true,
      data: {
        senior,
        reportsFiled,
        rotations,
        stats: {
          totalReportsFiled: reportsFiled.length,
          totalRotationsAssigned: rotations.length
        }
      }
    });
  } catch (err) {
    console.error('Error fetching senior detail:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/users
router.get('/users', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, department, COALESCE(order_index, 1) as order_index, is_active, created_at FROM users ORDER BY role, id'
    );
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('GET /admin/users error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/users
router.post('/users', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const { name, email, password, role, department, orderIndex } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email address is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department, order_index, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [name, email, passwordHash, role, department || 'Engineering', orderIndex || 1]
    );

    res.status(201).json({
      success: true,
      message: `User '${name}' created successfully with role ${role}.`,
      data: { id: result.insertId }
    });
  } catch (err) {
    console.error('User creation error:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to create user.' });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const { name, email, role, department, orderIndex, isActive, password } = req.body;

    if (password && password.trim().length > 0) {
      if (!req.user || req.user.role.toLowerCase() !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden. Only System Admin is authorized to change user passwords.' });
      }
    }

    let query = `UPDATE users SET name = ?, email = ?, role = ?, department = ?, order_index = ?, is_active = ?`;
    let params = [name, email, role, department, orderIndex || 1, isActive !== undefined ? Boolean(isActive) : true];

    if (password && password.trim().length > 0) {
      const passwordHash = await bcrypt.hash(password, 10);
      query += `, password_hash = ?`;
      params.push(passwordHash);
    }

    query += ` WHERE id = ?`;
    params.push(req.params.id);

    await pool.query(query, params);
    res.json({ success: true, message: `User '${name}' updated successfully.` });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/users/:id/change-password (Admin ONLY)
router.put('/users/:id/change-password', authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden. Only System Admin is authorized to change user passwords.' });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const [userExists] = await pool.query('SELECT id, name, role FROM users WHERE id = ?', [req.params.id]);
    if (userExists.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.params.id]);

    res.json({
      success: true,
      message: `Password for '${userExists[0].name}' (${userExists[0].role}) updated successfully by Admin.`
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update password.' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
    }

    // Clean up foreign key references in child tables first to prevent constraint failures
    await pool.query('UPDATE attendance SET marked_by = NULL WHERE marked_by = ?', [id]);
    await pool.query('UPDATE sessions SET presenter_id = NULL WHERE presenter_id = ?', [id]);
    await pool.query('UPDATE sessions SET reviewer_id = NULL WHERE reviewer_id = ?', [id]);
    await pool.query('UPDATE tool_catalog SET first_presented_by = NULL WHERE first_presented_by = ?', [id]);
    await pool.query('UPDATE impact_tracking SET updated_by = NULL WHERE updated_by = ?', [id]);

    await pool.query('DELETE FROM presenter_rotation WHERE intern_id = ?', [id]);
    await pool.query('DELETE FROM reviewer_rotation WHERE reviewer_id = ?', [id]);
    await pool.query('DELETE FROM attendance WHERE user_id = ?', [id]);
    await pool.query('DELETE FROM badges WHERE user_id = ?', [id]);
    await pool.query('DELETE FROM notifications WHERE user_id = ?', [id]);
    await pool.query('DELETE FROM session_reports WHERE reporter_id = ? OR presenter_id = ?', [id, id]);
    await pool.query('DELETE FROM tool_submissions WHERE intern_id = ?', [id]);

    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete user.' });
  }
});

// PUT /api/admin/submissions/:id
router.put('/submissions/:id', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const { toolName, category, description, presentationNotes, pocRepoUrl, demoUrl } = req.body;
    await pool.query(
      `UPDATE tool_submissions SET tool_name = ?, category = ?, description = ?, presentation_notes = ?, poc_repo_url = ?, demo_url = ? WHERE id = ?`,
      [toolName, category, description, presentationNotes, pocRepoUrl, demoUrl, req.params.id]
    );
    res.json({ success: true, message: 'Submission updated successfully.' });
  } catch (err) {
    console.error('Update submission error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/submissions/:id
router.delete('/submissions/:id', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM documents WHERE submission_id = ?', [id]);
    await pool.query('DELETE FROM impact_tracking WHERE submission_id = ?', [id]);
    await pool.query('DELETE FROM tool_submissions WHERE id = ?', [id]);
    res.json({ success: true, message: 'Submission deleted successfully.' });
  } catch (err) {
    console.error('Delete submission error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/reviewers
router.get('/reviewers', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const [reviewers] = await pool.query(
      'SELECT id, name, email, department FROM users WHERE role IN ("senior_reviewer", "admin", "program_owner") AND is_active = TRUE'
    );
    res.json({ success: true, data: reviewers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/create-session
router.post('/create-session', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const { sessionDate, presenterId, reviewerId } = req.body;
    if (!sessionDate || !presenterId || !reviewerId) {
      return res.status(400).json({ success: false, message: 'sessionDate, presenterId, and reviewerId are required.' });
    }

    const qrToken = 'KAST_QR_' + Math.random().toString(36).substring(2, 9).toUpperCase();

    const [existing] = await pool.query('SELECT id FROM sessions WHERE session_date = ?', [sessionDate]);
    if (existing.length > 0) {
      await pool.query(
        `UPDATE sessions SET presenter_id = ?, reviewer_id = ?, qr_token = ? WHERE id = ?`,
        [presenterId, reviewerId, qrToken, existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO sessions (session_date, start_time, end_time, presenter_id, reviewer_id, qr_token, status)
         VALUES (?, '09:00:00', '09:30:00', ?, ?, ?, 'scheduled')`,
        [sessionDate, presenterId, reviewerId, qrToken]
      );

      await pool.query(
        `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'info')`,
        [reviewerId, `INVITATION: You are invited to monitor the 9:00 AM AI Knowledge session on ${sessionDate}.`]
      );
    }

    // Dispatch immediate email notifications to assigned presenter and senior reviewer
    const [presenterRows] = await pool.query('SELECT name, email FROM users WHERE id = ?', [presenterId]);
    const [reviewerRows] = await pool.query('SELECT name, email FROM users WHERE id = ?', [reviewerId]);

    let emailStatusNote = '';
    if (presenterRows.length > 0 && presenterRows[0].email) {
      await sendInternPresenterReminderEmail({
        toEmail: presenterRows[0].email,
        internName: presenterRows[0].name,
        sessionDate
      });
    }
    if (reviewerRows.length > 0 && reviewerRows[0].email) {
      await sendSeniorReviewerReminderEmail({
        toEmail: reviewerRows[0].email,
        reviewerName: reviewerRows[0].name,
        presenterName: presenterRows.length > 0 ? presenterRows[0].name : 'Assigned Intern',
        sessionDate
      });
      emailStatusNote = ' (Email invitations dispatched)';
    }

    res.status(201).json({
      success: true,
      message: `Created/Updated morning session for ${sessionDate}! Presenter assigned & Senior Reviewer invited.${emailStatusNote}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/trigger-reminders (Manually dispatch Day-Before Email Reminders)
router.post('/trigger-reminders', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const { targetDate } = req.body;
    const result = await send1800EveningReminders(targetDate);
    
    let msg = `Day-before reminder emails processed for ${result.targetDate}! (${result.count} dispatched)`;
    if (result.details && result.details.length > 0) {
      msg += ` [${result.details.join(' | ')}]`;
    }

    if (result.errors && result.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Email reminders completed with errors: ${result.errors.join('; ')}`,
        data: result
      });
    }

    res.json({
      success: true,
      message: msg,
      data: result
    });
  } catch (err) {
    console.error('Error triggering email reminders:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/verify-smtp (Verify SMTP server connection)
router.get('/verify-smtp', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const smtpStatus = await verifySmtpConnection();
    res.json(smtpStatus);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/clear-presented-history (Clear all tool submissions, session reports, and presented rotation history)
router.post('/clear-presented-history', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    await pool.query('DELETE FROM documents');
    await pool.query('DELETE FROM session_reports');
    await pool.query('DELETE FROM tool_submissions');
    await pool.query('DELETE FROM tool_catalog');
    await pool.query('DELETE FROM sessions');
    await pool.query('UPDATE presenter_rotation SET status = "upcoming" WHERE status = "presented"');

    res.json({
      success: true,
      message: 'All presented tool history, session reports, today presenter details, and past presenter statuses cleared successfully!'
    });
  } catch (err) {
    console.error('Error clearing presented history:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/clear-dummy-data (Clear all dummy research, attendance, reports, and catalog entries)
router.post('/clear-dummy-data', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    await pool.query('DELETE FROM documents');
    await pool.query('DELETE FROM impact_tracking');
    await pool.query('DELETE FROM session_reports');
    await pool.query('DELETE FROM tool_submissions');
    await pool.query('DELETE FROM attendance');
    await pool.query('DELETE FROM badges');
    await pool.query('DELETE FROM notifications');
    await pool.query('DELETE FROM tool_catalog');
    await pool.query('DELETE FROM presenter_rotation');
    await pool.query('DELETE FROM reviewer_rotation');
    await pool.query('DELETE FROM sessions');

    res.json({
      success: true,
      message: 'All dummy submissions, attendance records, reports, and catalog items cleared successfully!'
    });
  } catch (err) {
    console.error('Error clearing dummy data:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
