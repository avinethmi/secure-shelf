import React, { useState, useEffect } from 'react';
import IncidentReportForm from './IncidentReportForm';

export default function IncidentTable() {
  // Initialize state from localStorage so data survives page refresh
  const [incidents, setIncidents] = useState(() => {
    const savedIncidents = localStorage.getItem('secureShelf_incidents');
    return savedIncidents ? JSON.parse(savedIncidents) : [];
  });

  // Save to localStorage automatically when incidents state changes
  useEffect(() => {
    localStorage.setItem('secureShelf_incidents', JSON.stringify(incidents));
  }, [incidents]);

  const handleAddIncident = (newIncident) => {
    setIncidents((prevIncidents) => [newIncident, ...prevIncidents]);
  };

  return (
    <section className="section-container">
      <h2>Security Incident Reporting</h2>

      {/* Render the Incident Form */}
      <IncidentReportForm onAddIncident={handleAddIncident} />

      {/* Incident Records Table */}
      <h3>Reported Security Incidents</h3>
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>INCIDENT ID</th>
              <th>TITLE</th>
              <th>DESCRIPTION</th>
              <th>TIMESTAMP</th>
            </tr>
          </thead>
          <tbody>
            {incidents.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '16px' }}>
                  No security incidents reported.
                </td>
              </tr>
            ) : (
              incidents.map((incident) => (
                <tr key={incident.id}>
                  <td>{incident.id}</td>
                  <td>{incident.title}</td>
                  <td>{incident.description}</td>
                  <td>{incident.timestamp}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}