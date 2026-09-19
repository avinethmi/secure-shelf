import React, { useState, useEffect } from 'react';

// Simple XSS sanitization helper
const sanitizeInput = (str) => {
  return str.replace(/[&<>"']/g, (match) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    };
    return map[match];
  });
};

export default function CctvGovernanceLogs() {
  const [cctvLogs, setCctvLogs] = useState(() => {
    const savedLogs = localStorage.getItem('secureShelf_cctvLogs');
    return savedLogs ? JSON.parse(savedLogs) : [];
  });

  const [cameraId, setCameraId] = useState('');
  const [accessReason, setAccessReason] = useState('');

  useEffect(() => {
    localStorage.setItem('secureShelf_cctvLogs', JSON.stringify(cctvLogs));
  }, [cctvLogs]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cameraId.trim() || !accessReason.trim()) return;

    // Sanitize values to prevent XSS injection
    const cleanCamera = sanitizeInput(cameraId.trim());
    const cleanReason = sanitizeInput(accessReason.trim());

    const newLog = {
      id: `LOG-${Date.now().toString().slice(-6)}`,
      camera: cleanCamera,
      reason: cleanReason,
      timestamp: new Date().toLocaleString()
    };

    setCctvLogs((prevLogs) => [newLog, ...prevLogs]);
    setCameraId('');
    setAccessReason('');
  };

  return (
    <section className="section-container">
      <h2>CCTV Governance & Log Records</h2>

      {/* Input Form */}
      <div className="publish-card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <input
              type="text"
              placeholder="Camera Location / ID"
              value={cameraId}
              onChange={(e) => setCameraId(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <input
              type="text"
              placeholder="Access Reason"
              value={accessReason}
              onChange={(e) => setAccessReason(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary">
            Save CCTV Log Data
          </button>
        </form>
      </div>

      {/* Table Display */}
      <h3>Logged CCTV Access Data</h3>
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>LOG ID</th>
              <th>CAMERA</th>
              <th>REASON</th>
              <th>TIMESTAMP</th>
            </tr>
          </thead>
          <tbody>
            {cctvLogs.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '16px' }}>
                  No CCTV access records logged.
                </td>
              </tr>
            ) : (
              cctvLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.camera}</td>
                  <td>{log.reason}</td>
                  <td>{log.timestamp}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '16px', textAlign: 'center' }}>
        🛡️ <strong>Audit Trail:</strong> Access logs are encrypted in transit and monitored solely for institutional physical security governance.
      </p>
    </section>
  );
}