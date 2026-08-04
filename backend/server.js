const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initDB } = require('./config/db');
const { startScheduler } = require('./services/scheduler');

// Routes
const authRoutes = require('./routes/auth');
const sessionsRoutes = require('./routes/sessions');
const { router: rotationRoutes } = require('./routes/rotation');
const submissionsRoutes = require('./routes/submissions');
const documentsRoutes = require('./routes/documents');
const sessionReportsRoutes = require('./routes/sessionReports');
const attendanceRoutes = require('./routes/attendance');
const toolCatalogRoutes = require('./routes/toolCatalog');
const knowledgeBaseRoutes = require('./routes/knowledgeBase');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');
const impactRoutes = require('./routes/impact');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173').split(',').map((origin) => origin.trim());

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, origin);
    }
    return callback(null, origin);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/rotation', rotationRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/session-reports', sessionReportsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tool-catalog', toolCatalogRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/impact', impactRoutes);

// Root endpoint for public access confirmation
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'KAST Backend is running. Use /api/* routes for API access.',
    apiBase: '/api',
    health: '/api/health'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: { status: 'healthy', app: 'Kambaa AI Knowledge Sharing Tracker (KAST)', timestamp: new Date() },
    message: 'Backend server is running smoothly.'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

async function initializeBackend() {
  await initDB();
  if (!process.env.VERCEL) {
    startScheduler();
  }
}

initializeBackend().catch((err) => {
  console.error('Backend initialization failed:', err);
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 KAST Backend REST API active on http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}
