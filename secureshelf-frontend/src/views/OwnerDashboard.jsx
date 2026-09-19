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
  const [localCctvLogs, setLocalCctvLogs] = useState(() => {
    const saved = localStorage.getItem('secureShelf_cctvLogs');
    return saved ? JSON.parse(saved) : (initialCctvLogs || []);
  });

  const [camera, setCamera] = useState('');
  const [reason, setReason] = useState('');

  // Incident Form State
  const [incidentType, setIncidentType] = useState('Unauthorized Access');
  const [incidentSeverity, setIncidentSeverity] = useState('Medium');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [ownerIncidents, setOwnerIncidents] = useState([]);

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

    setLocalCctvLogs((prev) => [newLog, ...prev]);

    if (onAddCCTVLog) {
      onAddCCTVLog(newLog);
    }

    setCamera('');
    setReason('');
  };

  const handleDeleteCCTVLog = (idToDelete) => {
    setLocalCctvLogs((prev) => prev.filter((log) => log.id !== idToDelete));
  };

  const handleIncidentSubmit = (e) => {
    e.preventDefault();
    if (!incidentDesc.trim()) return;

    const newIncident = {
      id: `INC-${Date.now().toString().slice(-6)}`,
      reportedBy: 'Owner',
      type: incidentType,
      severity: incidentSeverity,
      description: incidentDesc.trim(),
      timestamp: new Date().toLocaleString()
    };

    setOwnerIncidents((prev) => [newIncident, ...prev]);

    if (onReportIncident) {
      onReportIncident(newIncident);
    }

    setIncidentDesc('');
    setIncidentType('Unauthorized Access');
    setIncidentSeverity('Medium');
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
        <form onSubmit={handleIncidentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group-row" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="owner-incident-type" style={{ fontWeight: 600 }}>Incident Type</label>
            <select
              id="owner-incident-type"
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              required
            >
              <option value="Unauthorized Access">Unauthorized Access</option>
              <option value="Suspicious Activity">Suspicious Activity</option>
              <option value="Policy Violation">Policy Violation</option>
              <option value="Hardware / Register Issue">Hardware / Register Issue</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group-row" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="owner-incident-severity" style={{ fontWeight: 600 }}>Severity Level</label>
            <select
              id="owner-incident-severity"
              value={incidentSeverity}
              onChange={(e) => setIncidentSeverity(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              required
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="form-group-row" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="owner-incident-desc" style={{ fontWeight: 600 }}>Description</label>
            <textarea
              id="owner-incident-desc"
              placeholder="Describe the security incident in detail..."
              value={incidentDesc}
              onChange={(e) => setIncidentDesc(e.target.value)}
              style={{ width: '100%', minHeight: '80px', padding: '10px', boxSizing: 'border-box' }}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ height: '42px', fontSize: '15px' }}>
            Report Incident
          </button>
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