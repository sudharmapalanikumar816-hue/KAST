const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kast_db',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '1'),
  queueLimit: 0,
  idleTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true,
  ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {})
};

const rawPool = mysql.createPool(dbConfig);

const pool = {
  async query(sql, params) {
    let attempts = 0;
    while (attempts < 5) {
      try {
        return await rawPool.query(sql, params);
      } catch (err) {
        if (err.code === 'ER_TOO_MANY_USER_CONNECTIONS' && attempts < 4) {
          attempts++;
          await new Promise(r => setTimeout(r, 600 * attempts));
        } else {
          throw err;
        }
      }
    }
  },
  async getConnection() {
    let attempts = 0;
    while (attempts < 5) {
      try {
        return await rawPool.getConnection();
      } catch (err) {
        if (err.code === 'ER_TOO_MANY_USER_CONNECTIONS' && attempts < 4) {
          attempts++;
          await new Promise(r => setTimeout(r, 600 * attempts));
        } else {
          throw err;
        }
      }
    }
  }
};

async function initDB() {
  try {
    try {
      const rootConn = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password
      });

      await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
      await rootConn.end();
    } catch (dbCreateErr) {
      // Managed databases like freeDB already have the database created and restrict CREATE DATABASE privileges.
      console.log('Skipped database creation check (managed DB host).');
    }

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, 'utf8');
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));

      const connection = await pool.getConnection();
      for (const statement of statements) {
        await connection.query(statement);
      }

      // Safely ensure order_index column exists on users table
      try {
        await connection.query('ALTER TABLE users ADD COLUMN order_index INT DEFAULT 1;');
      } catch (colErr) {}

      // Safely ensure presentation_notes column exists on tool_submissions table
      try {
        await connection.query('ALTER TABLE tool_submissions ADD COLUMN presentation_notes TEXT NULL;');
      } catch (colErr) {}

      // Safely ensure latitude & longitude columns exist on attendance table
      try {
        await connection.query('ALTER TABLE attendance ADD COLUMN latitude DECIMAL(10, 8) NULL, ADD COLUMN longitude DECIMAL(11, 8) NULL;');
      } catch (colErr) {}

      // Safely ensure unique scheduled_date indices on rotation tables
      try {
        await connection.query('ALTER TABLE presenter_rotation ADD UNIQUE INDEX uq_presenter_date (scheduled_date);');
      } catch (colErr) {}

      try {
        await connection.query('ALTER TABLE reviewer_rotation ADD UNIQUE INDEX uq_reviewer_date (scheduled_date);');
      } catch (colErr) {}

      connection.release();
      console.log('Database initialized successfully.');
    }
  } catch (err) {
    console.error('Error initializing database:', err.message);
  }
}

module.exports = { pool, initDB };
