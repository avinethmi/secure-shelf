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
  // CCTV State
  const [localCctvLogs, setLocalCctvLogs] = useState(() => {
    const saved = localStorage.getItem('secureShelf_cctvLogs');
    return saved ? JSON.parse(saved) : (initialCctvLogs || []);
  });
  const [camera, setCamera] = useState('');
  const [reason, setReason] = useState('');

  // Incident State
  const [type, setType] = useState('Unauthorized Access');
  const [severity, setSeverity] = useState('Medium');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    localStorage.setItem('secureShelf_cctvLogs', JSON.stringify(localCctvLogs));
  }, [localCctvLogs]);

  const handleCCTVSubmit = (e) => {
    e.preventDefault();
    if (!camera.trim() || !reason.trim()) return;

    const newLog = { 
      id: `LOG-${Date.now().toString().slice(-6)}`, 
      camera: camera.trim(), 
      reason: reason.trim(), 
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
      type,
      severity,
      description: incidentDesc.trim(),
      timestamp: new Date().toLocaleString()
    };

    setIncidents((prev) => [newIncident, ...prev]);

    if (onReportIncident) {
      onReportIncident(newIncident);
    }

    setIncidentDesc('');
    setType('Unauthorized Access');
    setSeverity('Medium');
  };

  return (
    <div className="dashboard-container">
      <h1>Owner Workspace</h1>

      {/* CCTV Data Management Section */}
      <section className="section-container">
        <div className="publish-card">
          <h2>CCTV Governance &amp; Log Records</h2>
          <form onSubmit={handleCCTVSubmit}>
            <div className="form-field-group">
              <label htmlFor="cctv-camera">Camera / Location</label>
              <input
                id="cctv-camera"
                type="text"
                placeholder="Camera Location / ID"
                value={camera}
                onChange={(e) => setCamera(e.target.value)}
                required
              />
            </div>
            <div className="form-field-group">
              <label htmlFor="cctv-reason">Access Reason</label>
              <input
                id="cctv-reason"
                type="text"
                placeholder="Access Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="publish-btn">
              Save CCTV Log Data
            </button>
          </form>
        </div>

        <div className="card-box" style={{ marginTop: '24px' }}>
          <h3>Logged CCTV Access Data</h3>
          <div className="table-responsive">
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
                    <td colSpan="5" style={{ textAlign: 'center', padding: '16px' }}>
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
                          className="danger-btn"
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
          </div>
        </div>
      </section>

      {/* Incident Reporting Section */}
      <section className="section-container">
        <div className="publish-card">
          <h2>Report Security Incident</h2>
          <form onSubmit={handleIncidentSubmit}>
            <div className="form-field-group">
              <label htmlFor="owner-incident-type">Incident Type</label>
              <div className="select-wrapper">
                <select
                  id="owner-incident-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                >
                  <option value="Unauthorized Access">Unauthorized Access</option>
                  <option value="Suspicious Activity">Suspicious Activity</option>
                  <option value="Policy Violation">Policy Violation</option>
                  <option value="Hardware / Register Issue">Hardware / Register Issue</option>
                </select>
              </div>
            </div>

            <div className="form-field-group">
              <label htmlFor="owner-incident-severity">Severity Level</label>
              <div className="select-wrapper">
                <select
                  id="owner-incident-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  required
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="form-field-group">
              <label htmlFor="owner-incident-desc">Description</label>
              <textarea
                id="owner-incident-desc"
                placeholder="Describe the security incident..."
                value={incidentDesc}
                onChange={(e) => setIncidentDesc(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="publish-btn">
              Report Incident
            </button>
          </form>
        </div>
      </section>

      {/* Policy Management Section */}
      <PolicyManagerTable
        policies={policies}
        userRole="Owner"
        onPublishPolicy={onPublishPolicy}
        onRemovePolicy={onRemovePolicy}
      />
    </div>
  );
}