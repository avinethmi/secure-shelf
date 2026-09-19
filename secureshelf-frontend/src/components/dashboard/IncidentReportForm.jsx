import React, { useState } from 'react';

export default function IncidentReportForm({ onAddIncident }) {
  const [type, setType] = useState('Unauthorized Access');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    const newIncident = {
      type,
      severity,
      description: description.trim()
    };

    onAddIncident(newIncident);

    // Reset description
    setDescription('');
    setType('Unauthorized Access');
    setSeverity('Medium');
  };

  return (
    <div className="publish-card">
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="incident-type">Incident Type</label>
          <select
            id="incident-type"
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

        <div className="form-row">
          <label htmlFor="incident-severity">Severity Level</label>
          <select
            id="incident-severity"
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

        <div className="form-row">
          <label htmlFor="incident-desc">Description</label>
          <textarea
            id="incident-desc"
            placeholder="Enter incident details (e.g., suspicious activity, physical security breach)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-primary">
          Report Incident
        </button>
      </form>
    </div>
  );
}