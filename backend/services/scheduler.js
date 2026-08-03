const cron = require('node-cron');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { sendInternPresenterReminderEmail, sendSeniorReviewerReminderEmail } = require('./emailService');

// Helper to format date as YYYY-MM-DD (local time)
function getTodayString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function generateDailyQRToken(sessionDate) {
  try {
    const targetDate = sessionDate || getTodayString();
    const token = crypto.randomBytes(16).toString('hex');
    const [existing] = await pool.query('SELECT id FROM sessions WHERE session_date = ?', [targetDate]);

    if (existing.length > 0) {
      await pool.query(
        'UPDATE sessions SET qr_token = ?, qr_generated_at = NOW(), status = IF(status="scheduled", "live", status) WHERE session_date = ?',
        [token, targetDate]
      );
    } else {
      await pool.query(
        'INSERT INTO sessions (session_date, qr_token, qr_generated_at, status) VALUES (?, ?, NOW(), "live")',
        [targetDate, token]
      );
    }
    console.log(`[Cron 09:00] Generated QR Token for session ${targetDate}: ${token}`);
    return token;
  } catch (err) {
    console.error('Error generating daily QR token:', err.message);
  }
}

async function check8amPresenterSubmission() {
  try {
    const today = getTodayString();
    const [sessions] = await pool.query(
      `SELECT s.id, s.presenter_id, u.name as presenter_name, u.email 
       FROM sessions s 
       LEFT JOIN users u ON s.presenter_id = u.id 
       WHERE s.session_date = ?`, [today]
    );

    if (sessions.length > 0 && sessions[0].presenter_id) {
      const sessionId = sessions[0].id;
      const presenterId = sessions[0].presenter_id;
      const [submissions] = await pool.query(
        'SELECT id FROM tool_submissions WHERE session_id = ? AND intern_id = ? AND status IN ("submitted","reviewed")',
        [sessionId, presenterId]
      );

      if (submissions.length === 0) {
        await pool.query(
          'INSERT INTO notifications (user_id, type, message) VALUES (?, "urgent_remind", "URGENT: Your tool research submission for today\'s 9:00 AM session is pending!")',
          [presenterId]
        );

        const [owners] = await pool.query('SELECT id FROM users WHERE role = "program_owner" AND is_active = TRUE');
        for (const owner of owners) {
          await pool.query(
            'INSERT INTO notifications (user_id, type, message) VALUES (?, "escalation", ?)',
            [owner.id, `ESCALATION: Presenter ${sessions[0].presenter_name || 'Intern #' + presenterId} has not submitted research by 8:00 AM for today's session.`]
          );
        }
        console.log(`[Cron 08:00] Sent alert & escalation for missing submission today.`);
      }
    }
  } catch (err) {
    console.error('Error in 08:00 cron check:', err.message);
  }
}

async function check830ReviewerConfirmation() {
  try {
    const today = getTodayString();
    const [rotations] = await pool.query(
      `SELECT r.id, r.reviewer_id, r.confirmed, u.name as reviewer_name 
       FROM reviewer_rotation r 
       JOIN users u ON r.reviewer_id = u.id 
       WHERE r.scheduled_date = ?`, [today]
    );

    if (rotations.length > 0 && !rotations[0].confirmed) {
      const reviewerName = rotations[0].reviewer_name;
      const [owners] = await pool.query('SELECT id FROM users WHERE role = "program_owner" AND is_active = TRUE');
      for (const owner of owners) {
        await pool.query(
          'INSERT INTO notifications (user_id, type, message) VALUES (?, "escalation", ?)',
          [owner.id, `ESCALATION: Senior Reviewer ${reviewerName} has not confirmed attendance for today's 9:00 AM session.`]
        );
      }
      console.log(`[Cron 08:30] Sent escalation for unconfirmed reviewer.`);
    }
  } catch (err) {
    console.error('Error in 08:30 cron check:', err.message);
  }
}

async function check935ReportFilingNudge() {
  try {
    const today = getTodayString();
    const [sessions] = await pool.query(
      `SELECT s.id, s.reviewer_id 
       FROM sessions s 
       WHERE s.session_date = ?`, [today]
    );

    if (sessions.length > 0) {
      const sessionId = sessions[0].id;
      const reviewerId = sessions[0].reviewer_id;
      const [reports] = await pool.query('SELECT id FROM session_reports WHERE session_id = ?', [sessionId]);

      if (reports.length === 0 && reviewerId) {
        await pool.query(
          'INSERT INTO notifications (user_id, type, message) VALUES (?, "nudge", "NUDGE: Today\'s session ended at 9:30 AM. Please submit your Senior Reviewer Session Report now.")',
          [reviewerId]
        );

        await pool.query('UPDATE sessions SET status = "completed" WHERE id = ?', [sessionId]);
        console.log(`[Cron 09:35] Nudge notification sent to Senior Reviewer.`);
      }
    }
  } catch (err) {
    console.error('Error in 09:35 cron check:', err.message);
  }
}

/**
 * Day-Before Email & In-App Notification Dispatcher (Triggered daily at 10:00/19:00 or manually)
 */
