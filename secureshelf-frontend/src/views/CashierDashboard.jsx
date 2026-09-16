import React, { useState } from 'react';

export default function CashierDashboard({ onReportIncident }) {
  const [incidentDesc, setIncidentDesc] = useState('');

  const handleIncidentSubmit = (e) => {
    e.preventDefault();
    onReportIncident({
      id: Date.now(),
      reportedBy: 'Cashier',
      description: incidentDesc,
      severity: 'Low',
      timestamp: new Date().toLocaleString()
    });
    setIncidentDesc('');
    alert('Incident reported successfully.');
  };

  return (
    <div className="dashboard-container">
      <h1>Cashier Workspace</h1>
      
      <section className="section-container">
        <h2>Report Security Incident</h2>
        <form onSubmit={handleIncidentSubmit} className="form-group">
          <textarea
            placeholder="Enter incident details (e.g., suspicious activity, physical security breach)..."
            value={incidentDesc}
            onChange={(e) => setIncidentDesc(e.target.value)}
            required
          />
          <button type="submit">Report Incident</button>
        </form>
      </section>
    </div>
  );
}