import React, { useState, useEffect } from 'react';
import IncidentReportForm from './IncidentReportForm';

export default function IncidentTable({ currentUser }) {
  const [incidents, setIncidents] = useState([]);
  const [message, setMessage] = useState('');

  // Load existing incidents for Admin/Owner views
  useEffect(() => {
    if (currentUser?.role === 'Security Admin' || currentUser?.role === 'Owner') {
      fetch('/api/incidents', {
        headers: {
          'x-user-role': currentUser.role
        }
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setIncidents(data))
        .catch((err) => console.error('Error loading incidents:', err));
    }
  }, [currentUser]);

  const handleAddIncident = async (incidentData) => {
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reportedBy: currentUser?.email || 'Cashier',
          type: incidentData.type,
          severity: incidentData.severity,
          description: incidentData.description
        })
      });

      if (response.ok) {
        const savedIncident = await response.json();
        setIncidents((prev) => [savedIncident, ...prev]);
        setMessage('Security incident submitted successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to submit incident:', error);
    }
  };

  return (
    <section className="section-container">
      <h2>Security Incident Reporting</h2>
      {message && <p className="success-text" style={{ color: '#15803d', fontWeight: 600 }}>{message}</p>}

      {/* Render Updated Dropdown Form */}
      <IncidentReportForm onAddIncident={handleAddIncident} />

      {/* Incident Table with TYPE included */}
      <h3>Reported Security Incidents (Exclusive View)</h3>
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>REPORTER</th>
              <th>TYPE</th>
              <th>DESCRIPTION</th>
              <th>SEVERITY</th>
              <th>TIMESTAMP</th>
            </tr>
          </thead>
          <tbody>
            {incidents.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                  No security incidents reported.
                </td>
              </tr>
            ) : (
              incidents.map((inc) => (
                <tr key={inc.id}>
                  <td>INC-{inc.id}</td>
                  <td>{inc.reportedBy || 'Cashier'}</td>
                  <td>{inc.type || 'Unauthorized Access'}</td>
                  <td>{inc.description}</td>
                  <td>
                    <span className={`status-badge severity-${(inc.severity || 'Medium').toLowerCase()}`}>
                      {inc.severity || 'Medium'}
                    </span>
                  </td>
                  <td>{inc.timestamp}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}