import React, { useState } from 'react';
import { Upload, FileText, Trash2, Video, Presentation, File, CheckCircle2 } from 'lucide-react';
import API from '../utils/api';

export default function FileUploadCard({ submissionId, existingDocs = [], onDocsUpdated }) {
  const [uploadingCategory, setUploadingCategory] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = async (e, categoryLabel) => {
    const file = e.target.files[0];
    if (!file || !submissionId) return;

    setUploadingCategory(categoryLabel);
    setError(null);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('submissionId', submissionId);

    try {
      await API.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (onDocsUpdated) onDocsUpdated();
    } catch (err) {
      setError(err.message || 'File upload failed');
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await API.delete(`/documents/${docId}`);
      if (onDocsUpdated) onDocsUpdated();
    } catch (err) {
      setError(err.message || 'Failed to delete file');
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <label className="kast-label" style={{ fontSize: '0.9rem', color: '#0f172a', marginBottom: '12px' }}>
        Attach Presentation Files, Research Documents & Demo Video:
      </label>

      {error && (
        <div style={{ background: '#ffe4e6', border: '1px solid #fecdd3', color: '#9f1239', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {submissionId ? (
        <div className="kast-grid-3" style={{ gap: '14px' }}>
          
          {/* 1. PPT / Presentation Slides Dropzone */}
          <label style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '16px',
            background: '#ffffff',
            cursor: uploadingCategory ? 'wait' : 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}>
            <Presentation size={24} color="#4338ca" style={{ marginBottom: '6px' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
              {uploadingCategory === 'ppt' ? 'Uploading PPT...' : 'Upload PPT / Slides'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
              .ppt, .pptx, .pdf
            </span>
            <input 
              type="file" 
              accept=".ppt,.pptx,.pdf"
              style={{ display: 'none' }} 
              onChange={(e) => handleFileChange(e, 'ppt')}
              disabled={!!uploadingCategory}
            />
          </label>

          {/* 2. Research Documents Dropzone */}
          <label style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '16px',
            background: '#ffffff',
            cursor: uploadingCategory ? 'wait' : 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}>
            <FileText size={24} color="#059669" style={{ marginBottom: '6px' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
              {uploadingCategory === 'doc' ? 'Uploading Document...' : 'Upload Research Docs'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
              .pdf, .docx, .txt, .zip
            </span>
            <input 
              type="file" 
              accept=".pdf,.docx,.doc,.txt,.zip"
              style={{ display: 'none' }} 
              onChange={(e) => handleFileChange(e, 'doc')}
              disabled={!!uploadingCategory}
            />
          </label>

          {/* 3. Demo Video Dropzone */}
          <label style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '16px',
            background: '#ffffff',
            cursor: uploadingCategory ? 'wait' : 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}>
            <Video size={24} color="#db2777" style={{ marginBottom: '6px' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
              {uploadingCategory === 'video' ? 'Uploading Video...' : 'Upload Demo Video'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
              .mp4, .webm, .mov (Max 100MB)
            </span>
            <input 
              type="file" 
              accept=".mp4,.webm,.mov,.mkv"
              style={{ display: 'none' }} 
              onChange={(e) => handleFileChange(e, 'video')}
              disabled={!!uploadingCategory}
            />
          </label>

        </div>
      ) : (
        <div style={{ fontSize: '0.82rem', color: '#64748b', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          💡 Click "Final Submit Tool Research" below to save initial tool details, then attach your PPT presentation slides, research documents, and demo video recordings.
        </div>
      )}

      {/* Existing Uploaded Documents List */}
      {existingDocs.length > 0 && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3730a3' }}>
            Uploaded Presentation & Research Files ({existingDocs.length}):
          </div>
          {existingDocs.map((doc) => {
            const ext = doc.file_name.split('.').pop()?.toLowerCase();
            const isVideo = ['mp4', 'webm', 'mov', 'mkv'].includes(ext);
            const isPPT = ['ppt', 'pptx'].includes(ext);

            return (
              <div key={doc.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isVideo ? <Video size={16} color="#db2777" /> : isPPT ? <Presentation size={16} color="#4338ca" /> : <FileText size={16} color="#059669" />}
                  <a 
                    href={doc.file_path} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}
                  >
                    {doc.file_name}
                  </a>
                </div>
                <button 
                  type="button"
                  onClick={() => handleDelete(doc.id)} 
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  title="Delete file"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
