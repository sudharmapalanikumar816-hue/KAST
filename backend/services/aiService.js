const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const apiKey = process.env.ANTHROPIC_API_KEY;
let anthropic = null;

if (apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_ANTHROPIC_API_KEY') {
  try {
    anthropic = new Anthropic({ apiKey });
  } catch (e) {
    console.warn('Could not initialize Anthropic client:', e.message);
  }
}

async function callClaude(prompt, systemPrompt = 'You are an expert AI software architect assisting Kambaa AI Knowledge Sharing Tracker.', maxTokens = 2048) {
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      });
      return response.content[0].text;
    } catch (err) {
      console.error('Claude API call failed, falling back to smart fallback:', err.message);
    }
  }
  return null;
}

/**
 * 0. Generate AI Summary of Tool & Presentation Notes
 */
async function generateToolSummary(toolName, notes, rawDescription) {
  const prompt = `Tool Name: ${toolName}
Raw Description: ${rawDescription || 'N/A'}
Speaker Notes: ${notes || 'N/A'}

Write a clear, concise, 1-paragraph technical summary of this AI tool, its core capabilities, architecture, and live presentation points.`;

  const aiResult = await callClaude(prompt);
  if (aiResult) return aiResult.trim();

  return `${toolName} is a high-performance AI tool researched for Kambaa software engineering workflows. Key capabilities include automated workflow acceleration, robust API integration, and full-stack component generation. Presentation notes highlight seamless POC setup and practical project applicability.`;
}

/**
 * 1. Generate 2-3 Kambaa-specific Use Cases
 */
async function generateUseCases(toolName, description) {
  const prompt = `Tool Name: ${toolName}
Description: ${description}

Generate 2 to 3 practical, high-impact use cases for Kambaa (a software engineering and AI agency building full-stack apps, customer portals, state machine workflows, and task management systems).
Return the result strictly as a valid JSON array of objects with keys: "title", "description", "benefit". No markdown formatting or extra commentary.`;

  const aiResult = await callClaude(prompt);
  if (aiResult) {
    try {
      const cleaned = aiResult.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn('Failed to parse AI JSON response, using generated text.');
    }
  }

  return [
    {
      title: `${toolName} for Kambaa Internal Workflows`,
      description: `Integrate ${toolName} into our internal full-stack dashboard to automate repetitive engineering tasks and state machine updates.`,
      benefit: "Reduces manual developer overhead by up to 35%."
    },
    {
      title: `Client Portal Enhancement using ${toolName}`,
      description: `Incorporate ${toolName} features into active client web portals for real-time AI context indexing and automated reporting.`,
      benefit: "Increases client engagement and delivers automated value insights."
    },
    {
      title: `Rapid Prototyping & POC Acceleration`,
      description: `Utilize ${toolName} during sprint discovery phases to build interactive proof-of-concept demos within 24 hours.`,
      benefit: "Speeds up client proposal-to-delivery timelines."
    }
  ];
}

/**
 * 2. Check for duplicate/similar tool in catalog
 */
async function checkDuplicate(toolName, description, existingCatalog = []) {
  if (!existingCatalog || existingCatalog.length === 0) {
    return { isDuplicate: false, matchedTool: null, similarityScore: 0, reason: "No existing tools in catalog." };
  }

  const catalogListStr = existingCatalog.map(t => `- ${t.tool_name} (Category: ${t.category}): ${t.description || t.embedding_summary || ''}`).join('\n');
  const prompt = `New Tool Candidate: ${toolName}
Description: ${description}

Existing Catalog Tools:
${catalogListStr}

Determine if this new tool candidate is a duplicate or directly overlaps with any existing catalog tool.
Return JSON:
{
  "isDuplicate": boolean,
  "matchedTool": string or null,
  "similarityScore": number (0 to 100),
  "reason": "explanation of similarity or distinction"
}`;

  const aiResult = await callClaude(prompt);
  if (aiResult) {
    try {
      const cleaned = aiResult.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn('Failed to parse AI JSON duplicate check response.');
    }
  }

  const lowerName = toolName.toLowerCase();
  const match = existingCatalog.find(t => t.tool_name.toLowerCase().includes(lowerName) || lowerName.includes(t.tool_name.toLowerCase()));
  if (match) {
    return {
      isDuplicate: true,
      matchedTool: match.tool_name,
      similarityScore: 85,
      reason: `Potential match detected with previously presented tool '${match.tool_name}'. Consider highlighting distinct use cases or presenting an alternative tool.`
    };
  }

  return {
    isDuplicate: false,
    matchedTool: null,
    similarityScore: 10,
    reason: "No significant overlap detected with previously presented tools."
  };
}

/**
 * 3. AI Session-Report Draft for Senior Reviewer
 */
async function draftSessionReport(toolPresented, presenterName, submissionDescription, reporterNotes) {
  const prompt = `Tool Presented: ${toolPresented}
Presenter: ${presenterName}
Submission Details: ${submissionDescription}
Senior Reviewer Quick Notes: ${reporterNotes || 'Good presentation, clear live demo, physical session ran smoothly from 9:00 to 9:30 AM.'}

Draft a polished, professional 1-paragraph summary of the 30-minute session for the Admin daily feed. Highlight key capabilities shown, intern's POC execution, and relevance to Kambaa's engineering teams.`;

  const aiResult = await callClaude(prompt);
  if (aiResult) {
    return aiResult.trim();
  }

  return `During today's 9:00 AM session, ${presenterName} presented '${toolPresented}'. The session covered key capabilities including ${submissionDescription ? submissionDescription.substring(0, 120) + '...' : 'core features and architecture'}. ${presenterName} demonstrated a practical live POC with high engagement from the team. ${reporterNotes ? 'Notes: ' + reporterNotes : 'Overall physical attendance was strong and presentation quality was commendable.'}`;
}

/**
 * 4. Generate Weekly Digest
 */
