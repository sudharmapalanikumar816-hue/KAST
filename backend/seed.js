const bcrypt = require('bcryptjs');
const { pool, initDB } = require('./config/db');

async function seed() {
  console.log('Starting KAST Database Seeding...');
  await initDB();

  try {
    const salt = await bcrypt.genSalt(10);
    const internPasswordHash = await bcrypt.hash('12345678', salt);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);
    const adminPasswordHash = await bcrypt.hash('admin123', salt);

    const newInterns = [
      { name: 'Sudharma P', email: 'sudharma.p@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Sobika Thangaraj', email: 'Sobika.Thangaraj@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Santhosh Chinnasamy', email: 'Santhosh.Chinnasamy@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Aswin Christo', email: 'Aswin.Christo@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Saran Ravichandran', email: 'Saran.Ravichandran@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'DevopsTeam', email: 'DevopsTeam@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'DevOps' },
      { name: 'Mahavarshini M', email: 'mahavarshini.m@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Kamaleshwaran Kalyanakumar', email: 'Kamaleshwaran.K@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Umayaraj Kumar', email: 'Umayaraj.Kumar@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Venmathi Vetriselvan', email: 'Venmathi.Vetriselvan@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Vanmathi Kasi', email: 'Vanmathi.Kasi@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Varun Raj Ganesh', email: 'VarunRaj.Ganesh@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Santhiya A', email: 'Santhiya.A@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Yuvan Shankar Kannappan', email: 'YuvanShankar.Kannappan@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Pradeep Kumar Govinthasamy', email: 'PradeepKumar.Govinthasamy@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Navaneedha krishnan Arunachalam', email: 'Navaneedhakrishnan.A@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Sanjay Thirumal', email: 'Sanjay.Thirumal@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Neha Fathima', email: 'Neha.Fathima@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Dakshinesh Subramanian', email: 'Dakshinesh.Subramanian@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' },
      { name: 'Rishwanthan', email: 'rishwanthan@kambaa.in', password_hash: internPasswordHash, role: 'intern', department: 'Engineering' }
    ];

    const validInternEmails = newInterns.map(i => i.email);

    // 1. Remove all old/dummy interns not in the official new list
    await pool.query('DELETE FROM users WHERE role = "intern" AND email NOT IN (?)', [validInternEmails]);

    // 2. Seed Users
    const seniorReviewers = [
      { name: 'Praveen Kp', email: 'Praveen.kp@kambaa.in', password_hash: defaultPasswordHash, role: 'senior_reviewer', department: 'Architecture & AI', order_index: 1 },
      { name: 'Sibisiddharth G', email: 'Sibisiddharth.g@kambaa.in', password_hash: defaultPasswordHash, role: 'senior_reviewer', department: 'Engineering', order_index: 2 },
      { name: 'Subramanian N', email: 'Subramanian@kambaa.in', password_hash: defaultPasswordHash, role: 'senior_reviewer', department: 'Engineering', order_index: 3 },
      { name: 'Manojkumar BR', email: 'Manojkumar@kambaa.in', password_hash: defaultPasswordHash, role: 'senior_reviewer', department: 'Engineering', order_index: 4 },
      { name: 'Dhinakaran', email: 'dhinakaran@kambaa.in', password_hash: defaultPasswordHash, role: 'senior_reviewer', department: 'Engineering', order_index: 5 },
      { name: 'Kannan R', email: 'kannan@kambaa.in', password_hash: defaultPasswordHash, role: 'senior_reviewer', department: 'Engineering', order_index: 6 },
      { name: 'Vinoth Raj', email: 'vinoth@kambaa.in', password_hash: defaultPasswordHash, role: 'senior_reviewer', department: 'Engineering', order_index: 7 },
    ];

    const adminUsers = [
      { name: 'Admin User', email: 'admin@kambaa.com', password_hash: adminPasswordHash, role: 'admin', department: 'Management', order_index: 1 }
    ];

    const users = [...adminUsers, ...seniorReviewers, ...newInterns];

    for (const u of users) {
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, department, order_index) 
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = VALUES(role), department = VALUES(department), order_index = VALUES(order_index)`,
        [u.name, u.email, u.password_hash, u.role, u.department, u.order_index || 1]
      );
    }
    console.log('Users seeded successfully.');

    // Fetch user IDs
    const [userRows] = await pool.query('SELECT id, email, role FROM users');
    const userMap = {};
    userRows.forEach(u => userMap[u.email] = u.id);

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 3. Seed Presenter & Reviewer Rotations
    await pool.query('DELETE FROM presenter_rotation');
    await pool.query('DELETE FROM reviewer_rotation');

    // Add presenter rotation for all interns starting from TODAY
    for (let i = 0; i < newInterns.length; i++) {
      const internEmail = newInterns[i].email;
      const internId = userMap[internEmail];
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + i); // start from today
      const dateStr = dateObj.toISOString().split('T')[0];
      const status = 'upcoming';

      if (internId) {
        await pool.query(
          `INSERT INTO presenter_rotation (intern_id, scheduled_date, order_index, status) VALUES (?, ?, ?, ?)`,
          [internId, dateStr, i + 1, status]
        );
      }
    }

    await pool.query(
      `INSERT INTO reviewer_rotation (reviewer_id, scheduled_date, confirmed, confirmed_at) VALUES
       (?, ?, TRUE, NOW()),
       (?, ?, TRUE, NOW()),
       (?, ?, FALSE, NULL)`,
      [
        userMap['senior@kambaa.com'], yesterdayStr,
        userMap['senior@kambaa.com'], todayStr,
        userMap['reviewer2@kambaa.com'], tomorrowStr
      ]
    );

    // 4. Seed Sessions
    const p1 = userMap['sudharma.p@kambaa.in'];
    const p2 = userMap['Sobika.Thangaraj@kambaa.in'];

    await pool.query(
      `INSERT INTO sessions (session_date, start_time, end_time, presenter_id, reviewer_id, qr_token, qr_generated_at, status)
       VALUES (?, '09:00:00', '09:30:00', ?, ?, 'token_yesterday_123', NOW(), 'completed')
       ON DUPLICATE KEY UPDATE presenter_id = VALUES(presenter_id), status = 'completed'`,
      [yesterdayStr, p1, userMap['senior@kambaa.com']]
    );

    await pool.query(
      `INSERT INTO sessions (session_date, start_time, end_time, presenter_id, reviewer_id, qr_token, qr_generated_at, status)
       VALUES (?, '09:00:00', '09:30:00', ?, ?, 'kast_live_token_today_999', NOW(), 'live')
       ON DUPLICATE KEY UPDATE presenter_id = VALUES(presenter_id), status = 'live'`,
      [todayStr, p2, userMap['senior@kambaa.com']]
    );

    const [sessionRows] = await pool.query('SELECT id, session_date FROM sessions');
    const sessionMap = {};
    sessionRows.forEach(s => sessionMap[s.session_date] = s.id);

    // 5. Seed Tool Catalog & Submissions
    const catalogTools = [
      { tool_name: 'Claude 3.5 Sonnet Artifacts', category: 'LLM & Code Gen', email: 'sudharma.p@kambaa.in', date: yesterdayStr, summary: 'Interactive SVG, HTML components, and stateful React prototype generator.' },
      { tool_name: 'V0 by Vercel', category: 'Frontend Automation', email: 'Sobika.Thangaraj@kambaa.in', date: todayStr, summary: 'Generates polished Shadcn React Tailwind UI components from natural language.' },
      { tool_name: 'Superpowers Agentic CLI', category: 'Agentic Workflows', email: 'Santhosh.Chinnasamy@kambaa.in', date: tomorrowStr, summary: 'TDD-driven shell agent for workspace automation and commit validation.' }
    ];

    for (const ct of catalogTools) {
      await pool.query(
        `INSERT INTO tool_catalog (tool_name, category, first_presented_by, first_presented_date, times_presented, embedding_summary)
         VALUES (?, ?, ?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE category = VALUES(category), first_presented_by = VALUES(first_presented_by)`,
        [ct.tool_name, ct.category, userMap[ct.email], ct.date, ct.summary]
      );
    }

    // Today's Submission (Sudharma P)
    const [sub1Res] = await pool.query(
      `INSERT INTO tool_submissions 
       (session_id, intern_id, tool_name, source_url, category, description, use_cases, ai_generated_value, poc_repo_url, demo_url, status, submitted_at)
       VALUES (?, ?, 'Claude 3.5 Sonnet Artifacts', 'https://producthunt.com/ClaudeArtifacts', 'LLM & Code Gen',
       'Researched Anthropic Claude Artifacts feature for generating live React UI prototypes directly from prompt text.',
       ?,
       'Accelerates Kambaa client proposal mockups by 50%.',
       'https://github.com/kambaa-poc/claude-artifacts-demo', 'https://claude-demo.kambaa.app', 'submitted', NOW())`,
      [
        sessionMap[todayStr],
        userMap['sudharma.p@kambaa.in'],
        JSON.stringify([
          { title: "Rapid Client Prototyping", description: "Generate interactive React UI previews during initial discovery calls.", benefit: "Improves client deal conversion by 40%." },
          { title: "Internal Dashboard Micro-apps", description: "Spin up single-file tools for internal team operations.", benefit: "Saves 15 engineering hours weekly." }
        ])
      ]
    );

    // Tomorrow's Submission (Sobika Thangaraj)
    if (sessionMap[tomorrowStr]) {
      await pool.query(
        `INSERT INTO tool_submissions 
         (session_id, intern_id, tool_name, source_url, category, description, use_cases, ai_generated_value, poc_repo_url, demo_url, status, submitted_at)
         VALUES (?, ?, 'V0 by Vercel', 'https://v0.dev', 'Frontend Automation',
         'Built a live POC converting wireframe screenshots into clean React Tailwind code blocks with responsive layouts.',
         ?,
         'Provides structured UI starter templates for Kambaa web apps.',
         'https://github.com/kambaa-poc/v0-component-library', 'https://v0-demo.kambaa.app', 'submitted', NOW())`,
        [
          sessionMap[tomorrowStr],
          userMap['Sobika.Thangaraj@kambaa.in'],
          JSON.stringify([
            { title: "Design-to-Code Conversion", description: "Import designer Figma export images and generate functional React code.", benefit: "Cuts design handoff time in half." },
            { title: "Accessible Component Library", description: "Auto-generate WCAG accessible modal and table components.", benefit: "Ensures standard compliance across projects." }
          ])
        ]
      );
    }

    // 6. Seed Session Report for Yesterday
    await pool.query(
      `INSERT INTO session_reports 
       (session_id, reporter_id, tool_presented, presenter_id, session_summary, presentation_quality_rating, attendance_observation, flags, ai_draft_summary, submitted_at)
       VALUES (?, ?, 'Claude 3.5 Sonnet Artifacts', ?, 
       'Excellent session. Sudharma P demonstrated live rendering of a complex state machine chart using Claude Artifacts.',
       5, '100% physical attendance present by 9:00 AM.', 'None. Flawless live demo.', 
       'Sudharma P presented Claude 3.5 Sonnet Artifacts with high practical value for Kambaa client proposals.', NOW())`,
      [sessionMap[yesterdayStr], userMap['senior@kambaa.com'], userMap['sudharma.p@kambaa.in']]
    );

    // 7. Clear Attendance table so attendance only contains real QR check-in scans
    await pool.query('DELETE FROM attendance');

    // 8. Seed Badges & Impact
    await pool.query('DELETE FROM badges');
    await pool.query('DELETE FROM impact_tracking');
    await pool.query(
      `INSERT INTO badges (user_id, badge_name, points) VALUES
       (?, 'Top Presenter', 150),
       (?, 'Session Contributor', 100),
       (?, 'Session Monitor', 60)`,
      [userMap['sudharma.p@kambaa.in'], userMap['Sobika.Thangaraj@kambaa.in'], userMap['senior@kambaa.com']]
    );

    await pool.query(
      `INSERT INTO impact_tracking (submission_id, adopted, adopted_project, impact_notes, impact_rating, updated_by, updated_at)
       VALUES (?, TRUE, 'Kambaa Client Portal v2', 'Adopted Claude Artifacts approach for swift client mockup previews in production.', 5, ?, NOW())`,
      [sub1Res.insertId, userMap['owner@kambaa.com']]
    );

    console.log('KAST Database Seeding Completed Successfully!');
  } catch (err) {
    console.error('Database seeding error:', err);
  } finally {
    process.exit(0);
  }
}

seed();
