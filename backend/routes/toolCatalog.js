const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/tool-catalog
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, search } = req.query;
    let sql = `
      SELECT tc.*, u.name as first_presenter_name
      FROM tool_catalog tc
      LEFT JOIN users u ON tc.first_presented_by = u.id
    `;
    const params = [];
    const conds = [];

    if (category) {
      conds.push('tc.category = ?');
      params.push(category);
    }
    if (search) {
      conds.push('(tc.tool_name LIKE ? OR tc.embedding_summary LIKE ? OR tc.category LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (conds.length > 0) {
      sql += ' WHERE ' + conds.join(' AND ');
    }
    sql += ' ORDER BY tc.times_presented DESC, tc.tool_name ASC';

    const [rows] = await pool.query(sql, params);

    // Get list of distinct categories for filters
    const [categories] = await pool.query('SELECT DISTINCT category FROM tool_catalog WHERE category IS NOT NULL');

    res.json({
      success: true,
      data: {
        tools: rows,
        categories: categories.map(c => c.category)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tool-catalog/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [tools] = await pool.query(
      `SELECT tc.*, u.name as first_presenter_name
       FROM tool_catalog tc
       LEFT JOIN users u ON tc.first_presented_by = u.id
       WHERE tc.id = ?`, [req.params.id]
    );

    if (tools.length === 0) {
      return res.status(404).json({ success: false, message: 'Tool not found in catalog.' });
    }

    const tool = tools[0];

    // Find all submissions for this tool
    const [submissions] = await pool.query(
      `SELECT ts.*, u.name as intern_name, s.session_date
       FROM tool_submissions ts
       JOIN users u ON ts.intern_id = u.id
       JOIN sessions s ON ts.session_id = s.id
       WHERE LOWER(ts.tool_name) = LOWER(?)
       ORDER BY s.session_date DESC`, [tool.tool_name]
    );

    res.json({
      success: true,
      data: {
        tool,
        submissions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
