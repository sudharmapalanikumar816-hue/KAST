let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

require('dotenv').config();

/**
 * Get or create Nodemailer Transporter based on current process.env configuration
 */
function getTransporter() {
  if (!nodemailer) {
    console.warn('[Email Service] Nodemailer package is not available.');
    return null;
  }

  const smtpUser = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : null;
  const smtpPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.trim() : null;

  if (!smtpUser || !smtpPass) {
    console.warn('[Email Service] SMTP credentials (SMTP_USER/SMTP_PASS) not configured in .env. Falling back to console log simulation.');
    return null;
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Format 'From' header string cleanly
 */
function getFromEmailAddress() {
  const smtpUser = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : 'noreply@kambaa.com';
  const rawFrom = (process.env.EMAIL_FROM || process.env.FROM_EMAIL || '').trim();

  if (!rawFrom) {
    return `"KAST System" <${smtpUser}>`;
  }

  if (rawFrom.includes('<') && rawFrom.includes('>')) {
    return rawFrom;
  }

  return `"${rawFrom.replace(/"/g, '')}" <${smtpUser}>`;
}

/**
 * Verify SMTP Connection
 */
async function verifySmtpConnection() {
  const transporter = getTransporter();
  if (!transporter) {
    return { success: false, message: 'SMTP credentials missing or nodemailer unavailable. Simulated logging active.' };
  }
  try {
    await transporter.verify();
    console.log('[Email Service] SMTP connection verified successfully!');
    return { success: true, message: 'SMTP connection verified successfully.' };
  } catch (err) {
    console.error('[Email Service] SMTP Verification failed:', err.message);
    return { success: false, message: err.message };
  }
}

/**
 * Send Day-Before Email Reminder to Scheduled Intern Presenter
 */
async function sendInternPresenterReminderEmail({ toEmail, internName, sessionDate }) {
  const subject = `[KAST Reminder] You are scheduled to present tomorrow at 9:00 AM (${sessionDate})`;
  
  const textContent = `
Dear ${internName},

This is a reminder that you are scheduled to present at tomorrow's daily Kambaa AI Knowledge Sharing Session on ${sessionDate} from 9:00 AM to 9:30 AM.

PREPARATION CHECKLIST:
1. Research & Slides: Prepare your PPT slides / PDF presentation explaining the AI tool capabilities.
2. Kambaa Use Cases: Prepare 2-3 practical business use cases tailored for Kambaa projects.
3. Proof-of-Concept: Prepare your POC code repository or live demo links.
4. Tool Submission Deadline: Upload your research materials via the "Tool Submission" tab in KAST BEFORE 8:00 AM tomorrow morning.
5. Session Attendance: Be present in the session room before 9:00 AM and scan the QR code on your phone before 9:05 AM for on-time attendance.

Good luck with your presentation!

Best regards,
Kambaa AI Knowledge Tracker (KAST) System
  `.trim();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%); padding: 20px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 1.3rem;">📢 KAST Presenter Reminder</h2>
        <p style="margin: 4px 0 0 0; font-size: 0.88rem; opacity: 0.9;">Scheduled for Tomorrow: ${sessionDate} at 9:00 AM</p>
      </div>

      <div style="padding: 24px;">
        <p>Dear <strong>${internName}</strong>,</p>
        <p>This is a reminder that you are scheduled to present at tomorrow's daily Kambaa AI Knowledge Sharing Session on <strong>${sessionDate}</strong> from <strong>9:00 AM – 9:30 AM</strong>.</p>
        
        <div style="background: #eef2ff; border-left: 4px solid #4338ca; padding: 16px; margin: 20px 0; border-radius: 6px;">
          <h4 style="margin: 0 0 10px 0; color: #3730a3;">📋 Mandatory Preparation Checklist:</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem; line-height: 1.6; color: #334155;">
            <li><strong>Tool Submission (Before 8:00 AM):</strong> Upload your PPT slides, research docs, and POC repository link via the <em>Tool Submission</em> tab.</li>
            <li><strong>Kambaa Use Cases:</strong> Outline 2–3 practical business use cases applicable to Kambaa engineering projects.</li>
            <li><strong>Physical Attendance:</strong> Be present in the session room before 9:00 AM and scan the room QR code on your phone before 9:05 AM.</li>
          </ul>
        </div>

        <p style="font-size: 0.9rem; color: #475569;">Best of luck with your presentation!</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 0.78rem; color: #94a3b8; margin: 0;">Kambaa AI Knowledge Tracker (KAST) Automated Notification System</p>
      </div>
    </div>
  `;

  const transporter = getTransporter();
  const fromEmail = getFromEmailAddress();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromEmail,
        to: toEmail,
        subject: subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`[Email Service] Presenter reminder sent to ${toEmail} via SMTP | ID: ${info.messageId}`);
      return { success: true, sentViaSmtp: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Service] Nodemailer SMTP send error for ${toEmail}:`, err.message);
      return { success: false, sentViaSmtp: true, error: err.message };
    }
  }

  console.log(`=======================================================`);
  console.log(`📧 [EMAIL SERVICE - CONSOLE FALLBACK] DISPATCHING DAY-BEFORE PRESENTER EMAIL`);
  console.log(`TO: ${toEmail} (${internName})`);
  console.log(`SUBJECT: ${subject}`);
  console.log(textContent);
  console.log(`=======================================================`);
  return { success: true, sentViaSmtp: false, note: 'Dispatched via console logging (SMTP credentials not provided).' };
}

