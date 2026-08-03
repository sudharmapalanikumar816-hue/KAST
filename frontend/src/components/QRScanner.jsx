import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { QrCode, CheckCircle2, AlertCircle, MapPin, Camera, Sparkles } from 'lucide-react';

export default function QRScanner({ onScanSuccess }) {
  const [manualToken, setManualToken] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const [locStatus, setLocStatus] = useState('Fetching GPS location...');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch device GPS coordinates on component mount
  const requestGPSLocation = () => {
    setLocStatus('Fetching device GPS location...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          setLocStatus(`GPS Location Verified (Lat: ${pos.coords.latitude.toFixed(6)}, Lng: ${pos.coords.longitude.toFixed(6)})`);
          setError(null);
        },
        (err) => {
          console.warn('Geolocation warning:', err.message);
          setCoords({ latitude: null, longitude: null });
          setLocStatus('GPS Location unavailable or permission denied. Please allow browser location access to check in.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setCoords({ latitude: null, longitude: null });
      setLocStatus('Browser does not support GPS Geolocation.');
    }
  };

  useEffect(() => {
    requestGPSLocation();
  }, []);

  const handleScanSubmit = async (tokenToUse) => {
    const token = tokenToUse || manualToken;
    if (!token) {
      setError('Please scan a QR code or enter the session token.');
      return;
    }

    if (coords.latitude === null || coords.longitude === null) {
      setError('📍 Geofence Check Failed: Device GPS location is required to verify physical presence at Kambaa Office. Please allow location access and click "Fetch / Refresh Device GPS".');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const payload = {
        qrToken: token,
        latitude: coords.latitude,
        longitude: coords.longitude
      };

      const res = await API.post('/attendance/scan', payload);
      if (res.success) {
        setSuccessMsg(res.message || 'Attendance verified at Kambaa Office!');
        setManualToken('');
        if (onScanSuccess) onScanSuccess();
      }
    } catch (err) {
      setError(err.message || 'Attendance check-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kast-card" style={{ borderLeft: '4px solid #7c3aed' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <QrCode size={18} color="#7c3aed" /> Geofenced Phone Attendance Scanner
        </h3>
        {coords.latitude ? (
          <span className="kast-badge kast-badge-live" style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' }}>
            🟢 GEOFENCE VERIFIED
          </span>
        ) : (
          <span className="kast-badge kast-badge-warning" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            🟡 LOCATION PENDING
          </span>
        )}
      </div>

      {/* Geofence Location Status Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: coords.latitude ? '#d1fae5' : '#fffbeb',
        border: `1px solid ${coords.latitude ? '#a7f3d0' : '#fde68a'}`,
        padding: '10px 14px',
        borderRadius: '10px',
        fontSize: '0.82rem',
        color: coords.latitude ? '#065f46' : '#92400e',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MapPin size={18} color={coords.latitude ? '#059669' : '#d97706'} />
          <div>
            <strong>Kambaa Premises Geofence:</strong> Peelamedu, Coimbatore (11.023933, 77.006895)
            <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '2px', fontWeight: 600 }}>{locStatus}</div>
          </div>
        </div>

        <div>
          <button 
            type="button" 
            onClick={requestGPSLocation}
            className="kast-btn kast-btn-secondary"
            style={{ fontSize: '0.75rem', padding: '4px 12px', flexShrink: 0, background: '#ffffff', color: '#059669', border: '1px solid #a7f3d0' }}
          >
            🔄 Fetch / Refresh Device GPS
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#ffe4e6', border: '1px solid #fecdd3', color: '#9f1239', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {successMsg && (
        <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Token Input Fallback / Camera Scanner Input */}
        <div>
          <label className="kast-label">Session QR Token Code</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              className="kast-input" 
              placeholder="e.g. KAST_TOKEN_DEMO..." 
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
            />
            <button 
              type="button" 
              onClick={() => handleScanSubmit()} 
              className="kast-btn kast-btn-primary" 
              style={{ flexShrink: 0 }}
              disabled={loading}
            >
              Check-In Now
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
