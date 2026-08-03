import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../utils/api';
import FileUploadCard from '../components/FileUploadCard';
import { 
  Sparkles, AlertTriangle, CheckCircle2, Link2, Code, 
  FileText, ArrowLeft, Send, Presentation, Video
} from 'lucide-react';

export default function SubmissionForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');

  const [sessionId, setSessionId] = useState('');
  const [toolName, setToolName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [category, setCategory] = useState('LLM & Code Gen');
  const [description, setDescription] = useState('');
  const [presentationNotes, setPresentationNotes] = useState('');
  const [pocRepoUrl, setPocRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');

  // AI Use Cases state
  const [useCases, setUseCases] = useState([
    { title: '', description: '', benefit: '' }
  ]);

  // AI Duplicate Check State
  const [checkingDup, setCheckingDup] = useState(false);
  const [dupResult, setDupResult] = useState(null);

  // AI Summary & Use-case generating state
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingCases, setGeneratingCases] = useState(false);

  // Saved Submission state
  const [savedSubmissionId, setSavedSubmissionId] = useState(null);
  const [existingDocs, setExistingDocs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        if (editId) {
          const res = await API.get(`/submissions/${editId}`);
          if (res.success && res.data) {
            const sub = res.data;
            setSavedSubmissionId(sub.id);
            setSessionId(sub.session_id);
            setToolName(sub.tool_name || '');
            setSourceUrl(sub.source_url || '');
            setCategory(sub.category || 'LLM & Code Gen');
            setDescription(sub.description || '');
            setPresentationNotes(sub.presentation_notes || '');
            setPocRepoUrl(sub.poc_repo_url || '');
            setDemoUrl(sub.demo_url || '');
            if (sub.use_cases) {
              try {
                setUseCases(typeof sub.use_cases === 'string' ? JSON.parse(sub.use_cases) : sub.use_cases);
              } catch (e) {
                console.error('Failed to parse use_cases JSON:', e);
              }
            }
          }
        } else {
          const res = await API.get('/sessions/today');
          if (res.success && res.data.session) {
            setSessionId(res.data.session.id);
            if (res.data.submission) {
              const sub = res.data.submission;
              setSavedSubmissionId(sub.id);
              setToolName(sub.tool_name);
              setSourceUrl(sub.source_url || '');
              setCategory(sub.category || 'LLM & Code Gen');
              setDescription(sub.description || '');
              setPresentationNotes(sub.presentation_notes || '');
              setPocRepoUrl(sub.poc_repo_url || '');
              setDemoUrl(sub.demo_url || '');
              if (sub.use_cases) {
                try {
                  setUseCases(typeof sub.use_cases === 'string' ? JSON.parse(sub.use_cases) : sub.use_cases);
                } catch (e) {
                  console.error('Failed to parse use_cases JSON:', e);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching session/submission:', err);
      }
    }
    loadData();
  }, [editId]);

  const loadDocs = async () => {
    if (!savedSubmissionId) return;
    try {
      const res = await API.get(`/documents/${savedSubmissionId}`);
      if (res.success) setExistingDocs(res.data);
    } catch (err) {
      console.error('Error loading docs:', err);
    }
  };

  useEffect(() => {
    if (savedSubmissionId) loadDocs();
  }, [savedSubmissionId]);

  const handleCheckDuplicate = async () => {
    if (!toolName) {
      setError('Please enter a tool name first.');
      return;
    }
    setError(null);
    setCheckingDup(true);
    setDupResult(null);

    try {
      const res = await API.post('/submissions/check-duplicate', { toolName, description });
      if (res.success) {
        setDupResult(res.data);
      }
    } catch (err) {
      setError('Duplicate check failed: ' + err.message);
    } finally {
      setCheckingDup(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!toolName) {
      setError('Please enter a tool name first.');
      return;
    }
    setError(null);
    setGeneratingSummary(true);

    try {
      const res = await API.post('/submissions/generate-summary', { toolName, presentationNotes, description });
      if (res.success && res.data.summary) {
        setDescription(res.data.summary);
      }
    } catch (err) {
      setError('AI Summary generation failed: ' + err.message);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleGenerateUseCases = async () => {
    if (!toolName) {
      setError('Please enter a tool name first.');
      return;
    }
    setError(null);
    setGeneratingCases(true);

    try {
      const res = await API.post('/submissions/generate-value', { toolName, description });
      if (res.success && res.data.useCases) {
        setUseCases(res.data.useCases);
      }
    } catch (err) {
      setError('AI Use-case generation failed: ' + err.message);
    } finally {
      setGeneratingCases(false);
    }
  };

  const handleUseCaseChange = (index, field, value) => {
    const updated = [...useCases];
    updated[index][field] = value;
    setUseCases(updated);
  };

  const addUseCaseRow = () => {
    setUseCases([...useCases, { title: '', description: '', benefit: '' }]);
  };

  const resetForm = () => {
    setToolName('');
    setSourceUrl('');
    setCategory('LLM & Code Gen');
    setDescription('');
    setPresentationNotes('');
    setPocRepoUrl('');
    setDemoUrl('');
    setUseCases([{ title: '', description: '', benefit: '' }]);
    setDupResult(null);
    setSavedSubmissionId(null);
    setExistingDocs([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const payload = {
        sessionId,
        toolName,
        sourceUrl,
        category,
        description,
        presentationNotes,
        useCases,
        pocRepoUrl,
        demoUrl,
        status: 'submitted'
      };

      let res;
      if (editId || savedSubmissionId) {
        res = await API.put(`/submissions/${editId || savedSubmissionId}`, payload);
      } else {
        res = await API.post('/submissions', payload);
      }

      if (res.success) {
        alert('Tool presentation submitted successfully!');
        setSuccessMsg(res.message || 'Tool presentation submitted successfully!');
        resetForm();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit tool research');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFillSample = () => {
    setToolName('Claude 3.5 Sonnet Artifacts & Agentic Workflows');
    setSourceUrl('https://github.com/anthropics/anthropic-quickstarts');
    setCategory('LLM & Code Gen');
    setPresentationNotes(`1. Introduction to Claude 3.5 Sonnet & Artifacts UI environment.
2. Demonstrating real-time React component generation & live preview.
3. Showcasing agentic tool use and code execution for Kambaa client projects.
4. Q&A and technical architecture breakdown.`);
    setDescription(`Claude 3.5 Sonnet sets a new industry benchmark for coding and agentic reasoning. Its Artifacts feature enables dynamic preview and iterative refinement of UI components, interactive web apps, and system architecture diagrams directly within the chat interface.`);
    setUseCases([
      {
        title: 'Rapid Client UI Mockups & Prototyping',
        description: 'Generating interactive React/Vite frontends with custom CSS in real-time during sales discovery calls.',
        benefit: 'Reduces initial UI mockup delivery time from 3 days to 45 minutes.'
      },
      {
        title: 'Automated Codebase Refactoring & Documentation',
        description: 'Analyzing backend REST API routes and database schemas to auto-generate OpenAPI documentation and TypeScript definitions.',
        benefit: 'Saves ~12 engineering hours per sprint across active Kambaa projects.'
      }
    ]);
    setPocRepoUrl('https://github.com/kambaa-org/claude-artifacts-poc');
    setDemoUrl('https://claude-artifacts-demo.kambaa.app');
  };

  return (
    <div className="kast-container" style={{ maxWidth: '950px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button 
          onClick={() => navigate(-1)} 
          className="kast-btn kast-btn-secondary" 
          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <button 
          type="button"
          onClick={handleAutoFillSample}
          className="kast-btn"
          style={{ 
            background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', 
            color: '#3730a3', 
            border: '1px solid #a5b4fc', 
            fontWeight: 700, 
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Sparkles size={16} color="#4338ca" /> ⚡ Auto-Fill Sample Data
        </button>
      </div>

      <div className="kast-card">
        <h1 style={{ fontSize: '1.6rem', color: '#0f172a', marginBottom: '8px' }}>
          Daily AI Tool Research & Presentation Submission
        </h1>
        <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '24px' }}>
          Must be submitted ahead of the morning 9:00 AM session. Attach your PPT slides, research docs, demo video, presentation notes, and Kambaa use cases.
        </p>

        {error && (
          <div style={{ background: '#ffe4e6', border: '1px solid #fecdd3', color: '#9f1239', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} /> {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tool Name & AI Duplicate Checker Row */}
          <div className="kast-grid-2" style={{ alignItems: 'flex-end' }}>
            <div>
              <label className="kast-label">Tool Name *</label>
              <input 
                type="text" 
                className="kast-input" 
                placeholder="e.g. Claude 3.5 Sonnet Artifacts, V0 by Vercel..." 
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                required
              />
            </div>
            <button 
              type="button" 
              onClick={handleCheckDuplicate} 
              className="kast-btn kast-btn-ai"
              style={{ padding: '12px 16px', fontSize: '0.85rem', width: '100%' }}
              disabled={checkingDup}
            >
              <Sparkles size={16} /> {checkingDup ? 'Checking...' : 'Check Duplicate (AI)'}
            </button>
          </div>

          {/* AI Duplicate Result Warning Banner */}
          {dupResult && (
            <div style={{
              background: dupResult.isDuplicate ? '#fef3c7' : '#d1fae5',
              border: `1px solid ${dupResult.isDuplicate ? '#fde68a' : '#a7f3d0'}`,
              color: dupResult.isDuplicate ? '#92400e' : '#065f46',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.88rem'
            }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {dupResult.isDuplicate ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                {dupResult.isDuplicate ? `Similarity Alert (${dupResult.similarityScore}%)` : 'Catalog Distinction Verified'}
              </div>
              <div>{dupResult.reason}</div>
            </div>
          )}

          {/* Source URL & Category */}
          <div className="kast-grid-2">
            <div>
              <label className="kast-label">Source URL (LinkedIn, Product Hunt, GitHub)</label>
              <input 
                type="url" 
                className="kast-input" 
                placeholder="https://github.com/..." 
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="kast-label">Category</label>
              <select className="kast-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="LLM & Code Gen">LLM & Code Gen</option>
                <option value="Frontend Automation">Frontend Automation</option>
                <option value="Agentic Workflows">Agentic Workflows</option>
                <option value="Database & RAG">Database & RAG</option>
                <option value="Testing & QA Automation">Testing & QA Automation</option>
                <option value="DevOps & Infrastructure">DevOps & Infrastructure</option>
              </select>
            </div>
          </div>

          {/* Presentation Notes & Summary Outline */}
          <div>
            <label className="kast-label">Presentation Notes & Speaker Talking Points</label>
            <textarea 
              className="kast-textarea" 
              rows={3} 
              placeholder="Key talking points, live demonstration steps, and slide outline to present during the 9:00 AM session..." 
              value={presentationNotes}
              onChange={(e) => setPresentationNotes(e.target.value)}
            />
          </div>

          {/* Tool Description & AI Summary Generator Row */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
              <label className="kast-label" style={{ marginBottom: 0 }}>AI Generated Summary & Capabilities Description</label>
              <button 
                type="button" 
                onClick={handleGenerateSummary} 
                className="kast-btn kast-btn-ai"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                disabled={generatingSummary}
              >
                <Sparkles size={14} /> {generatingSummary ? 'Drafting Summary...' : 'Auto-Generate Summary (AI)'}
              </button>
            </div>
            <textarea 
              className="kast-textarea" 
              rows={3} 
              placeholder="Click 'Auto-Generate Summary (AI)' or type full technical description..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* AI Use-Case Generator Section */}
          <div style={{ background: '#f8fafc', border: '1px solid #c7d2fe', padding: '20px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: '#0f172a' }}>AI Generated Kambaa Use Cases (2-3)</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>How will Kambaa leverage this tool in active projects?</p>
              </div>
              <button 
                type="button" 
                onClick={handleGenerateUseCases} 
                className="kast-btn kast-btn-ai"
                style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                disabled={generatingCases}
              >
                <Sparkles size={16} /> {generatingCases ? 'Generating...' : 'Auto-Generate Use Cases (AI)'}
              </button>
            </div>

            {useCases.map((uc, idx) => (
              <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '10px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input 
                  type="text" 
                  className="kast-input" 
                  placeholder={`Use Case #${idx + 1} Title (e.g. Client Portal Preview)`} 
                  value={uc.title}
                  onChange={(e) => handleUseCaseChange(idx, 'title', e.target.value)}
                />
                <textarea 
                  className="kast-textarea" 
                  rows={2} 
                  placeholder="Implementation details..." 
                  value={uc.description}
                  onChange={(e) => handleUseCaseChange(idx, 'description', e.target.value)}
                />
                <input 
                  type="text" 
                  className="kast-input" 
                  placeholder="Business Benefit (e.g. Saves 15 dev hours/week)" 
                  value={uc.benefit}
                  onChange={(e) => handleUseCaseChange(idx, 'benefit', e.target.value)}
                />
              </div>
            ))}

            <button type="button" onClick={addUseCaseRow} className="kast-btn kast-btn-secondary" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              + Add Another Use Case
            </button>
          </div>

          {/* POC Repo & Demo Links */}
          <div className="kast-grid-2">
            <div>
              <label className="kast-label">POC GitHub Repo URL</label>
              <input 
                type="url" 
                className="kast-input" 
                placeholder="https://github.com/kambaa/poc-repo" 
                value={pocRepoUrl}
                onChange={(e) => setPocRepoUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="kast-label">Live Demo / App URL</label>
              <input 
                type="url" 
                className="kast-input" 
                placeholder="https://demo.kambaa.app" 
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
              />
            </div>
          </div>

          {/* UPLOAD PPT, RESEARCH DOCUMENTS & DEMO VIDEO */}
          <FileUploadCard 
            submissionId={savedSubmissionId} 
            existingDocs={existingDocs}
            onDocsUpdated={loadDocs}
          />

          <button 
            type="submit" 
            className="kast-btn kast-btn-primary" 
            style={{ width: '100%', padding: '14px', marginTop: '12px', fontSize: '1rem' }}
            disabled={loading}
          >
            <Send size={18} /> {loading ? 'Saving Submission...' : 'Final Submit Tool Research'}
          </button>

        </form>
      </div>

    </div>
  );
}
