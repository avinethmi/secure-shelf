import React, { useState, useEffect } from 'react';
import PolicyManagerTable from '../components/dashboard/PolicyManagerTable';

export default function OwnerDashboard({
  cctvLogs: initialCctvLogs = [],
  policies,
  onAddCCTVLog,
  onReportIncident,
  onPublishPolicy,
  onRemovePolicy
}) {
  // 1. Initialize state directly from localStorage to keep data after refresh
  const [localCctvLogs, setLocalCctvLogs] = useState(() => {
    const saved = localStorage.getItem('secureShelf_cctvLogs');
    return saved ? JSON.parse(saved) : (initialCctvLogs || []);
  });

  const [camera, setCamera] = useState('');
  const [reason, setReason] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');

  // 2. Automatically sync state updates with localStorage
  useEffect(() => {
    localStorage.setItem('secureShelf_cctvLogs', JSON.stringify(localCctvLogs));
  }, [localCctvLogs]);

  const handleCCTVSubmit = (e) => {
    e.preventDefault();
    const newLog = { 
      id: Date.now(), 
      camera, 
      reason, 
      date: new Date().toLocaleString() 
    };

    // Update internal persistent state
    setLocalCctvLogs((prev) => [newLog, ...prev]);

    // Call parent handler if supplied
    if (onAddCCTVLog) {
      onAddCCTVLog(newLog);
    }

    setCamera('');
    setReason('');
  };

  // 3. Delete button handler
  const handleDeleteCCTVLog = (idToDelete) => {
    setLocalCctvLogs((prev) => prev.filter((log) => log.id !== idToDelete));
  };

  const handleIncidentSubmit = (e) => {
    e.preventDefault();
    onReportIncident({
      id: Date.now(),
      reportedBy: 'Owner',
      description: incidentDesc,
      severity: 'Medium',
      timestamp: new Date().toLocaleString()
    });
    setIncidentDesc('');
    alert('Security incident successfully logged to Security Admin queue.');
  };

  return (
    <div className="dashboard-container">
      <h1>Owner Workspace</h1>

      {/* CCTV Data Management */}
      <section className="section-container">
        <h2>CCTV Governance & Log Records</h2>
        <form onSubmit={handleCCTVSubmit} className="form-group">
          <input
            type="text"
            placeholder="Camera Location / ID"
            value={camera}
            onChange={(e) => setCamera(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Access Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          <button type="submit">Save CCTV Log Data</button>
        </form>

        <h3>Logged CCTV Access Data</h3>
        <table>
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Camera</th>
              <th>Reason</th>
              <th>Timestamp</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {localCctvLogs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '12px' }}>
                  No CCTV access records logged.
                </td>
              </tr>
            ) : (
              localCctvLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.camera}</td>
                  <td>{log.reason}</td>
                  <td>{log.date}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleDeleteCCTVLog(log.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Incident Reporting Section */}
      <section className="section-container">
        <h2>Report Security Incident</h2>
        <form onSubmit={handleIncidentSubmit} className="form-group">
          <textarea
            placeholder="Describe the security incident..."
            value={incidentDesc}
            onChange={(e) => setIncidentDesc(e.target.value)}
            required
          />
          <button type="submit">Report Incident</button>
        </form>
      </section>

      {/* Policy Management Table */}
      <PolicyManagerTable
        policies={policies}
        userRole="Owner"
        onPublishPolicy={onPublishPolicy}
        onRemovePolicy={onRemovePolicy}
      />
    </div>
  );
}