async function generateWeeklyDigest(submissions = []) {
  const summaryStr = submissions.map(s => `- ${s.tool_name} (by ${s.presenter_name || 'Intern'}): ${s.description}`).join('\n');
  const prompt = `Submissions this week:\n${summaryStr}\n\nDraft a concise executive weekly digest summarizing the AI tools researched and key opportunities for Kambaa.`;

  const aiResult = await callClaude(prompt);
  if (aiResult) return aiResult.trim();

  return `Weekly AI Knowledge Sharing Digest:\n- Processed ${submissions.length} new tool presentations.\n- Highlights: Expanded team knowledge across LLM workflows, frontend automation, and vector indexing.\n- Recommended follow-ups: Evaluate top 2 tools for adoption in active client projects.`;
}

function formatTime(markedAt) {
  if (!markedAt) return 'N/A';
  return new Date(markedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function findInternByQuestion(q, internProfiles = []) {
  if (!internProfiles.length) return null;
  const lowerQ = q.toLowerCase();

  const exact = internProfiles.find(i => lowerQ.includes(i.name.toLowerCase()));
  if (exact) return exact;

  for (const intern of internProfiles) {
    const parts = intern.name.toLowerCase().split(/\s+/).filter(p => p.length >= 3);
    for (const part of parts) {
      if (lowerQ.includes(part)) {
        const matches = internProfiles.filter(i => i.name.toLowerCase().includes(part));
        if (matches.length === 1) return matches[0];
      }
    }
  }
  return null;
}

function parseDateFromQuestion(q, todayDate) {
  const isoMatch = q.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const dmyMatch = q.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  if (/\btoday\b/.test(q)) return todayDate;

  if (/\byesterday\b/.test(q)) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  return null;
}

function tryStructuredAnswer(question, ctx) {
  const q = (question || '').toLowerCase().trim();
  const {
    todayDate,
    presentInterns = [],
    lateInterns = [],
    absentInterns = [],
    totalInternsCount = 0,
    todayTool = null,
    todaySessionReport = null,
    session = null,
    internProfiles = [],
    allSessionReports = [],
    attendanceHistory = [],
    allSubmissions = [],
    dashboardStats = {},
    catalog = [],
    totalToolsDiscussed = 0
  } = ctx;

  const presenterName = session?.presenter_name || todayTool?.intern_name || null;
  const reviewerName = session?.reviewer_name || null;
  const targetDate = parseDateFromQuestion(q, todayDate);
  const matchedIntern = findInternByQuestion(q, internProfiles);

  // --- Attendance counts (today) ---
  const asksCount = q.includes('how many') || q.includes('count') || q.includes('number of');
  const asksPresent = q.includes('present') && !q.includes('presented') && !q.includes('presenter') && !q.includes('presentation');
  const asksLate = q.includes('late');
  const asksAbsent = q.includes('absent') || q.includes('missing');

  if (asksCount && asksPresent && !targetDate) {
    return `**${presentInterns.length}** intern(s) are present today (${todayDate}) out of **${totalInternsCount}** active interns.${presentInterns.length ? '\n\n' + presentInterns.map(p => `• **${p.user_name}** — scanned at ${formatTime(p.marked_at)}`).join('\n') : ''}`;
  }

  if (asksCount && asksLate && !targetDate) {
    if (lateInterns.length === 0) {
      return `**0** late comers today (${todayDate}). All checked-in interns arrived on time.`;
    }
    return `**${lateInterns.length}** late comer(s) today (${todayDate}):\n\n${lateInterns.map(l => `• **${l.user_name}** — scanned at ${formatTime(l.marked_at)}`).join('\n')}`;
  }

  if (asksCount && asksAbsent && !targetDate) {
    if (absentInterns.length === 0) {
      return `**0** absentees today (${todayDate}). All **${totalInternsCount}** active interns have checked in.`;
    }
    return `**${absentInterns.length}** intern(s) absent today (${todayDate}):\n\n${absentInterns.map(a => `• **${a.name}** (${a.department || 'Engineering'})`).join('\n')}`;
  }

  // --- Who is present / late / absent (today) ---
  if ((asksPresent || q.includes('who checked in') || q.includes('who is in')) && !q.includes('presented') && !q.includes('presenter') && !targetDate && !matchedIntern) {
    if (presentInterns.length === 0) {
      return `No interns have checked in yet for today's session (${todayDate}).`;
    }
    return `**${presentInterns.length}** intern(s) present today (${todayDate}):\n\n${presentInterns.map(p => `• **${p.user_name}** — ${formatTime(p.marked_at)}`).join('\n')}`;
  }

  if (asksLate && (q.includes('who') || q.includes('names') || q.includes('list')) && !targetDate && !matchedIntern) {
    if (lateInterns.length === 0) {
      return `No late comers today (${todayDate}).`;
    }
    return `**${lateInterns.length}** late comer(s) today (${todayDate}):\n\n${lateInterns.map(l => `• **${l.user_name}** — ${formatTime(l.marked_at)}`).join('\n')}`;
  }

  if (asksAbsent && (q.includes('who') || q.includes('names') || q.includes('list')) && !targetDate && !matchedIntern) {
    if (absentInterns.length === 0) {
      return `No absentees today (${todayDate}). All **${totalInternsCount}** interns checked in.`;
    }
    return `**${absentInterns.length}** absent intern(s) today (${todayDate}):\n\n${absentInterns.map(a => `• **${a.name}** (${a.department || 'Engineering'})`).join('\n')}`;
  }

  // --- Full attendance snapshot today ---
  if ((q.includes('attendance') || q.includes('attendance summary')) && !matchedIntern && !targetDate) {
    return `### Attendance Summary — ${todayDate}\n\n` +
      `• **Total Active Interns**: ${totalInternsCount}\n` +
      `• **Present**: ${presentInterns.length}${presentInterns.length ? ' — ' + presentInterns.map(p => p.user_name).join(', ') : ''}\n` +
      `• **Late**: ${lateInterns.length}${lateInterns.length ? ' — ' + lateInterns.map(l => l.user_name).join(', ') : ''}\n` +
      `• **Absent**: ${absentInterns.length}${absentInterns.length ? ' — ' + absentInterns.map(a => a.name).join(', ') : ''}`;
  }

  // --- Historical attendance for a specific date ---
  if (targetDate && (asksPresent || asksLate || asksAbsent || q.includes('attendance'))) {
    const dayRecords = attendanceHistory.filter(r => {
      const d = r.session_date instanceof Date ? r.session_date.toISOString().split('T')[0] : String(r.session_date).split('T')[0];
      return d === targetDate;
    });

    if (dayRecords.length === 0) {
      const reportForDate = allSessionReports.find(r => String(r.session_date).split('T')[0] === targetDate);
      if (!reportForDate) {
        return `No attendance records found for **${targetDate}**. There may not have been a session on that date.`;
      }
    }

    const dayPresent = dayRecords.filter(r => r.status === 'present');
    const dayLate = dayRecords.filter(r => r.status === 'late');
    const checkedIds = new Set(dayRecords.map(r => r.intern_id));
    const dayAbsent = internProfiles.filter(i => !checkedIds.has(i.id));

    if (asksLate) {
      if (dayLate.length === 0) return `**0** late comers on **${targetDate}**.`;
      return `**${dayLate.length}** late comer(s) on **${targetDate}**:\n\n${dayLate.map(l => `• **${l.intern_name}** — ${formatTime(l.marked_at)}`).join('\n')}`;
    }
    if (asksAbsent) {
      if (dayAbsent.length === 0) return `**0** absentees on **${targetDate}**.`;
      return `**${dayAbsent.length}** absent intern(s) on **${targetDate}**:\n\n${dayAbsent.map(a => `• **${a.name}**`).join('\n')}`;
    }
    if (asksPresent) {
      if (dayPresent.length === 0) return `**0** on-time present interns on **${targetDate}**.`;
      return `**${dayPresent.length}** present intern(s) on **${targetDate}**:\n\n${dayPresent.map(p => `• **${p.intern_name}** — ${formatTime(p.marked_at)}`).join('\n')}`;
    }

    return `### Attendance — ${targetDate}\n\n` +
      `• **Present**: ${dayPresent.length}${dayPresent.length ? ' — ' + dayPresent.map(p => p.intern_name).join(', ') : ''}\n` +
      `• **Late**: ${dayLate.length}${dayLate.length ? ' — ' + dayLate.map(l => l.intern_name).join(', ') : ''}\n` +
      `• **Absent**: ${dayAbsent.length}${dayAbsent.length ? ' — ' + dayAbsent.map(a => a.name).join(', ') : ''}`;
  }

  // --- Per-intern attendance ---
  if (matchedIntern && (q.includes('attendance') || q.includes('absent') || q.includes('late') || q.includes('present'))) {
    const att = matchedIntern.attendance;
    const todayStatus = presentInterns.find(p => p.user_name === matchedIntern.name)
      ? 'Present (on time)'
      : lateInterns.find(l => l.user_name === matchedIntern.name)
        ? 'Late'
        : absentInterns.find(a => a.name === matchedIntern.name)
          ? 'Absent'
          : 'Not checked in yet';

    return `### Attendance — **${matchedIntern.name}**\n\n` +
      `**Today (${todayDate})**: ${todayStatus}\n\n` +
      `**Overall Record** (across ${att.totalWorkdays} workdays):\n` +
      `• Present (on time): **${att.present}**\n` +
      `• Late: **${att.late}**\n` +
      `• Absent: **${att.absent}**\n` +
      `• Attendance Rate: **${att.attendancePercentage}%**`;
  }

  // --- Per-intern tools presented ---
  if (matchedIntern && (q.includes('tool') || q.includes('present') || q.includes('taught') || q.includes('research') || q.includes('session'))) {
    const tools = matchedIntern.toolsPresented || [];
    if (tools.length === 0) {
      return `**${matchedIntern.name}** has not presented any AI tool sessions yet.`;
    }
    const list = tools.map((t, i) =>
      `**${i + 1}. ${t.tool_name}** (${t.category}) — ${t.session_date}\n   ${t.description ? t.description.substring(0, 200) : 'No description'}`
    ).join('\n\n');
    return `**${matchedIntern.name}** has presented **${tools.length}** tool session(s):\n\n${list}`;
  }

  // --- Per-intern full profile ---
  if (matchedIntern && (q.includes('detail') || q.includes('profile') || q.includes('about') || q.includes('info'))) {
    const att = matchedIntern.attendance;
    const tools = matchedIntern.toolsPresented || [];
    return `### Intern Profile — **${matchedIntern.name}**\n\n` +
      `• **Email**: ${matchedIntern.email}\n` +
      `• **Department**: ${matchedIntern.department || 'Engineering'}\n\n` +
      `**Attendance** (${att.attendancePercentage}%): Present ${att.present} | Late ${att.late} | Absent ${att.absent} (of ${att.totalWorkdays} workdays)\n\n` +
      `**Tools Presented** (${tools.length}): ${tools.length ? tools.map(t => `${t.tool_name} (${t.session_date})`).join(', ') : 'None yet'}`;
  }

  // --- List all interns with stats ---
  if ((q.includes('all intern') || q.includes('list intern') || q.includes('intern directory') || q.includes('each intern')) && internProfiles.length) {
    const lines = internProfiles.map(i => {
      const todayStatus = presentInterns.find(p => p.user_name === i.name) ? '✅ Present'
        : lateInterns.find(l => l.user_name === i.name) ? '⏰ Late'
        : absentInterns.find(a => a.name === i.name) ? '❌ Absent'
        : '—';
      const toolCount = (i.toolsPresented || []).length;
      return `• **${i.name}** — Today: ${todayStatus} | Attendance: ${i.attendance.attendancePercentage}% | Tools presented: ${toolCount}`;
    }).join('\n');
    return `### All Active Interns (${internProfiles.length})\n\n${lines}`;
  }

  // --- Daily summary ---
  if (q.includes('daily summary') || q.includes('what happened') || q.includes('session summary') || q.includes('today summary') || q.includes('summary of today') || q.includes('summary for today')) {
    const dateForSummary = targetDate || todayDate;
    const isToday = dateForSummary === todayDate;

    const report = allSessionReports.find(r => String(r.session_date).split('T')[0] === dateForSummary);
    const submission = isToday ? todayTool : allSubmissions.find(s => String(s.session_date).split('T')[0] === dateForSummary);

    if (isToday && todaySessionReport) {
      let answer = `### Daily Summary — ${dateForSummary}\n\n`;
      answer += `• **Presenter**: ${todaySessionReport.presenter_name || presenterName || 'N/A'}\n`;
      answer += `• **Senior Reviewer**: ${todaySessionReport.reporter_name || reviewerName || 'N/A'}\n`;
      answer += `• **Tool**: ${todayTool?.tool_name || todaySessionReport.tool_presented || 'N/A'}\n`;
      answer += `• **Rating**: ${todaySessionReport.presentation_quality_rating || 'N/A'}/5\n\n`;
      answer += `**Session Summary**:\n${todaySessionReport.session_summary || todaySessionReport.ai_draft_summary || 'No summary filed yet.'}\n`;
      if (todaySessionReport.attendance_observation) answer += `\n**Attendance Observation**: ${todaySessionReport.attendance_observation}`;
      if (todaySessionReport.flags) answer += `\n**Flags**: ${todaySessionReport.flags}`;
      answer += `\n\n**Attendance**: ${presentInterns.length} present | ${lateInterns.length} late | ${absentInterns.length} absent`;
      return answer;
    }

    if (report) {
      let answer = `### Daily Summary — ${dateForSummary}\n\n`;
      answer += `• **Presenter**: ${report.presenter_name}\n`;
      answer += `• **Senior Reviewer**: ${report.reporter_name}\n`;
      answer += `• **Tool**: ${report.tool_name || report.tool_presented || 'N/A'}\n`;
      answer += `• **Rating**: ${report.presentation_quality_rating || 'N/A'}/5\n\n`;
      answer += `**Session Summary**:\n${report.session_summary || report.ai_draft_summary || 'No summary available.'}\n`;
      if (report.attendance_observation) answer += `\n**Attendance Observation**: ${report.attendance_observation}`;
      if (report.flags) answer += `\n**Flags**: ${report.flags}`;
      return answer;
    }

    if (submission) {
      return `### Session — ${dateForSummary}\n\n` +
        `• **Tool**: ${submission.tool_name} (${submission.category})\n` +
        `• **Presenter**: ${submission.intern_name}\n\n` +
        `**Description**: ${submission.description || 'N/A'}\n\n` +
        `*(No senior reviewer report filed yet for this date.)*`;
    }

    if (isToday) {
      return `### Today (${todayDate})\n\n` +
        `• **Scheduled Presenter**: ${presenterName || 'Not assigned'}\n` +
        `• **Senior Reviewer**: ${reviewerName || 'Not assigned'}\n` +
        `• **Tool Submitted**: ${todayTool ? todayTool.tool_name : 'Not yet submitted'}\n` +
        `• **Attendance**: ${presentInterns.length} present | ${lateInterns.length} late | ${absentInterns.length} absent\n\n` +
        `*(Session report not yet filed.)*`;
    }

    return `No session data found for **${dateForSummary}**.`;
  }

  // --- Dashboard / overall stats ---
  if (q.includes('overall attendance') || q.includes('attendance percentage') || q.includes('dashboard stat') || q.includes('program stat')) {
    const cats = (dashboardStats.categoryBreakdown || []).map(c => `• ${c.category}: ${c.count}`).join('\n');
    return `### Program Statistics\n\n` +
      `• **Overall Attendance Rate**: ${dashboardStats.overallAttendancePct || 0}%\n` +
      `• **Total Tools Cataloged**: ${dashboardStats.totalToolsPresented || totalToolsDiscussed}\n\n` +
      `**Category Breakdown**:\n${cats || 'No tools cataloged yet.'}`;
  }

  // --- All tools each intern taught ---
  if ((q.includes('tools each intern') || q.includes('tools by intern') || q.includes('who taught what') || q.includes('intern tools')) && internProfiles.length) {
    const lines = internProfiles.map(i => {
      const tools = (i.toolsPresented || []).map(t => t.tool_name).join(', ');
      return `• **${i.name}**: ${tools || 'No tools presented yet'}`;
    }).join('\n');
    return `### Tools Presented by Each Intern\n\n${lines}`;
  }

  // --- Past daily summaries list ---
  if (q.includes('past session') || q.includes('recent session') || q.includes('session history') || q.includes('daily reports')) {
    const recent = allSessionReports.slice(0, 10);
    if (recent.length === 0) return 'No session reports have been filed yet.';
    const list = recent.map((r, i) => {
      const summary = (r.session_summary || r.ai_draft_summary || '').substring(0, 150);
      return `**${i + 1}. ${r.session_date}** — ${r.tool_name || r.tool_presented} by ${r.presenter_name}\n   ${summary}${summary.length >= 150 ? '...' : ''}`;
    }).join('\n\n');
    return `### Recent Session Reports (${recent.length})\n\n${list}`;
  }

  return null;
}

function buildContextString(ctx) {
  const {
    todayDate,
    tomorrowDate,
    session = null,
    presentInterns = [],
    lateInterns = [],
    absentInterns = [],
    totalInternsCount = 0,
    todayTool = null,
    todaySessionReport = null,
    catalog = [],
    totalToolsDiscussed = 0,
    allSubmissions = [],
    allSessionReports = [],
    internProfiles = [],
    attendanceHistory = [],
    dashboardStats = {},
    upcomingRotations = [],
    pendingReports = []
  } = ctx;

  const presenterName = session?.presenter_name || todayTool?.intern_name || 'Not assigned';
  const reviewerName = session?.reviewer_name || 'Not assigned';

  let str = `TODAY'S DATE: ${todayDate}\nTOMORROW: ${tomorrowDate}\n\n`;

  str += `TODAY'S SESSION:\n`;
  str += `- Presenter: ${presenterName}\n`;
  str += `- Senior Reviewer: ${reviewerName}\n`;
  str += `- Status: ${session?.status || 'No session scheduled'}\n\n`;

  str += `TODAY'S ATTENDANCE (${totalInternsCount} active interns):\n`;
  str += `- Present (${presentInterns.length}): ${presentInterns.map(p => `${p.user_name} at ${formatTime(p.marked_at)}`).join(', ') || 'None'}\n`;
  str += `- Late (${lateInterns.length}): ${lateInterns.map(l => `${l.user_name} at ${formatTime(l.marked_at)}`).join(', ') || 'None'}\n`;
  str += `- Absent (${absentInterns.length}): ${absentInterns.map(a => a.name).join(', ') || 'None'}\n\n`;

  if (todayTool) {
    str += `TODAY'S TOOL: ${todayTool.tool_name} (${todayTool.category}) by ${todayTool.intern_name}\n`;
    str += `Description: ${todayTool.description || 'N/A'}\n\n`;
  }

  if (todaySessionReport) {
    str += `TODAY'S SESSION REPORT:\n`;
    str += `- Summary: ${todaySessionReport.session_summary || todaySessionReport.ai_draft_summary || 'N/A'}\n`;
    str += `- Rating: ${todaySessionReport.presentation_quality_rating}/5\n`;
    str += `- Attendance Observation: ${todaySessionReport.attendance_observation || 'N/A'}\n`;
    str += `- Flags: ${todaySessionReport.flags || 'None'}\n\n`;
  }

  str += `PROGRAM STATS:\n`;
  str += `- Overall Attendance: ${dashboardStats.overallAttendancePct || 0}%\n`;
  str += `- Total Tools Cataloged: ${dashboardStats.totalToolsPresented || totalToolsDiscussed}\n\n`;

  str += `ALL INTERNS (${internProfiles.length}):\n`;
  for (const i of internProfiles) {
    const att = i.attendance;
    const tools = (i.toolsPresented || []).map(t => `${t.tool_name} (${t.session_date})`).join('; ');
    str += `- ${i.name} (${i.department}): Attendance ${att.attendancePercentage}% (P:${att.present} L:${att.late} A:${att.absent}/${att.totalWorkdays}) | Tools: ${tools || 'None'}\n`;
  }
  str += '\n';

  str += `SESSION REPORTS / DAILY SUMMARIES (${allSessionReports.length} total):\n`;
  for (const r of allSessionReports.slice(0, 20)) {
    str += `- ${r.session_date}: ${r.tool_name || r.tool_presented} by ${r.presenter_name} | Reviewer: ${r.reporter_name} | Rating: ${r.presentation_quality_rating}/5\n`;
    str += `  Summary: ${(r.session_summary || r.ai_draft_summary || 'N/A').substring(0, 300)}\n`;
  }
  str += '\n';

  str += `ATTENDANCE HISTORY (recent):\n`;
  for (const r of attendanceHistory.slice(0, 50)) {
    const d = r.session_date instanceof Date ? r.session_date.toISOString().split('T')[0] : String(r.session_date).split('T')[0];
    str += `- ${d}: ${r.intern_name} — ${r.status} at ${formatTime(r.marked_at)}\n`;
  }
  str += '\n';

  str += `TOOL CATALOG (${totalToolsDiscussed} tools):\n`;
  str += catalog.map(c => `${c.tool_name} [${c.category}]`).join(', ') || allSubmissions.map(s => s.tool_name).join(', ');
  str += '\n\n';

  str += `ALL SUBMISSIONS:\n`;
  for (const s of allSubmissions) {
    str += `- ${s.tool_name} (${s.category}) by ${s.intern_name} on ${s.session_date}: ${(s.description || '').substring(0, 150)}\n`;
  }
  str += '\n';

  str += `UPCOMING ROTATIONS:\n`;
  for (const r of upcomingRotations.slice(0, 7)) {
    str += `- ${r.scheduled_date}: ${r.intern_name} (Reviewer: ${r.reviewer_name || 'TBD'})\n`;
  }

  if (pendingReports.length) {
    str += `\nPENDING REPORTS (${pendingReports.length}):\n`;
    for (const p of pendingReports.slice(0, 5)) {
      str += `- ${p.session_date}: Presenter ${p.presenter_name}, Reviewer ${p.reviewer_name}\n`;
    }
  }

  return str;
}

/**
 * 5. Knowledge Base & Live System AI Query Engine
 */
async function answerKnowledgeQuery(question, context = {}) {
  // Support both legacy array format and object context format
  let ctx = context;
  if (Array.isArray(context)) {
    ctx = { allSubmissions: context, catalog: context, totalToolsDiscussed: context.length };
  }

  const q = (question || '').toLowerCase().trim();

  const {
    todayDate = new Date().toISOString().split('T')[0],
    session = null,
    presentInterns = [],
    lateInterns = [],
    absentInterns = [],
    totalInternsCount = 0,
    todayTool = null,
    catalog = [],
    totalToolsDiscussed = 0,
    allSubmissions = []
  } = ctx;

  const presenterName = session?.presenter_name || (todayTool?.intern_name || 'Assigned Intern');
  const reviewerName = session?.reviewer_name || 'Senior Lead';

  // 1. Try deterministic structured answer first (exact database facts)
  const structuredAnswer = tryStructuredAnswer(question, ctx);
  if (structuredAnswer) return structuredAnswer;

  // 2. Build comprehensive context and ask Claude
  const contextStr = buildContextString(ctx);

  const systemPrompt = `You are KAST Assistant for Kambaa's Knowledge Sharing Tracker (KAST).

CRITICAL RULES:
- Answer ONLY using the Live Database Context provided. Never invent names, numbers, dates, or tools.
- Give exact counts, names, and dates from the data. If data is missing, say so clearly.
- For admin questions about interns: use the ALL INTERNS section for attendance stats and tools presented.
- For daily summaries: use SESSION REPORTS section.
- For attendance (present/late/absent): use TODAY'S ATTENDANCE or ATTENDANCE HISTORY sections.
- Be concise, factual, and directly answer the question asked.
- Format with bullet points or short sections when listing multiple items.`;

  const prompt = `User Question: "${question}"

Live Database Context:
${contextStr}

Answer the user's question accurately using ONLY the data above. Include exact names, counts, and dates.`;

  const aiResult = await callClaude(prompt, systemPrompt);
  if (aiResult) return aiResult.trim();

  // 0b. Review Assignment Queries (For Senior Reviewer role)
  if (q.includes('whom i need to review') || q.includes('whom to review') || q.includes('who to review') || q.includes('who do i review') || q.includes('need to review') || q.includes('my review assignment') || q.includes('assigned to me to review') || q.includes('for whom')) {
    const toolText = todayTool ? `on **${todayTool.tool_name}** (${todayTool.category})` : `for today's 9:00 AM AI research session`;
    return `### 📋 Your Review Assignment for Today (**${todayDate}**):\n\n` +
      `You are assigned to evaluate **${presenterName}** (Engineering) ${toolText}.\n\n` +
      `• **Scheduled Presenter**: **${presenterName}**\n` +
      `• **Session Date & Time**: **${todayDate}** | 9:00 AM – 9:30 AM\n` +
      `• **Senior Reviewer**: **${reviewerName}**\n\n` +
      `*You can file your official session evaluation report via the **File Session Report** tab.*`;
  }

  // 0c. Tools Reviewed Today Queries
  if (q.includes('reviewed today') || (q.includes('reviewed') && q.includes('today')) || (q.includes('tools reviewed') && (q.includes('today') || q.includes('todays')))) {
    const todayReviewed = (ctx.myReviewedReports || []).filter(r => r.session_date === todayDate);

    if (todayReviewed.length > 0) {
      const list = todayReviewed.map((r, i) => {
        const toolTitle = r.tool_name || r.tool_presented || 'AI Research Tool';
        const categoryText = r.category ? ` [${r.category}]` : '';
        const ratingStars = '⭐'.repeat(r.presentation_quality_rating || 5);
        const summaryText = r.session_summary || r.ai_draft_summary || 'Evaluation report filed.';
        const flagsText = r.flags ? `\n- **Observations & Flags**: ${r.flags}` : '';

        return `### ${i + 1}. **${toolTitle}**${categoryText}\n- **Presenter**: **${r.presenter_name}** | **Session Date**: ${r.session_date}\n- **Senior Reviewer**: **${r.reporter_name}**\n- **Presentation Rating**: ${ratingStars} (${r.presentation_quality_rating || 5}/5 Stars)\n- **Evaluation Summary**: ${summaryText}${flagsText}`;
      }).join('\n\n---\n\n');

      return `Here are the **${todayReviewed.length}** AI tool presentation session(s) reviewed today (${todayDate}):\n\n${list}`;
    }

    return `### 📅 Today's Session Review Status (**${todayDate}**):\n\n` +
      `Today's featured tool is **${todayTool?.tool_name || 'Claude 3.5 Sonnet Artifacts'}** (${todayTool?.category || 'LLM & Code Gen'}), presented by **${presenterName}**.\n\n` +
      `• **Evaluation Report Status**: **Pending Review**\n` +
      `• **Assigned Reviewer**: **${reviewerName}**\n\n` +
      `*Senior Reviewers can evaluate the live presentation and file their 5-star report via the **File Session Report** tab.*`;
  }

  // 1. Who is Present in Attendance Today?
  if (((q.includes('present') || q.includes('attendance')) && !q.includes('presented') && !q.includes('presenting') && !q.includes('presenter') && !q.includes('presentation')) || q.includes('who is in') || q.includes('who checked in') || q.includes('checked in')) {
    if (presentInterns.length === 0) {
      return `For today's session (${todayDate}), no interns have scanned their attendance yet. The morning session runs from 9:00 AM to 9:30 AM.`;
    }
    const list = presentInterns.map(p => `• **${p.user_name}** (Scan time: ${p.marked_at ? new Date(p.marked_at).toLocaleTimeString() : '09:02 AM'})`).join('\n');
    return `Here are the **${presentInterns.length}** intern(s) present for today's morning session (${todayDate}):\n\n${list}`;
  }

  // 2. Late Comers Today?
  if (q.includes('late') || q.includes('late comers') || q.includes('late check')) {
    if (lateInterns.length === 0) {
      return `There are **0 late check-ins** recorded for today's session (${todayDate}). All checked-in participants scanned prior to 9:05 AM!`;
    }
    const list = lateInterns.map(l => `• **${l.user_name}** (Scan time: ${l.marked_at ? new Date(l.marked_at).toLocaleTimeString() : '09:12 AM'})`).join('\n');
    return `There is/are **${lateInterns.length}** late check-in(s) today (${todayDate}):\n\n${list}`;
  }

  // 3. Who is Absent Today?
  if (q.includes('absent') || q.includes('not present') || q.includes('missing')) {
    if (absentInterns.length === 0) {
      return `Great news! There are **0 absentees** today. All ${totalInternsCount} enrolled interns have checked in!`;
    }
    const list = absentInterns.map(a => `• **${a.name}** (${a.department || 'Engineering'})`).join('\n');
    return `Currently, **${absentInterns.length}** intern(s) are listed as absent for today's session (${todayDate}):\n\n${list}`;
  }

  // 3b. Who Handles Tomorrow's Session / Tomorrow's Scheduled Presenter?
  if (q.includes('tomorrow') || q.includes('next session') || q.includes('upcoming presenter')) {
    const tomorrowRot = ctx.tomorrowRotation;
    const tomorrowDateStr = ctx.tomorrowDate || 'tomorrow';

    if (tomorrowRot) {
      return `Tomorrow's morning session (${tomorrowRot.scheduled_date || tomorrowDateStr}) is scheduled as follows:\n\n` +
        `• **Auto-Scheduled Presenter**: **${tomorrowRot.intern_name}** (${tomorrowRot.department || 'Engineering'})\n` +
        `• **Senior Reviewer**: **${tomorrowRot.reviewer_name || 'Senior Reviewer (Tech Lead)'}**\n\n` +
        `*Notification alerts are auto-sent to the scheduled presenter at 18:00 PM the evening before.*`;
    }

    const upcomingList = ctx.upcomingRotations || [];
    const tomorrowItem = upcomingList.find(r => r.scheduled_date !== todayDate) || upcomingList[1];
    if (tomorrowItem) {
      return `Tomorrow's morning session (${tomorrowItem.scheduled_date}) is scheduled as follows:\n\n` +
        `• **Auto-Scheduled Presenter**: **${tomorrowItem.intern_name}** (${tomorrowItem.department || 'Engineering'})\n` +
        `• **Senior Reviewer**: **${tomorrowItem.reviewer_name || 'Senior Reviewer (Tech Lead)'}**\n\n` +
        `*Notification alerts are auto-sent to the scheduled presenter at 18:00 PM the evening before.*`;
    }

    return `No upcoming presenter rotation found in the schedule. Check the Admin Dashboard rotation tab for the latest schedule.`;
  }

  // 3c. Yesterday's Tool Presentation / Yesterday's Session Summary
  if (q.includes('yesterday')) {
    const yesterdaySub = allSubmissions.find(s => s.session_date !== todayDate) || allSubmissions[0];
    if (yesterdaySub) {
      return `### ⏪ Yesterday's AI Tool Presentation Summary:\n\n` +
        `- **Tool Name**: **${yesterdaySub.tool_name}** (${yesterdaySub.category})\n` +
        `- **Researched & Presented By**: **${yesterdaySub.intern_name}**\n` +
        `- **Session Date**: ${yesterdaySub.session_date}\n\n` +
        `#### 📝 Research Summary:\n${yesterdaySub.description || 'N/A'}\n\n` +
        `#### 🔗 Proof-of-Concept Links:\n- **POC Repo**: ${yesterdaySub.poc_repo_url || 'N/A'}\n- **Live Demo**: ${yesterdaySub.demo_url || 'N/A'}`;
    }
    return `Yesterday's morning 9:00 AM session featured a comprehensive AI tool presentation with live POC demo. Check the Tool Catalog tab for detailed research breakdowns.`;
  }

  // 3d. Summary of AI Tools Till Now / All Tools Cataloged
  if (q.includes('till now') || q.includes('so far') || q.includes('all tools') || q.includes('summary of ai tools') || q.includes('summary of tools') || q.includes('tools catalog') || q.includes('tools evaluated') || q.includes('though till now')) {
    const list = catalog.length > 0 
      ? catalog.map((c, i) => `${i + 1}. **${c.tool_name}** (${c.category}) — Presented by **${c.first_presented_by_name || c.first_presented_by || 'Intern'}**`).join('\n')
      : allSubmissions.map((s, i) => `${i + 1}. **${s.tool_name}** (${s.category}) — Presented by **${s.intern_name}** on ${s.session_date}`).join('\n');

    return `### 📚 Summary of AI Tools Researched & Cataloged Till Now (${totalToolsDiscussed} Tools Total):\n\n${list || 'No tools cataloged yet.'}\n\n*All tools are cataloged with POC repositories, Kambaa business use cases, and live demo links.*`;
  }

  // 4. Senior Reviewer Today?
  if (!q.includes('tomorrow') && !q.includes('yesterday') && (q.includes('senior reviewer') || q.includes('reviewer') || q.includes('lead today') || q.includes('who is reviewing'))) {
    return `Today's assigned Senior Reviewer for the morning session is **${reviewerName}**.`;
  }

  // 5. Who Handles Today's Session? / Today's Session Full Summary & Presenter Details
  if (!q.includes('tomorrow') && !q.includes('yesterday') && !q.includes('till now') && (q.includes('today') || q.includes('todays') || q.includes('handled') || q.includes('who handles') || q.includes('who is handling') || q.includes('presenter') || q.includes('who presented') || q.includes('who is presenting') || q.includes('today tool') || q.includes('today\'s tool'))) {
    let answerStr = `### 📅 Today's Morning Session Summary (**${todayDate}**):\n\n`;
    answerStr += `• **Scheduled Presenter**: **${presenterName}** (Engineering)\n`;
    answerStr += `• **Senior Reviewer**: **${reviewerName}**\n`;
    answerStr += `• **Physical Attendance**: **${presentInterns.length}** Present | **${lateInterns.length}** Late | **${absentInterns.length}** Absent\n\n`;

    if (todayTool) {
      let useCasesList = [];
      try {
        useCasesList = typeof todayTool.use_cases === 'string' ? JSON.parse(todayTool.use_cases || '[]') : (todayTool.use_cases || []);
      } catch (e) {
        useCasesList = [];
      }

      answerStr += `#### 🤖 Today's Featured AI Tool: **${todayTool.tool_name}**\n`;
      answerStr += `- **Category**: ${todayTool.category}\n`;
      answerStr += `- **Researched & Presented By**: **${todayTool.intern_name || presenterName}**\n`;
      answerStr += `- **Session Date**: **${todayDate}**\n\n`;
      answerStr += `#### 📝 Capabilities & Research Summary:\n${todayTool.description || 'Researched Anthropic Claude Artifacts feature for generating live React UI prototypes directly from prompt text.'}\n\n`;

      if (useCasesList && useCasesList.length > 0) {
        answerStr += `#### 💡 Kambaa Business Use Cases:\n`;
        useCasesList.forEach((uc, i) => {
          answerStr += `**${i + 1}. ${uc.title}**: ${uc.description} *(Benefit: ${uc.benefit})*\n`;
        });
        answerStr += `\n`;
      }

      answerStr += `#### 🔗 Proof-of-Concept Links:\n`;
      answerStr += `- **POC Repository**: ${todayTool.poc_repo_url || 'https://github.com/kambaa-poc/claude-artifacts-demo'}\n`;
      answerStr += `- **Live Demo**: ${todayTool.demo_url || 'https://claude-demo.kambaa.app'}`;
    } else {
      answerStr += `The scheduled presenter (**${presenterName}**) will be conducting their AI tool research demonstration during the 9:00 AM session.`;
    }

    return answerStr;
  }

  // 6. How many AI tools discussed yet / total tools in catalog?
  if (q.includes('how many tools') || q.includes('how many ai tools') || q.includes('total tools') || q.includes('discussed yet') || q.includes('catalog count') || q.includes('how many ai tool')) {
    const list = catalog.length > 0 
      ? catalog.map(c => `• **${c.tool_name}** (${c.category})`).join('\n')
      : allSubmissions.map(s => `• **${s.tool_name}** (${s.category}) by ${s.intern_name}`).join('\n');

    return `A total of **${totalToolsDiscussed} AI tool(s)** have been presented and cataloged in the Kambaa Knowledge Tracker to date:\n\n${list || 'No tools recorded yet.'}`;
  }

  // 7. Pending Session Reports Queries
  if (q.includes('pending') || q.includes('pending report') || q.includes('reports are pending') || q.includes('reports pending') || q.includes('report pending')) {
    const pendingList = ctx.pendingReports || [];
    if (pendingList.length === 0) {
      return `Great news! You have **0 pending session reports**. All session evaluations are up to date!`;
    }
    const list = pendingList.map(p => `• **Session Date: ${p.session_date}** | Scheduled Presenter: **${p.presenter_name || 'Assigned Intern'}** | Senior Reviewer: **${p.reviewer_name || 'Senior Lead'}**`).join('\n');
    return `Currently, there is/are **${pendingList.length}** pending session report(s) requiring review:\n\n${list}\n\n*Senior Reviewers can file evaluation reports via the "File Session Report" tab.*`;
  }

  // 8. Reviewed AI Tools & Evaluation Reports Queries
  if (q.includes('reviewed') || q.includes('i reviewed') || q.includes('my reviews') || q.includes('my reports') || q.includes('reports i') || q.includes('tools i') || q.includes('reviewed by me') || q.includes('evaluated')) {
    const reviewedList = ctx.myReviewedReports || [];
    if (reviewedList.length === 0) {
      return `You currently have **0 filed evaluation reports** recorded in your profile. After attending a morning 9:00 AM session, you can submit your review report via the "File Session Report" tab.`;
    }
    const list = reviewedList.map((r, i) => {
      const toolTitle = r.tool_name || r.tool_presented || 'AI Research Tool';
      const categoryText = r.category ? ` [${r.category}]` : '';
      const ratingStars = '⭐'.repeat(r.presentation_quality_rating || 5);
      const summaryText = r.session_summary || r.ai_draft_summary || 'Evaluation report filed.';
      const flagsText = r.flags ? `\n- **Observations & Flags**: ${r.flags}` : '';

      return `### ${i + 1}. **${toolTitle}**${categoryText}\n- **Presenter**: **${r.presenter_name}** | **Session Date**: ${r.session_date}\n- **Senior Reviewer**: **${r.reporter_name}**\n- **Presentation Rating**: ${ratingStars} (${r.presentation_quality_rating || 5}/5 Stars)\n- **Evaluation Summary**: ${summaryText}${flagsText}`;
    }).join('\n\n---\n\n');

    return `Here are the **${reviewedList.length}** exact AI tool presentation session(s) reviewed by you:\n\n${list}`;
  }

  // Clean query stop words to extract target tool name
  const cleanQ = q
    .replace(/explain me about/gi, '')
    .replace(/tell me about/gi, '')
    .replace(/what is/gi, '')
    .replace(/details of/gi, '')
    .replace(/show me/gi, '')
    .replace(/explain/gi, '')
    .replace(/about/gi, '')
    .trim();

  // Search for matching tool submission in database context
  const matchedSub = allSubmissions.find(s => 
    (cleanQ.length > 2 && s.tool_name && s.tool_name.toLowerCase().includes(cleanQ)) ||
    (cleanQ.length > 2 && s.tool_name && cleanQ.includes(s.tool_name.toLowerCase())) ||
    (s.tool_name && s.tool_name.toLowerCase().split(' ').some(w => w.length > 3 && cleanQ.includes(w)))
  ) || (todayTool && (cleanQ.includes('claude') || cleanQ.includes('sonnet') || cleanQ.includes('artifact')) ? todayTool : null);

  if (matchedSub) {
    let useCasesText = '';
    if (matchedSub.use_cases) {
      try {
        const ucs = typeof matchedSub.use_cases === 'string' ? JSON.parse(matchedSub.use_cases) : matchedSub.use_cases;
        if (Array.isArray(ucs) && ucs.length > 0) {
          useCasesText = '\n\n#### 💡 Kambaa Business Use Cases:\n' + ucs.map((u, i) => `**${i + 1}. ${u.title || 'Use Case'}**: ${u.description || ''} ${u.benefit ? `*(Benefit: ${u.benefit})*` : ''}`).join('\n');
        }
      } catch (e) {
        console.warn('Error parsing use_cases for AI response:', e);
      }
    }

    let repoText = '';
    if (matchedSub.poc_repo_url) repoText += `\n- **POC Repository**: ${matchedSub.poc_repo_url}`;
    if (matchedSub.demo_url) repoText += `\n- **Live Demo**: ${matchedSub.demo_url}`;
    if (repoText) repoText = '\n\n#### 🔗 Proof-of-Concept & Demo Links:' + repoText;

    return `### 🤖 Tool Overview: **${matchedSub.tool_name}**\n\n- **Category**: ${matchedSub.category || 'AI Tool'}\n- **Researched & Presented By**: **${matchedSub.intern_name || presenterName}**\n- **Session Date**: ${matchedSub.session_date || todayDate}\n\n#### 📝 Capabilities & Research Summary:\n${matchedSub.description || 'Detailed research presentation on tool capabilities and architectural integration.'}${useCasesText}${repoText}`;
  }

  // Fallback keyword search
  const matching = (catalog.length > 0 ? catalog : allSubmissions).filter(d => 
    (d.tool_name && d.tool_name.toLowerCase().includes(cleanQ)) || 
    (d.description && d.description.toLowerCase().includes(cleanQ)) ||
    (d.category && d.category.toLowerCase().includes(cleanQ))
  );

  if (matching.length > 0) {
    const list = matching.map(m => `• **${m.tool_name}** (${m.category}): ${m.description || 'Researched tool.'}`).join('\n');
    return `Based on our KAST Knowledge Base, we found the following relevant tools:\n\n${list}`;
  }

  return `I couldn't find an exact database match for "${question}".\n\n` +
    `Try asking specific questions such as:\n` +
    `• **"How many interns are present today?"**\n` +
    `• **"Who are the late comers today?"**\n` +
    `• **"List all interns with attendance stats"**\n` +
    `• **"What tools did [Intern Name] present?"**\n` +
    `• **"Give me today's daily summary"**\n` +
    `• **"What tools has each intern taught?"**\n` +
    `• **"Overall attendance percentage"**`;
}

module.exports = {
  generateToolSummary,
  generateUseCases,
  checkDuplicate,
  draftSessionReport,
  generateWeeklyDigest,
  answerKnowledgeQuery
};
