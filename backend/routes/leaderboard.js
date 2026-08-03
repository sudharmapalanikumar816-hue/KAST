const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/leaderboard
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department,
              COALESCE(SUM(b.points), 0) as total_points,
              COUNT(DISTINCT ts.id) as total_presentations,
              COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END) as on_time_count
       FROM users u
       LEFT JOIN badges b ON u.id = b.user_id
       LEFT JOIN tool_submissions ts ON u.id = ts.intern_id AND ts.status = 'reviewed'
       LEFT JOIN attendance a ON u.id = a.user_id
       WHERE u.is_active = TRUE
       GROUP BY u.id
       ORDER BY total_points DESC, total_presentations DESC`
    );

    // Calculate streak (dummy or consecutive present calculation)
    const leaderboard = rows.map((user, idx) => ({
      rank: idx + 1,
      ...user,
      streak: Math.min(12, user.on_time_count + user.total_presentations * 2) // streak formula
    }));

    res.json({ success: true, data: leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/leaderboard/certificate
router.get('/certificate', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.name, u.department, COALESCE(SUM(b.points), 0) as total_points
       FROM users u
       LEFT JOIN badges b ON u.id = b.user_id
       WHERE u.id = ?
       GROUP BY u.id`, [req.user.id]
    );

    const userName = users.length > 0 ? users[0].name : req.user.name;
    const totalPoints = users.length > 0 ? users[0].total_points : 100;

    const doc = new PDFDocument({ layout: 'landscape', size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=KAST_Certificate_${userName.replace(/\s+/g, '_')}.pdf`);

    doc.pipe(res);

    // Render Certificate PDF design
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).strokeColor('#4F46E5').lineWidth(4).stroke();
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).strokeColor('#818CF8').lineWidth(1).stroke();

    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(28).fillColor('#1E1B4B').text('KAMBAA AI KNOWLEDGE SHARING TRACKER', { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(14).fillColor('#6B7280').text('Certificate of Excellence & Innovation', { align: 'center' });

    doc.moveDown(2);
    doc.font('Helvetica').fontSize(16).fillColor('#374151').text('This is proudly awarded to', { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(32).fillColor('#4F46E5').text(userName.toUpperCase(), { align: 'center' });

    doc.moveDown(1);
    doc.font('Helvetica').fontSize(14).fillColor('#4B5563').text(
      `For outstanding participation, research excellence, and active contribution to Kambaa's daily AI Knowledge Sharing sessions with an earned total of ${totalPoints} innovation points.`,
      { align: 'center', width: 600 }
    );

    doc.moveDown(3);
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    doc.fontSize(12).fillColor('#6B7280').text(`Date Awarded: ${dateStr}`, 100, 480);
    doc.fontSize(12).fillColor('#6B7280').text('Kambaa AI Program Owner', 550, 480);

    doc.end();
  } catch (err) {
    console.error('Certificate generation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
