# KAST (Kambaa AI Knowledge Sharing Tracker) — System Modules Documentation

This document provides a detailed breakdown of all system modules, features, user workflows, and API integrations across the **Admin** (Progress Monitoring), **Program Owner / Management Portal** (System Administration), **Senior Employee / Senior Reviewer** (Session Monitor), and **Intern** roles in KAST.

---

## 📌 Executive Overview & Core Principle

KAST is built around a mandatory daily **30-minute AI Knowledge Sharing session (9:00 – 9:30 AM)** at Kambaa. Every intern researches significant AI tools (from Product Hunt, GitHub, LinkedIn), builds a proof-of-concept (POC), and presents 2–3 Kambaa-specific use cases. A senior employee monitors each session and files a daily report. 

> [!IMPORTANT]
> **Autonomous Rotation Principle**: **No one manually assigns daily sessions.** Presenter turns are **100% automated** based on a fixed rotation cycle (`order_index`). The system automatically advances through the intern sequence every workday and dispatches automated reminders to interns ahead of their scheduled turn.

---

## 📧 0. Day-Before Automated Email Reminder Engine (`backend/services/emailService.js`, `backend/services/scheduler.js`)

Automated email notification service running daily at **18:00 (6:00 PM)** to prepare tomorrow's 9:00 AM session participants with role-specific reminder emails:

### 🎓 0.1 Intern Presenter Reminder Email (`sendInternPresenterReminderEmail`)
* **Subject**: `[KAST Reminder] You are scheduled to present tomorrow at 9:00 AM! ({sessionDate})`
* **Content**: Notifies the scheduled intern of their upcoming turn, provides a preparation checklist (PPT slides, Kambaa use cases, POC repository links), and reminds them to submit research via the **Tool Submission** portal before 8:00 AM tomorrow morning.

### 👨‍🏫 0.2 Senior Reviewer Invitation Reminder Email (`sendSeniorReviewerReminderEmail`)
* **Subject**: `[KAST Invitation Reminder] Senior Reviewer Duty for Tomorrow's 9:00 AM AI Session ({sessionDate})`
* **Content**: Notifies the assigned Senior Reviewer / Duty Monitor, provides session details (scheduled intern presenter name & time window), and reminds them to monitor the session and file their evaluation report in the Senior Reviewer Dashboard after 9:30 AM.

---

## 🛡️ 1. Admin Module & Today's Session Attendance Breakdown (`frontend/src/pages/AdminDashboard.jsx`, `backend/routes/admin.js`)

Read-only monitoring dashboard designed specifically for Admin to track daily session progress, physical attendance, exact check-in scan timestamps, and inspect intern performance cards. (Note: **Tool Submission tab is exclusive to Interns** and removed from Admin navigation).

### 1.1 "Morning Session Progress Feed" Tab
* Hero "What Happened Today" card displaying today's session status, presenter name, quality star rating 1-5, senior reviewer summary, and flags.
* 🕒 **Today's Session Attendance & Scan Times Breakdown**:
  * 🟢 **Present (On-Time)**: Table of interns who checked in on time with exact scan timestamps (`09:02:15 AM`) and check-in methods (Phone QR Camera vs Manual).
  * 🟡 **Late Comers**: Table of interns who checked in late with exact late scan timestamps (`09:14:32 AM`).
  * 🔴 **Absentees**: Table of registered interns who have not scanned or checked in for today's session.
* Automated presenter rotation cycle schedule table.

---

## ⚙️ 2. Website Management & System Administration Portal (`frontend/src/pages/ProgramOwnerManagement.jsx`, `backend/routes/admin.js`, `backend/middleware/auth.js`)

* **User Management Directory**: Create and manage Interns, Senior Reviewers, and System Admins.
* **Create AI Sessions**: Pick session date, assign rotational presenter, and invite Senior Reviewers with automated in-app invitations.
* **Manual Reminder Trigger**: **Dispatch Day-Before Email Reminders** button (`POST /api/admin/trigger-reminders`) enabling management to manually trigger day-before email dispatches anytime.

---

## 👨‍🏫 3. Senior Employee / Senior Reviewer Modules (`frontend/src/pages/SeniorReviewDashboard.jsx`, `backend/routes/sessionReports.js`)

* 📊 **"My Dashboard" Page (`/senior-dashboard`)**: Displays days invited to review (duty schedule) and days reviewed & reported on (completed reports).
* ✍️ **"File Session Report" Page (`/senior-review`)**: Form for filing today's 9:00 AM session report with session date, topic presented, AI draft summary, quality stars 1-5, and flags.

---

## 🎓 4. Executive Intern Dashboard & Submissions API (`frontend/src/pages/InternDashboard.jsx`, `backend/routes/submissions.js`)

* **Submissions API Endpoint**: `GET /api/submissions` endpoint supporting `?internId=X` and `?allInterns=true` query parameters, returning submitted AI tools, slide decks, documents, and Kambaa use cases.
* **Refined Professional Copy**: Streamlined headers, guidelines, and tab labels (`My Presented Tools`, `Knowledge Repository`, `My Review Reports`).
* 📂 **"My Presented Tools" Tab**: Displays research submissions and attached documents submitted by the logged-in intern.
* 🌐 **"Knowledge Repository" Tab**: Searchable archive of all AI tools taught across Kambaa sessions.
* 📑 **"My Review Reports" Tab**: Dedicated view displaying all evaluation reports generated by Senior Reviewers.

---

## 5. ➕ Dedicated "Tool Submission" Navigation Tab (`frontend/src/pages/SubmissionForm.jsx`, `frontend/src/components/FileUploadCard.jsx`)

* Dedicated portal for **Interns** to submit daily AI tool research.
* 📊 **Upload PPT**: Accepts `.ppt`, `.pptx`, `.pdf` slide decks.
* 📄 **Upload Documents**: Accepts `.pdf`, `.docx`, `.doc`, `.txt`, `.zip` research papers.
* 🎥 **Upload Demo Video**: Accepts `.mp4`, `.webm`, `.mov`, `.mkv` video recordings (up to 100MB max file size).
* 📝 **Presentation Notes**: Speaker talking points & slide outline summary area.
* 🤖 **AI Generated Summary**: Summarizes speaker notes into a technical 1-paragraph summary.
* 💡 **AI Generated Use Cases**: Drafts 2–3 practical Kambaa use cases.

---

## 6. 🤖 Ask AI About Previous Sessions & Research (`frontend/src/pages/KnowledgeBaseChat.jsx`)

Merged natural-language RAG AI Assistant tab (`/knowledge-chat`) answering queries over past intern presentations, uploaded PPT slides, POC repos, and research documentation.

---

## 7. 📊 Present / Absent Calculation Engine (`backend/routes/attendance.js`, `frontend/src/pages/AttendanceScreen.jsx`)

* **Sunday Off-Day Exclusion Rule**: Sundays are automatically excluded from attendance rate calculations (`DAYOFWEEK != 1`).

---

## 8. 📍 Geofenced Physical Location & Attendance Scanner (`backend/routes/attendance.js`, `frontend/src/components/QRScanner.jsx`)

* **Target Geofence Coordinates**: **Latitude: `11.025501`**, **Longitude: `77.014486`** (*10 A, Pricol Caledon Square, Peelamedu, Coimbatore*).
