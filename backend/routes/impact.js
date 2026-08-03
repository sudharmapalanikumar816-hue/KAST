const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/impact
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT it.*, 
              ts.tool_name, ts.category, ts.description,
              u.name as intern_name,
              up.name as updated_by_name
       FROM tool_submissions ts
       JOIN users u ON ts.intern_id = u.id
       LEFT JOIN impact_tracking it ON it.submission_id = ts.id
       LEFT JOIN users up ON it.updated_by = up.id
       ORDER BY ts.submitted_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/impact
router.post('/', authenticateToken, requireRole('admin', 'program_owner', 'senior_reviewer'), async (req, res) => {
  try {
    const { submissionId, adopted, adoptedProject, impactNotes, impactRating } = req.body;
    if (!submissionId) {
      return res.status(400).json({ success: false, message: 'submissionId is required.' });
    }

    const [existing] = await pool.query('SELECT id FROM impact_tracking WHERE submission_id = ?', [submissionId]);

    if (existing.length > 0) {
      await pool.query(
        `UPDATE impact_tracking SET
           adopted = ?, adopted_project = ?, impact_notes = ?, impact_rating = ?, updated_by = ?, updated_at = NOW()
         WHERE id = ?`,
        [adopted ? true : false, adoptedProject, impactNotes, impactRating || 5, req.user.id, existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO impact_tracking (submission_id, adopted, adopted_project, impact_notes, impact_rating, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [submissionId, adopted ? true : false, adoptedProject, impactNotes, impactRating || 5, req.user.id]
      );
    }

    // Award bonus points to intern if tool got adopted
    if (adopted) {
      const [subs] = await pool.query('SELECT intern_id FROM tool_submissions WHERE id = ?', [submissionId]);
      if (subs.length > 0) {
        await pool.query(
          'INSERT INTO badges (user_id, badge_name, points) VALUES (?, "Production Tool Adopted!", 100)',
          [subs[0].intern_id]
        );
      }
    }

    res.json({ success: true, message: 'Impact tracking record updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
