import React, { useState } from 'react';

export default function CashierDashboard({ onReportIncident }) {
  const [type, setType] = useState('Unauthorized Access');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [incidents, setIncidents] = useState([]);

  const handleIncidentSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    const newIncident = {
      id: `INC-${Date.now().toString().slice(-6)}`,
      reportedBy: 'Cashier',
      type,
      severity,
      description: description.trim(),
      timestamp: new Date().toLocaleString()
    };

    // Update local table state
    setIncidents((prev) => [newIncident, ...prev]);

    // Send data to parent handler if supplied
    if (onReportIncident) {
      onReportIncident(newIncident);
    }

    // Reset inputs
    setDescription('');
    setType('Unauthorized Access');
    setSeverity('Medium');
  };

  return (
    <div className="dashboard-container">
      <h1>Cashier Workspace</h1>

      {/* Incident Form Card */}
      <div className="section-container">
        <div className="publish-card">
          <h2>Report Security Incident</h2>
          <form onSubmit={handleIncidentSubmit}>
            <div className="form-field-group">
              <label htmlFor="cashier-incident-type">Incident Type</label>
              <div className="select-wrapper">
                <select
                  id="cashier-incident-type"
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
              <label htmlFor="cashier-incident-severity">Severity Level</label>
              <div className="select-wrapper">
                <select
                  id="cashier-incident-severity"
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
              <label htmlFor="cashier-incident-desc">Description</label>
              <textarea
                id="cashier-incident-desc"
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="publish-btn">
              Report Incident
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}