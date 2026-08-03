import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import RatingStars from '../components/RatingStars';
import { Target, CheckCircle2, AlertCircle, Layers, ExternalLink, Send } from 'lucide-react';

export default function ImpactTracker() {
  const [impactRecords, setImpactRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [adopted, setAdopted] = useState(false);
  const [adoptedProject, setAdoptedProject] = useState('');
  const [impactNotes, setImpactNotes] = useState('');
  const [impactRating, setImpactRating] = useState(5);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const loadData = async () => {
    try {
      const res = await API.get('/impact');
      if (res.success) setImpactRecords(res.data);
    } catch (err) {
      console.error('Error loading impact records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectRecord = (rec) => {
    setSelectedRecord(rec);
    setAdopted(rec.adopted ? true : false);
    setAdoptedProject(rec.adopted_project || '');
    setImpactNotes(rec.impact_notes || '');
    setImpactRating(rec.impact_rating || 5);
    setMsg(null);
  };

  const handleSaveImpact = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setSubmitting(true);
    setMsg(null);

    try {
      const res = await API.post('/impact', {
        submissionId: selectedRecord.id,
        adopted,
        adoptedProject,
        impactNotes,
        impactRating
      });

      if (res.success) {
        setMsg('Impact tracking updated! (+100 adoption bonus points awarded to intern).');
        loadData();
      }
    } catch (err) {
      setMsg('Error updating impact record: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="kast-container" style={{ textAlign: 'center', paddingTop: '60px', color: '#0f172a' }}>Loading Impact Tracker...</div>;
  }

  return (
    <div className="kast-container">
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}>
          <Target size={28} color="#4338ca" /> Kambaa Production Impact Tracker
        </h1>
        <p style={{ color: '#475569', fontSize: '0.95rem' }}>
          Follow up weeks after presentations to track which tools got real adoption in active Kambaa client projects.
        </p>
      </div>

      <div className="kast-grid-2" style={{ gap: '24px' }}>
        
        {/* Left Side: Researched Tools List */}
        <div className="kast-card" style={{ background: '#ffffff', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
              Select Researched Tool ({impactRecords.length})
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
              Live Catalog
            </span>
          </div>

          {impactRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <Layers size={36} color="#94a3b8" style={{ marginBottom: '10px' }} />
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>No Tool Research Records Available</p>
              <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Submit tool research through the "Tool Submission" tab to track production impact here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
              {impactRecords.map((rec) => {
                const isSelected = selectedRecord?.id === rec.id;
                return (
                  <div 
                    key={rec.id}
                    onClick={() => handleSelectRecord(rec)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: isSelected ? '#f0f4ff' : '#ffffff',
                      border: `1px solid ${isSelected ? '#818cf8' : '#e2e8f0'}`,
                      boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.12)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease-in-out'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.98rem', fontWeight: 700, color: isSelected ? '#312e81' : '#0f172a' }}>
                        {rec.tool_name}
                      </span>
                      <span className={`kast-badge ${rec.adopted ? 'kast-badge-live' : 'kast-badge-primary'}`}>
                        {rec.adopted ? '✓ ADOPTED' : 'EVALUATING'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Researched by: <strong style={{ color: '#0f172a' }}>{rec.intern_name}</strong></span>
                      <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>
                        {rec.category || 'AI Tool'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Impact Review Form */}
        <div className="kast-card" style={{ background: '#ffffff', border: '1px solid #cbd5e1' }}>
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
              Production Adoption & Impact Review
            </h3>
          </div>

          {!selectedRecord ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <Target size={42} color="#818cf8" style={{ marginBottom: '12px', opacity: 0.8 }} />
              <h4 style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 700, marginBottom: '6px' }}>Select a Tool to Review</h4>
              <p style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '320px', margin: '0 auto' }}>
                Click on any researched tool from the left list to update its adoption status, assigned project, and ROI notes.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveImpact} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {msg && (
                <div style={{ padding: '12px', borderRadius: '10px', background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} /> {msg}
                </div>
              )}

              <div>
                <label className="kast-label">Target Tool Name</label>
                <input 
                  type="text" 
                  className="kast-input" 
                  value={selectedRecord.tool_name} 
                  readOnly 
                  style={{ background: '#f8fafc', fontWeight: 700, color: '#0f172a' }}
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="checkbox" 
                  id="adoptedCheck" 
                  checked={adopted} 
                  onChange={(e) => setAdopted(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#4338ca' }}
                />
                <div>
                  <label htmlFor="adoptedCheck" style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'block' }}>
                    Tool Adopted in Live Production Project
                  </label>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Checking this awards +100 bonus points to intern ({selectedRecord.intern_name}).
                  </span>
                </div>
              </div>

              <div>
                <label className="kast-label">Production Project Name</label>
                <input 
                  type="text" 
                  className="kast-input" 
                  placeholder="e.g. Kambaa Client Portal v2, Automated Bot Engine..."
                  value={adoptedProject}
                  onChange={(e) => setAdoptedProject(e.target.value)}
                />
              </div>

              <div>
                <label className="kast-label">Production Impact Rating (1 to 5 Stars)</label>
                <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'inline-block' }}>
                  <RatingStars rating={impactRating} onChange={setImpactRating} />
                </div>
              </div>

              <div>
                <label className="kast-label">Impact & Business ROI Notes</label>
                <textarea 
                  className="kast-textarea" 
                  rows={3} 
                  placeholder="Describe measurable business impact (e.g. reduced UI prototyping time by 45%, saves 15 dev hours/week)..."
                  value={impactNotes}
                  onChange={(e) => setImpactNotes(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="kast-btn kast-btn-primary" 
                style={{ padding: '12px', fontSize: '0.95rem', width: '100%' }} 
                disabled={submitting}
              >
                <Send size={16} /> {submitting ? 'Saving Review...' : 'Save Impact Review & Award Bonus Points'}
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
}
