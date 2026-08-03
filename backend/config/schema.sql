CREATE DATABASE IF NOT EXISTS kast_db;
USE kast_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('intern','senior_reviewer','admin','program_owner') NOT NULL,
  department VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_date DATE UNIQUE NOT NULL,
  start_time TIME DEFAULT '09:00:00',
  end_time TIME DEFAULT '09:30:00',
  presenter_id INT,
  reviewer_id INT,
  qr_token VARCHAR(64),
  qr_generated_at DATETIME,
  status ENUM('scheduled','live','completed','missed') DEFAULT 'scheduled',
  FOREIGN KEY (presenter_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tool_catalog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tool_name VARCHAR(150) NOT NULL,
  category VARCHAR(100),
  first_presented_by INT,
  first_presented_date DATE,
  times_presented INT DEFAULT 1,
  embedding_summary TEXT,
  FOREIGN KEY (first_presented_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tool_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  intern_id INT NOT NULL,
  tool_name VARCHAR(150) NOT NULL,
  source_url VARCHAR(500),
  category VARCHAR(100),
  description TEXT,
  use_cases JSON,
  ai_generated_value TEXT,
  poc_repo_url VARCHAR(500),
  demo_url VARCHAR(500),
  status ENUM('draft','submitted','reviewed','flagged_duplicate') DEFAULT 'draft',
  submitted_at DATETIME,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (intern_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  file_type VARCHAR(50),
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES tool_submissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  reporter_id INT NOT NULL,
  tool_presented VARCHAR(150),
  presenter_id INT NOT NULL,
  session_summary TEXT,
  presentation_quality_rating TINYINT CHECK (presentation_quality_rating BETWEEN 1 AND 5),
  attendance_observation TEXT,
  flags TEXT,
  ai_draft_summary TEXT,
  submitted_at DATETIME,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (presenter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('present','late','absent') DEFAULT 'absent',
  method ENUM('qr','manual') DEFAULT 'qr',
  marked_by INT,
  marked_at DATETIME,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviewer_rotation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reviewer_id INT NOT NULL,
  scheduled_date DATE NOT NULL,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at DATETIME,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS presenter_rotation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  intern_id INT NOT NULL,
  scheduled_date DATE NOT NULL,
  order_index INT NOT NULL,
  status ENUM('upcoming','presented','skipped','rescheduled') DEFAULT 'upcoming',
  FOREIGN KEY (intern_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS impact_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  adopted BOOLEAN DEFAULT FALSE,
  adopted_project VARCHAR(200),
  impact_notes TEXT,
  impact_rating TINYINT,
  updated_by INT,
  updated_at DATETIME,
  FOREIGN KEY (submission_id) REFERENCES tool_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  badge_name VARCHAR(100),
  points INT DEFAULT 0,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