/**
 * Send Day-Before Email Reminder & Invitation to Duty Senior Reviewer
 */
async function sendSeniorReviewerReminderEmail({ toEmail, reviewerName, presenterName, sessionDate }) {
  const subject = `[KAST Invitation Reminder] Senior Reviewer Duty for Tomorrow's 9:00 AM AI Session (${sessionDate})`;
  
  const textContent = `
Dear ${reviewerName},

This is a reminder that you are assigned as the Senior Reviewer / Duty Monitor for tomorrow's daily Kambaa AI Knowledge Sharing Session on ${sessionDate} from 9:00 AM to 9:30 AM.

SESSION OVERVIEW:
- Date & Time: Tomorrow, ${sessionDate} | 9:00 AM - 9:30 AM
- Scheduled Presenter: ${presenterName || 'Assigned Intern'}
- Location: Physical Session Room

DUTY MONITOR RESPONSIBILITIES:
1. Attend and monitor the 30-minute intern research presentation.
2. Confirm your duty attendance in the Senior Reviewer Portal.
3. File your evaluation session report (quality rating 1–5 stars, technical feedback, and attendance observations) following session conclusion.

Thank you for mentoring and guiding Kambaa's AI knowledge sharing initiative.

Best regards,
Kambaa AI Knowledge Tracker (KAST) Management
  `.trim();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 20px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 1.3rem;">👨‍🏫 Senior Reviewer Duty Reminder</h2>
        <p style="margin: 4px 0 0 0; font-size: 0.88rem; opacity: 0.9;">Tomorrow's AI Knowledge Session: ${sessionDate} at 9:00 AM</p>
      </div>

      <div style="padding: 24px;">
        <p>Dear <strong>${reviewerName}</strong>,</p>
        <p>This is a reminder that you are assigned as the Senior Reviewer & Duty Monitor for tomorrow's daily Kambaa AI Knowledge Sharing Session on <strong>${sessionDate}</strong> (9:00 AM – 9:30 AM).</p>
        
        <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 20px 0; border-radius: 6px;">
          <h4 style="margin: 0 0 10px 0; color: #065f46;">📌 Session Summary & Duty Overview:</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem; line-height: 1.6; color: #166534;">
            <li><strong>Scheduled Presenter:</strong> ${presenterName || 'Assigned Rotational Intern'}</li>
            <li><strong>Session Window:</strong> Tomorrow, ${sessionDate} | 9:00 AM – 9:30 AM</li>
            <li><strong>Evaluation Report:</strong> File your evaluation report (1–5 quality stars, technical review summary, and flags) in the Senior Reviewer Dashboard after 9:30 AM.</li>
          </ul>
        </div>

        <p style="font-size: 0.9rem; color: #475569;">Thank you for guiding Kambaa's engineering team and providing valuable review feedback.</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 0.78rem; color: #94a3b8; margin: 0;">Kambaa AI Knowledge Tracker (KAST) System</p>
      </div>
    </div>
  `;

  const transporter = getTransporter();
  const fromEmail = getFromEmailAddress();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromEmail,
        to: toEmail,
        subject: subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`[Email Service] Senior Reviewer reminder sent to ${toEmail} via SMTP | ID: ${info.messageId}`);
      return { success: true, sentViaSmtp: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Service] Nodemailer SMTP send error for ${toEmail}:`, err.message);
      return { success: false, sentViaSmtp: true, error: err.message };
    }
  }

  console.log(`=======================================================`);
  console.log(`📧 [EMAIL SERVICE - CONSOLE FALLBACK] DISPATCHING DAY-BEFORE REVIEWER EMAIL`);
  console.log(`TO: ${toEmail} (${reviewerName})`);
  console.log(`SUBJECT: ${subject}`);
  console.log(textContent);
  console.log(`=======================================================`);
  return { success: true, sentViaSmtp: false, note: 'Dispatched via console logging (SMTP credentials not provided).' };
}

module.exports = {
  sendInternPresenterReminderEmail,
  sendSeniorReviewerReminderEmail,
  verifySmtpConnection
};


