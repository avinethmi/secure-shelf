import React, { useState } from 'react';

export default function CashierDashboard({ onReportIncident }) {
  const [type, setType] = useState('Unauthorized Access');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');

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

    setIncidents((prev) => [newIncident, ...prev]);

    if (onReportIncident) {
      onReportIncident(newIncident);
    }

    setDescription('');
    setType('Unauthorized Access');
    setSeverity('Medium');
    setSuccessMsg('Incident reported successfully.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="dashboard-container">
      <h1>Cashier Workspace</h1>
      
      <section className="section-container">
        <h2>Report Security Incident</h2>
        {successMsg && <p className="success-text" style={{ color: '#15803d', fontWeight: 600 }}>{successMsg}</p>}

        <form onSubmit={handleIncidentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group-row" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="incident-type" style={{ fontWeight: 600 }}>Incident Type</label>
            <select
              id="incident-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
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
            <label htmlFor="incident-severity" style={{ fontWeight: 600 }}>Severity Level</label>
            <select
              id="incident-severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
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
            <label htmlFor="incident-desc" style={{ fontWeight: 600 }}>Description</label>
            <textarea
              id="incident-desc"
              placeholder="Enter incident details (e.g., suspicious activity, physical security breach)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', minHeight: '80px', padding: '10px', boxSizing: 'border-box' }}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ height: '42px', fontSize: '15px' }}>
            Report Incident
          </button>
        </form>
      </section>
    </div>
  );
}