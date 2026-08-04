const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kast_db',
  dateStrings: true,
  ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {})
};

async function resetScheduleAndHistory() {
  console.log('Starting KAST History Clean & Rotation Reset...');
  let conn;

  let attempts = 0;
  while (attempts < 30) {
    try {
      conn = await mysql.createConnection(dbConfig);
      if (conn) break;
    } catch (cErr) {
      if (cErr.code === 'ER_TOO_MANY_USER_CONNECTIONS') {
        attempts++;
        console.log(`Connection busy, retrying attempt ${attempts}/30...`);
        await new Promise(r => setTimeout(r, 2000));
      } else {
        throw cErr;
      }
    }
  }

  if (!conn) {
    console.error('Could not connect to database after retries.');
    return;
  }

  try {
    console.log('Connected to MySQL database:', dbConfig.database);

    // 1. Wipe Old History
    console.log('Clearing old session reports, submissions, attendance, sessions, and rotations...');
    await conn.query('DELETE FROM session_reports;');
    await conn.query('DELETE FROM tool_submissions;');
    await conn.query('DELETE FROM attendance;');
    await conn.query('DELETE FROM sessions;');
    await conn.query('DELETE FROM presenter_rotation;');
    await conn.query('DELETE FROM reviewer_rotation;');
    await conn.query('DELETE FROM tool_catalog;');

    // 2. Fetch all Interns and Senior Reviewers
    const [internRows] = await conn.query('SELECT id, name, email FROM users WHERE role = "intern" ORDER BY id ASC;');
    const [reviewerRows] = await conn.query('SELECT id, name, email FROM users WHERE role = "senior_reviewer" ORDER BY id ASC;');

    if (internRows.length === 0 || reviewerRows.length === 0) {
      console.error('No interns or reviewers found in database.');
      return;
    }

    // 3. Re-order Interns with Vanmathi Kasi first
    const vanmathiIndex = internRows.findIndex(i => i.email.toLowerCase().includes('vanmathi.kasi'));
    let orderedInterns = [];
    if (vanmathiIndex !== -1) {
      orderedInterns = [
        ...internRows.slice(vanmathiIndex),
        ...internRows.slice(0, vanmathiIndex)
      ];
    } else {
      orderedInterns = [...internRows];
    }

    console.log(`Ordered ${orderedInterns.length} interns. Presenter #1: ${orderedInterns[0].name} (${orderedInterns[0].email})`);

    // 4. Re-order Reviewers with Praveen Kp first
    const praveenIndex = reviewerRows.findIndex(r => r.email.toLowerCase().includes('praveen.kp'));
    let orderedReviewers = [];
    if (praveenIndex !== -1) {
      orderedReviewers = [
        ...reviewerRows.slice(praveenIndex),
        ...reviewerRows.slice(0, praveenIndex)
      ];
    } else {
      orderedReviewers = [...reviewerRows];
    }

    console.log(`Ordered ${orderedReviewers.length} reviewers. Reviewer #1: ${orderedReviewers[0].name} (${orderedReviewers[0].email})`);

    // 5. Update user order_index in users table
    for (let i = 0; i < orderedInterns.length; i++) {
      await conn.query('UPDATE users SET order_index = ? WHERE id = ?;', [i + 1, orderedInterns[i].id]);
    }
    for (let i = 0; i < orderedReviewers.length; i++) {
      await conn.query('UPDATE users SET order_index = ? WHERE id = ?;', [i + 1, orderedReviewers[i].id]);
    }

    // 6. Build fresh Presenter Rotation starting TODAY (2026-08-04)
    const startDate = new Date(); // Today
    console.log(`Generating rotation starting from today (${startDate.toISOString().split('T')[0]})...`);

    for (let i = 0; i < orderedInterns.length; i++) {
      const dateObj = new Date(startDate);
      dateObj.setDate(startDate.getDate() + i);
      const dateStr = dateObj.toISOString().split('T')[0];

      await conn.query(
        'INSERT INTO presenter_rotation (intern_id, scheduled_date, order_index, status) VALUES (?, ?, ?, ?);',
        [orderedInterns[i].id, dateStr, i + 1, 'upcoming']
      );
    }

    // 7. Build fresh Reviewer Rotation starting TODAY (2026-08-04)
    for (let i = 0; i < orderedReviewers.length; i++) {
      const dateObj = new Date(startDate);
      dateObj.setDate(startDate.getDate() + i);
      const dateStr = dateObj.toISOString().split('T')[0];

      await conn.query(
        'INSERT INTO reviewer_rotation (reviewer_id, scheduled_date, confirmed, confirmed_at) VALUES (?, ?, TRUE, NOW());',
        [orderedReviewers[i].id, dateStr]
      );
    }

    // 8. Insert Today's Official Session (2026-08-04)
    const todayStr = startDate.toISOString().split('T')[0];
    const todayPresenterId = orderedInterns[0].id; // Vanmathi Kasi
    const todayReviewerId = orderedReviewers[0].id; // Praveen Kp

    await conn.query(
      `INSERT INTO sessions (session_date, start_time, end_time, presenter_id, reviewer_id, status)
       VALUES (?, '09:00:00', '09:30:00', ?, ?, 'scheduled');`,
      [todayStr, todayPresenterId, todayReviewerId]
    );

    console.log(`✅ Today's Session (${todayStr}) Created Successfully!`);
    console.log(`   Presenter: ${orderedInterns[0].name} (${orderedInterns[0].email})`);
    console.log(`   Reviewer: ${orderedReviewers[0].name} (${orderedReviewers[0].email})`);
    console.log('✅ Schedule reset and old history cleanup completed cleanly.');

  } catch (err) {
    console.error('❌ Error during schedule reset:', err.message);
  } finally {
    if (conn) {
      await conn.end();
      console.log('MySQL connection closed.');
    }
  }
}

resetScheduleAndHistory();
