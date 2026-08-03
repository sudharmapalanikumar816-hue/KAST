import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { BookOpen, Search, Filter, Calendar, User, ExternalLink, Layers } from 'lucide-react';

export default function ToolCatalog() {
  const [tools, setTools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTools = async () => {
    try {
      let url = '/tool-catalog?';
      if (selectedCat) url += `category=${encodeURIComponent(selectedCat)}&`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}`;

      const res = await API.get(url);
      if (res.success) {
        setTools(res.data.tools || []);
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      console.error('Error loading tool catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, [selectedCat]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTools();
  };

  if (loading) {
    return <div className="kast-container" style={{ textAlign: 'center', paddingTop: '60px', color: '#0f172a' }}>Loading Tool Catalog Archive...</div>;
  }

  return (
    <div className="kast-container">
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={26} color="#4338ca" /> Kambaa AI Tool Catalog Archive
        </h1>
        <p style={{ color: '#475569', fontSize: '0.95rem' }}>
          Searchable repository of all AI tools researched, tested, and presented during Kambaa daily sessions.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="kast-card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <Search size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '14px' }} />
            <input 
              type="text" 
              className="kast-input" 
              placeholder="Search tools by name, description, capabilities..." 
              style={{ paddingLeft: '40px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            className="kast-select" 
            value={selectedCat} 
            onChange={(e) => setSelectedCat(e.target.value)}
            style={{ flex: '1 1 180px' }}
          >
            <option value="">All Categories</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>

          <button type="submit" className="kast-btn kast-btn-primary" style={{ minWidth: '100px' }}>
            Search
          </button>
        </form>
      </div>

      {/* Tools Grid */}
      {tools.length === 0 ? (
        <div className="kast-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#64748b' }}>No AI tools found matching your search criteria.</p>
        </div>
      ) : (
        <div className="kast-grid-auto">
          {tools.map((tool) => (
            <div key={tool.id} className="kast-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a' }}>{tool.tool_name}</h3>
                  <span className="kast-badge kast-badge-primary">
                    {tool.category || 'AI Tool'}
                  </span>
                </div>

                <p style={{ color: '#334155', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '16px' }}>
                  {tool.embedding_summary || 'Researched and demonstrated during daily 9:00 AM Kambaa session.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                <div>
                  Presented by: <strong style={{ color: '#0f172a' }}>{tool.first_presenter_name || 'Intern'}</strong>
                </div>
                <div style={{ background: '#e0e7ff', padding: '2px 8px', borderRadius: '10px', color: '#3730a3', fontWeight: 700 }}>
                  Presented {tool.times_presented || 1}x
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
