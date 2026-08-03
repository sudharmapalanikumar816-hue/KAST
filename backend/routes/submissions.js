const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { generateUseCases, checkDuplicate, generateToolSummary } = require('../services/aiService');

// GET /api/submissions (Supports query params: ?internId=X or ?allInterns=true)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { internId } = req.query;

    let sql = `
      SELECT ts.*, s.session_date, u.name as intern_name, u.email as intern_email, u.department
      FROM tool_submissions ts
      JOIN sessions s ON ts.session_id = s.id
      JOIN users u ON ts.intern_id = u.id
    `;
    const params = [];

    if (internId) {
      sql += ` WHERE ts.intern_id = ?`;
      params.push(internId);
    }

    sql += ` ORDER BY s.session_date DESC, ts.submitted_at DESC`;

    const [rows] = await pool.query(sql, params);

    for (const sub of rows) {
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

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/submissions/generate-summary (AI Summary Generator)
router.post('/generate-summary', authenticateToken, async (req, res) => {
  try {
    const { toolName, presentationNotes, description } = req.body;
    if (!toolName) {
      return res.status(400).json({ success: false, message: 'Tool name is required.' });
    }

    const summary = await generateToolSummary(toolName, presentationNotes || description || '');
    res.json({ success: true, data: { summary } });
  } catch (err) {
    console.error('Error generating AI summary:', err);
    res.status(500).json({ success: false, message: 'Failed to generate AI summary.' });
  }
});

// GET /api/submissions/my-submissions (Logged-in Intern's submissions)
router.get('/my-submissions', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ts.*, s.session_date, u.name as intern_name, u.email as intern_email
       FROM tool_submissions ts
       JOIN sessions s ON ts.session_id = s.id
       JOIN users u ON ts.intern_id = u.id
       WHERE ts.intern_id = ?
       ORDER BY s.session_date DESC, ts.submitted_at DESC`,
      [req.user.id]
    );

    for (const sub of rows) {
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

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/submissions/all (All Interns' submitted AI tools for directory)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ts.*, s.session_date, u.name as intern_name, u.email as intern_email, u.department
       FROM tool_submissions ts
       JOIN sessions s ON ts.session_id = s.id
       JOIN users u ON ts.intern_id = u.id
       ORDER BY s.session_date DESC, ts.submitted_at DESC`
    );

    for (const sub of rows) {
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

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/submissions & POST /api/submissions/create (Submit tool research & presentation notes)
const handleCreateSubmission = async (req, res) => {
  try {
    let {
      sessionId,
      toolName,
      sourceUrl,
      category,
      description,
      presentationNotes,
      useCases,
      aiGeneratedValue,
      pocRepoUrl,
      demoUrl
    } = req.body;

    if (!toolName) {
      return res.status(400).json({ success: false, message: 'Tool Name is required.' });
    }

    // Auto-create or fetch today's session if sessionId was not provided
    if (!sessionId) {
      const today = new Date().toISOString().split('T')[0];
      const [existingSess] = await pool.query('SELECT id FROM sessions WHERE session_date = ?', [today]);
      if (existingSess.length > 0) {
        sessionId = existingSess[0].id;
      } else {
        const [newSess] = await pool.query(
          `INSERT INTO sessions (session_date, presenter_id, status) VALUES (?, ?, 'scheduled')`,
          [today, req.user.id]
        );
        sessionId = newSess.insertId;
      }
    }

    const useCasesJson = useCases ? JSON.stringify(useCases) : null;

    // Check if user already has a submission for this session, and update or insert
    const [existingSub] = await pool.query(
      'SELECT id FROM tool_submissions WHERE session_id = ? AND intern_id = ?',
      [sessionId, req.user.id]
    );

    let submissionId;
    if (existingSub.length > 0) {
      submissionId = existingSub[0].id;
      await pool.query(
        `UPDATE tool_submissions 
         SET tool_name = ?, source_url = ?, category = ?, description = ?, presentation_notes = ?, use_cases = ?, ai_generated_value = ?, poc_repo_url = ?, demo_url = ?, status = 'submitted', submitted_at = NOW()
         WHERE id = ?`,
        [
          toolName,
          sourceUrl || null,
          category || 'AI Tool',
          description || null,
          presentationNotes || null,
          useCasesJson,
          aiGeneratedValue || null,
          pocRepoUrl || null,
          demoUrl || null,
          submissionId
        ]
      );
    } else {
      const [result] = await pool.query(
        `INSERT INTO tool_submissions 
         (session_id, intern_id, tool_name, source_url, category, description, presentation_notes, use_cases, ai_generated_value, poc_repo_url, demo_url, status, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', NOW())`,
        [
          sessionId,
          req.user.id,
          toolName,
          sourceUrl || null,
          category || 'AI Tool',
          description || null,
          presentationNotes || null,
          useCasesJson,
          aiGeneratedValue || null,
          pocRepoUrl || null,
          demoUrl || null
        ]
      );
      submissionId = result.insertId;
    }

    // Check duplicate catalog entry or add
    const [existingCat] = await pool.query('SELECT id FROM tool_catalog WHERE LOWER(tool_name) = LOWER(?)', [toolName]);
    if (existingCat.length === 0) {
      await pool.query(
        `INSERT INTO tool_catalog (tool_name, category, first_presented_by, first_presented_date, times_presented, embedding_summary)
         VALUES (?, ?, ?, CURDATE(), 1, ?)`,
        [toolName, category || 'AI Tool', req.user.id, description || toolName]
      );
    } else {
      await pool.query('UPDATE tool_catalog SET times_presented = times_presented + 1 WHERE id = ?', [existingCat[0].id]);
    }

    res.status(201).json({
      success: true,
      message: 'Tool presentation submitted successfully!',
      data: { id: submissionId, submissionId }
    });
  } catch (err) {
    console.error('Error submitting tool research:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

router.post('/', authenticateToken, handleCreateSubmission);
router.post('/create', authenticateToken, handleCreateSubmission);

// GET /api/submissions/:id (Fetch single tool submission by ID)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ts.*, s.session_date, u.name as intern_name, u.email as intern_email, u.department
       FROM tool_submissions ts
       JOIN sessions s ON ts.session_id = s.id
       JOIN users u ON ts.intern_id = u.id
       WHERE ts.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    const sub = rows[0];
    const [docs] = await pool.query('SELECT * FROM documents WHERE submission_id = ?', [sub.id]);
    sub.documents = docs;
    if (typeof sub.use_cases === 'string') {
      try {
        sub.use_cases = JSON.parse(sub.use_cases);
      } catch (e) {
        sub.use_cases = [];
      }
    }

    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/submissions/:id (Update tool submission - owner intern or admin)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const subId = req.params.id;

    const [existing] = await pool.query('SELECT * FROM tool_submissions WHERE id = ?', [subId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    const sub = existing[0];
    if (req.user.role === 'intern' && sub.intern_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized. You can only edit your own tool submissions.' });
    }

    const {
      toolName,
      sourceUrl,
      category,
      description,
      presentationNotes,
      useCases,
      aiGeneratedValue,
      pocRepoUrl,
      demoUrl
    } = req.body;

    const useCasesJson = useCases ? JSON.stringify(useCases) : null;

    await pool.query(
      `UPDATE tool_submissions 
       SET tool_name = ?, source_url = ?, category = ?, description = ?, presentation_notes = ?, use_cases = ?, ai_generated_value = ?, poc_repo_url = ?, demo_url = ?, submitted_at = NOW()
       WHERE id = ?`,
      [
        toolName || sub.tool_name,
        sourceUrl !== undefined ? sourceUrl : sub.source_url,
        category || sub.category || 'AI Tool',
        description !== undefined ? description : sub.description,
        presentationNotes !== undefined ? presentationNotes : sub.presentation_notes,
        useCasesJson,
        aiGeneratedValue !== undefined ? aiGeneratedValue : sub.ai_generated_value,
        pocRepoUrl !== undefined ? pocRepoUrl : sub.poc_repo_url,
        demoUrl !== undefined ? demoUrl : sub.demo_url,
        subId
      ]
    );

    res.json({ success: true, message: 'Tool submission updated successfully!', data: { id: subId } });
  } catch (err) {
    console.error('Error updating tool submission:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/submissions/:id (Delete tool submission - owner intern or admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const subId = req.params.id;

    const [existing] = await pool.query('SELECT * FROM tool_submissions WHERE id = ?', [subId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    const sub = existing[0];
    if (req.user.role === 'intern' && sub.intern_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized. You can only delete your own tool submissions.' });
    }

    await pool.query('DELETE FROM documents WHERE submission_id = ?', [subId]);
    await pool.query('DELETE FROM impact_tracking WHERE submission_id = ?', [subId]);
    await pool.query('DELETE FROM tool_submissions WHERE id = ?', [subId]);

    res.json({ success: true, message: 'Tool submission deleted successfully.' });
  } catch (err) {
    console.error('Error deleting submission:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
