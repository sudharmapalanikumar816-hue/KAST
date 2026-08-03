import React, { useState } from 'react';
import API from '../utils/api';
import { MessageSquare, Send, Sparkles, Bot, User, BookOpen, Presentation, FileText } from 'lucide-react';

export default function KnowledgeBaseChat() {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your KAST AI Assistant. Ask me about intern attendance (present, absent, late comers), tools each intern has presented, daily session summaries, or any program statistics.'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    const userText = inputQuery;
    setInputQuery('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await API.post('/knowledge-base/ask', { question: userText });
      if (res.success) {
        setMessages(prev => [...prev, { sender: 'ai', text: res.data.answer }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Error querying Knowledge Base: ' + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    "How many interns are present today?",
    "Who are the late comers today?",
    "List all interns with attendance stats",
    "Give me today's daily summary",
    "What tools has each intern taught?",
    "Overall attendance percentage"
  ];

  return (
    <div className="kast-container" style={{ maxWidth: '850px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={26} color="#7c3aed" /> Ask AI About Previous Sessions & Research (RAG)
        </h1>
        <p style={{ color: '#475569', fontSize: '0.92rem' }}>
          Ask exact questions about intern attendance, late comers, absentees, tools presented, daily summaries, and program statistics.
        </p>
      </div>

      {/* Suggested Questions Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {sampleQuestions.map((q, idx) => (
          <button 
            key={idx} 
            onClick={() => setInputQuery(q)}
            className="kast-btn kast-btn-secondary" 
            style={{ fontSize: '0.78rem', padding: '4px 10px' }}
          >
            <Sparkles size={12} color="#7c3aed" /> {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Box */}
      <div className="kast-card" style={{ height: '520px', maxHeight: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        
        {/* Messages list */}
        <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {messages.map((m, idx) => (
            <div 
              key={idx} 
              style={{
                display: 'flex',
                gap: '10px',
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '92%'
              }}
            >
              {m.sender === 'ai' && (
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Bot size={20} color="#fff" />
                </div>
              )}

              <div style={{
                background: m.sender === 'user' ? 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' : '#f8fafc',
                border: `1px solid ${m.sender === 'user' ? 'rgba(79, 70, 229, 0.4)' : '#e2e8f0'}`,
                borderRadius: '14px',
                padding: '12px 16px',
                color: m.sender === 'user' ? '#ffffff' : '#0f172a',
                fontSize: '0.92rem',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap'
              }}>
                {m.text}
              </div>

              {m.sender === 'user' && (
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: '#e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <User size={20} color="#3730a3" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '10px', color: '#7c3aed', fontSize: '0.88rem', alignItems: 'center' }}>
              <Sparkles size={16} className="pulse-animation" /> Fetching live attendance, intern, and session data...
            </div>
          )}
        </div>

        {/* Input Box */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '12px' }}>
          <input 
            type="text" 
            className="kast-input" 
            placeholder="Ask about attendance, late comers, intern tools, daily summary..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
          />
          <button type="submit" className="kast-btn kast-btn-ai" style={{ flexShrink: 0 }} disabled={loading}>
            <Send size={16} /> Send
          </button>
        </form>

      </div>

    </div>
  );
}
