import React, { useState, useEffect } from 'react';

export default function CctvGovernanceLogs() {
  // Initialize state from localStorage so data survives a page refresh
  const [cctvLogs, setCctvLogs] = useState(() => {
    const savedLogs = localStorage.getItem('secureShelf_cctvLogs');
    return savedLogs ? JSON.parse(savedLogs) : [];
  });

  const [cameraId, setCameraId] = useState('');
  const [accessReason, setAccessReason] = useState('');

  // Save to localStorage automatically whenever cctvLogs state changes
  useEffect(() => {
    localStorage.setItem('secureShelf_cctvLogs', JSON.stringify(cctvLogs));
  }, [cctvLogs]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cameraId.trim() || !accessReason.trim()) return;

    const newLog = {
      id: `LOG-${Date.now().toString().slice(-6)}`, // Generate a simple unique ID
      camera: cameraId.trim(),
      reason: accessReason.trim(),
      timestamp: new Date().toLocaleString()
    };

    // Add new log to the beginning of the list
    setCctvLogs((prevLogs) => [newLog, ...prevLogs]);
    
    // Clear the input fields
    setCameraId('');
    setAccessReason('');
  };

  return (
    <section className="section-container">
      <h2>CCTV Governance & Log Records</h2>

      {/* Input Form matched to publish-card structure */}
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
    </section>
  );
}