const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// POST /api/documents/upload
router.post('/upload', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { submissionId } = req.body;
    if (!submissionId) {
      return res.status(400).json({ success: false, message: 'submissionId is required.' });
    }

    const relativePath = `/uploads/${req.file.filename}`;
    const [result] = await pool.query(
      'INSERT INTO documents (submission_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)',
      [submissionId, req.file.originalname, relativePath, req.file.mimetype]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        submissionId,
        fileName: req.file.originalname,
        filePath: relativePath,
        fileType: req.file.mimetype
      },
      message: 'File uploaded successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/documents/:submissionId
router.get('/:submissionId', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM documents WHERE submission_id = ?', [req.params.submissionId]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [docs] = await pool.query('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const doc = docs[0];
    const fullPath = path.join(__dirname, '..', doc.file_path);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await pool.query('DELETE FROM documents WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
