const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

function getTodayString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Autonomous Rotation Engine:
 * Auto-populates/advances the presenter and reviewer rotation schedules
 * based on:
 * 1. Fresh cycle anchor starting from tomorrow (2026-08-04) with Vanmathi Kasi.
 * 2. Punch-in timestamp order (most recent punch-in first: attendance.marked_at DESC)
 * 3. Late Comer rule: Previous day late comers take priority unless already presented in current circle.
 * 4. Circle constraint: Each active intern presents once per circle ($N$ persons = $N$ days).
 */
async function autoAdvanceRotation() {
  try {
    const today = getTodayString();
    
    // 1. Get all active interns ordered by latest punch-in timestamp (attendance.marked_at DESC)
    const [internsWithPunchIn] = await pool.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email,
        MAX(a.marked_at) as latest_punch_in
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id AND a.status IN ('present', 'late')
      WHERE u.role = 'intern' AND u.is_active = TRUE
      GROUP BY u.id, u.name, u.email
      ORDER BY latest_punch_in DESC, u.order_index ASC, u.id ASC
    `);

    if (internsWithPunchIn.length === 0) return;
    const totalInterns = internsWithPunchIn.length;

    // 2. Get all active senior reviewers in fixed sequence order
    const [reviewers] = await pool.query('SELECT id, name FROM users WHERE role = "senior_reviewer" AND is_active = TRUE ORDER BY order_index ASC, id ASC');

    // Fresh cycle anchor starting from today
    const cycleAnchorDate = getTodayString();

    // Generate schedule automatically for full circle (17 persons = 17 days)
    const daysAhead = Math.max(17, totalInterns);
    for (let i = 0; i < daysAhead; i++) {
      const targetDate = getTodayString(i);
      
      // Check presenter rotation
      const [existingPR] = await pool.query('SELECT id FROM presenter_rotation WHERE scheduled_date = ?', [targetDate]);
      if (existingPR.length === 0) {
        let assignedIntern = null;

        // Special case: If targetDate is tomorrow (2026-08-04), assign Vanmathi Kasi
        if (targetDate === '2026-08-04') {
          const [vanmathi] = await pool.query("SELECT id, name, email FROM users WHERE email LIKE '%Vanmathi.Kasi%' OR name LIKE '%Vanmathi Kasi%' LIMIT 1");
          if (vanmathi.length > 0) {
            assignedIntern = vanmathi[0];
          }
        }

        // Fetch all rotation entries in the current fresh cycle
        const [cycleRotations] = await pool.query(
          'SELECT id, intern_id, scheduled_date FROM presenter_rotation WHERE scheduled_date >= ? ORDER BY scheduled_date ASC, id ASC',
          [cycleAnchorDate]
        );

        const totalPastInCycle = cycleRotations.length;
        const currentCircle = Math.floor(totalPastInCycle / totalInterns);
        const circleStartIndex = currentCircle * totalInterns;

        // Set of intern IDs already scheduled/completed in the current fresh circle
        const scheduledInCircle = new Set(
          cycleRotations.slice(circleStartIndex, totalPastInCycle).map(r => r.intern_id)
        );

        // RULE 1: Check late comers from the previous session before targetDate
        if (!assignedIntern) {
          const [prevSessions] = await pool.query(
            'SELECT id, session_date FROM sessions WHERE session_date < ? ORDER BY session_date DESC LIMIT 1',
            [targetDate]
          );

          if (prevSessions.length > 0) {
            const prevSessionId = prevSessions[0].id;
            const [lateComers] = await pool.query(
              `SELECT a.user_id 
               FROM attendance a
               JOIN users u ON a.user_id = u.id
               WHERE a.session_id = ? AND a.status = 'late' AND u.role = 'intern' AND u.is_active = TRUE
               ORDER BY a.marked_at ASC`,
              [prevSessionId]
            );

            // Find the first late comer who has NOT already been scheduled in the current circle
            for (const lc of lateComers) {
              if (!scheduledInCircle.has(lc.user_id)) {
                const lateUser = internsWithPunchIn.find(i => i.id === lc.user_id);
                if (lateUser) {
                  assignedIntern = lateUser;
                  break;
                }
              }
            }
          }
        }

        // RULE 2: If no eligible late comer, fall back to punch-in order & circle completion
        if (!assignedIntern) {
          for (const intern of internsWithPunchIn) {
            if (!scheduledInCircle.has(intern.id)) {
              assignedIntern = intern;
              break;
            }
          }

          if (!assignedIntern) {
            assignedIntern = internsWithPunchIn[0];
          }
        }

        const [totalPastCnt] = await pool.query('SELECT COUNT(*) as cnt FROM presenter_rotation');
        const orderIdx = totalPastCnt[0].cnt + 1;

        await pool.query(
          'INSERT INTO presenter_rotation (intern_id, scheduled_date, order_index, status) VALUES (?, ?, ?, "upcoming")',
          [assignedIntern.id, targetDate, orderIdx]
        );
      }

      // Check reviewer rotation (fixed sequence order: Praveen Kp -> Sibisiddharth G -> Subramanian N ...)
      if (reviewers.length > 0) {
        const [existingRR] = await pool.query('SELECT id FROM reviewer_rotation WHERE scheduled_date = ?', [targetDate]);
        if (existingRR.length === 0) {
          let assignedReviewer = null;

          // Special case: tomorrow (2026-08-04) senior reviewer is Praveen Kp
          if (targetDate === '2026-08-04') {
            const [praveen] = await pool.query("SELECT id FROM users WHERE email LIKE '%Praveen.kp%' OR name LIKE '%Praveen Kp%' LIMIT 1");
            if (praveen.length > 0) {
              assignedReviewer = reviewers.find(r => r.id === praveen[0].id) || { id: praveen[0].id };
            }
          }

          if (!assignedReviewer) {
            const [cycleRevRotations] = await pool.query(
              'SELECT id FROM reviewer_rotation WHERE scheduled_date >= ? ORDER BY scheduled_date ASC, id ASC',
              [cycleAnchorDate]
            );
            const revIndex = (cycleRevRotations.length) % reviewers.length;
            assignedReviewer = reviewers[revIndex];
          }

          await pool.query(
            'INSERT INTO reviewer_rotation (reviewer_id, scheduled_date, confirmed) VALUES (?, ?, FALSE)',
            [assignedReviewer.id, targetDate]
          );
        }
      }
    }
  } catch (err) {
    console.error('Auto rotation advance error:', err.message);
  }
}

// GET /api/rotation/presenters (Returns upcoming automatic presenter & reviewer rotation schedule)
router.get('/presenters', authenticateToken, async (req, res) => {
  try {
    const todayStr = getTodayString();
    const tomorrowStr = getTodayString(1);

    const [rows] = await pool.query(
      `SELECT pr.*, 
              u.name as intern_name, u.email as intern_email, u.department,
              r.name as reviewer_name, r.email as reviewer_email
       FROM presenter_rotation pr
       JOIN users u ON pr.intern_id = u.id
       LEFT JOIN reviewer_rotation rr ON pr.scheduled_date = rr.scheduled_date
       LEFT JOIN users r ON rr.reviewer_id = r.id
       WHERE pr.scheduled_date >= ?
       GROUP BY pr.id
       ORDER BY pr.scheduled_date ASC LIMIT 30`,
      [todayStr]
    );

    const [defaultReviewers] = await pool.query("SELECT name FROM users WHERE role IN ('senior_reviewer', 'program_owner') ORDER BY id ASC LIMIT 1");
    const fallbackReviewerName = defaultReviewers.length > 0 ? defaultReviewers[0].name : 'Praveen Kp';

    for (const row of rows) {
      if (!row.reviewer_name) {
        row.reviewer_name = fallbackReviewerName;
      }

      if (row.status === 'presented') {
        row.notification_status = 'PRESENTED';
      } else if (row.scheduled_date === todayStr || row.scheduled_date === tomorrowStr) {
        row.notification_status = 'AUTO-REMINDED';
      } else {
        row.notification_status = 'SCHEDULED';
      }
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/rotation/reviewers (Returns upcoming reviewer rotation)
router.get('/reviewers', authenticateToken, async (req, res) => {
  try {
    await autoAdvanceRotation();
    const [rows] = await pool.query(
      `SELECT rr.*, u.name as reviewer_name, u.email as reviewer_email, u.department
       FROM reviewer_rotation rr
       JOIN users u ON rr.reviewer_id = u.id
       ORDER BY rr.scheduled_date ASC LIMIT 30`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/rotation/reviewers/confirm
router.post('/reviewers/confirm', authenticateToken, requireRole('senior_reviewer', 'program_owner', 'admin'), async (req, res) => {
  try {
    const today = getTodayString();
    const reviewerId = req.user.id;

    await pool.query(
      `UPDATE reviewer_rotation SET confirmed = TRUE, confirmed_at = NOW() 
       WHERE reviewer_id = ? AND scheduled_date = ?`,
      [reviewerId, today]
    );

    res.json({ success: true, message: 'Senior reviewer attendance confirmed for today.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/rotation/recalculate (Force recalculation of upcoming presenter rotation based on latest punch-in order)
router.post('/recalculate', authenticateToken, requireRole('senior_reviewer', 'program_owner', 'admin'), async (req, res) => {
  try {
    const today = getTodayString();
    await pool.query('DELETE FROM presenter_rotation WHERE scheduled_date >= ? AND status = "upcoming"', [today]);
    await autoAdvanceRotation();
    res.json({ success: true, message: 'Presenter rotation schedule successfully recalculated based on punch-in history.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = { router, autoAdvanceRotation };