async function send1800EveningReminders(targetDateString) {
  try {
    // Lazy require autoAdvanceRotation to avoid circular module dependency
    const { autoAdvanceRotation } = require('../routes/rotation');
    if (typeof autoAdvanceRotation === 'function') {
      await autoAdvanceRotation();
    }

    const tomorrow = targetDateString || getTodayString(1);
    let presenterName = 'Assigned Intern';
    let dispatchedCount = 0;
    const errors = [];
    const details = [];

    // 1. Remind intern presenter
    const [presenters] = await pool.query(
      `SELECT s.presenter_id, u.name, u.email 
       FROM sessions s 
       JOIN users u ON s.presenter_id = u.id 
       WHERE s.session_date = ?`, [tomorrow]
    );

    let presenterTarget = null;
    if (presenters.length > 0 && presenters[0].email) {
      presenterTarget = presenters[0];
    } else {
      // Fallback check presenter rotation table
      const [rotPresenters] = await pool.query(
        `SELECT pr.intern_id as presenter_id, u.name, u.email 
         FROM presenter_rotation pr 
         JOIN users u ON pr.intern_id = u.id 
         WHERE pr.scheduled_date = ?`, [tomorrow]
      );
      if (rotPresenters.length > 0 && rotPresenters[0].email) {
        presenterTarget = rotPresenters[0];
      }
    }

    if (presenterTarget) {
      presenterName = presenterTarget.name;
      const res = await sendInternPresenterReminderEmail({
        toEmail: presenterTarget.email,
        internName: presenterTarget.name,
        sessionDate: tomorrow
      });

      if (res.success) {
        await pool.query(
          'INSERT INTO notifications (user_id, type, message) VALUES (?, "reminder", ?)',
          [presenterTarget.presenter_id, `REMINDER EMAIL SENT: You are scheduled to present at tomorrow's 9:00 AM session (${tomorrow}). Prepare slides & submit via Tool Submission prior to 8:00 AM.`]
        );
        dispatchedCount++;
        details.push(`Presenter email dispatched to ${presenterTarget.name} (${presenterTarget.email})`);
      } else {
        errors.push(`Failed to send email to Presenter ${presenterTarget.name} (${presenterTarget.email}): ${res.error || 'SMTP Error'}`);
      }
    } else {
      details.push(`No rotational presenter scheduled for ${tomorrow}.`);
    }

    // 2. Remind Senior Reviewer
    const [reviewers] = await pool.query(
      `SELECT s.reviewer_id, u.name, u.email 
       FROM sessions s 
       JOIN users u ON s.reviewer_id = u.id 
       WHERE s.session_date = ?`, [tomorrow]
    );

    let reviewerTarget = null;
    if (reviewers.length > 0 && reviewers[0].email) {
      reviewerTarget = reviewers[0];
    } else {
      // Fallback check reviewer rotation table
      const [rotReviewers] = await pool.query(
        `SELECT rr.reviewer_id, u.name, u.email 
         FROM reviewer_rotation rr 
         JOIN users u ON rr.reviewer_id = u.id 
         WHERE rr.scheduled_date = ?`, [tomorrow]
      );
      if (rotReviewers.length > 0 && rotReviewers[0].email) {
        reviewerTarget = rotReviewers[0];
      }
    }

    if (reviewerTarget) {
      const res = await sendSeniorReviewerReminderEmail({
        toEmail: reviewerTarget.email,
        reviewerName: reviewerTarget.name,
        presenterName: presenterName,
        sessionDate: tomorrow
      });

      if (res.success) {
        await pool.query(
          'INSERT INTO notifications (user_id, type, message) VALUES (?, "reminder", ?)',
          [reviewerTarget.reviewer_id, `REMINDER EMAIL SENT: You are assigned as Senior Reviewer for tomorrow's 9:00 AM AI Knowledge Session (${tomorrow}).`]
        );
        dispatchedCount++;
        details.push(`Reviewer email dispatched to ${reviewerTarget.name} (${reviewerTarget.email})`);
      } else {
        errors.push(`Failed to send email to Senior Reviewer ${reviewerTarget.name} (${reviewerTarget.email}): ${res.error || 'SMTP Error'}`);
      }
    } else {
      details.push(`No senior reviewer scheduled for ${tomorrow}.`);
    }

    console.log(`[Cron Reminder] Day-before reminder emails processed for ${tomorrow}. Total dispatched: ${dispatchedCount}`);
    return {
      success: errors.length === 0,
      count: dispatchedCount,
      targetDate: tomorrow,
      details,
      errors: errors.length > 0 ? errors : null
    };
  } catch (err) {
    console.error('Error in email reminder check:', err.message);
    throw err;
  }
}

function startScheduler() {
  // 08:00 AM - Check presenter submission deadline
  cron.schedule('0 8 * * *', () => check8amPresenterSubmission());

  // 08:30 AM - Check reviewer attendance confirmation
  cron.schedule('30 8 * * *', () => check830ReviewerConfirmation());

  // 09:00 AM - Generate daily QR Token
  cron.schedule('0 9 * * *', () => generateDailyQRToken());

  // 09:35 AM - Nudge Senior Reviewer for session report filing
  cron.schedule('35 9 * * *', () => check935ReportFilingNudge());

  // 10:00 AM - Morning Automatic Email Reminder for Next Day Presenter & Reviewer
  cron.schedule('0 10 * * *', () => {
    console.log('[Cron 10:00 AM] Dispatching morning day-before email reminders...');
    send1800EveningReminders();
  });

  // 07:00 PM (19:00) - Evening Automatic Email Reminder for Next Day Presenter & Reviewer
  cron.schedule('0 19 * * *', () => {
    console.log('[Cron 07:00 PM] Dispatching evening day-before email reminders...');
    send1800EveningReminders();
  });

  console.log('KAST Automation Scheduler active: Automated email reminders scheduled for 10:00 AM and 7:00 PM daily.');
}

module.exports = {
  startScheduler,
  generateDailyQRToken,
  check8amPresenterSubmission,
  check830ReviewerConfirmation,
  check935ReportFilingNudge,
  send1800EveningReminders
};
