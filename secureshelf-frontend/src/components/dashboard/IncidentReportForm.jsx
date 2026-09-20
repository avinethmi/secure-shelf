import React, { useState } from 'react';

export default function IncidentReportForm({ onAddIncident }) {
  const [type, setType] = useState('Policy Violation');
  const [severity, setSeverity] = useState('Low');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    onAddIncident({ type, severity, description });
    setDescription('');
  };

  const fieldStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
    marginBottom: '16px',
    alignItems: 'flex-start'
  };

  const labelStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    width: '100%',
    textAlign: 'left'
  };

  const selectStyle = {
    width: '100%',
    height: '42px',
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer'
  };

  const textareaStyle = {
    width: '100%',
    minHeight: '90px',
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical'
  };

  return (
    <div className="publish-card">
      <h2>Report Security Incident</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        
        {/* Incident Type */}
        <div style={fieldStyle}>
          <label htmlFor="incident-type" style={labelStyle}>
            Incident Type
          </label>
          <select
            id="incident-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={selectStyle}
          >
            <option value="Policy Violation">Policy Violation</option>
            <option value="Unauthorized Access">Unauthorized Access</option>
            <option value="Data Leak">Data Leak</option>
            <option value="Hardware Tampering">Hardware Tampering</option>
          </select>
        </div>

        {/* Severity Level */}
        <div style={fieldStyle}>
          <label htmlFor="severity-level" style={labelStyle}>
            Severity Level
          </label>
          <select
            id="severity-level"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            style={selectStyle}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        {/* Description */}
        <div style={fieldStyle}>
          <label htmlFor="incident-description" style={labelStyle}>
            Description
          </label>
          <textarea
            id="incident-description"
            placeholder="Provide details about the incident..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            style={textareaStyle}
          />
        </div>

        <button type="submit" className="publish-btn" style={{ width: '100%', height: '42px', marginTop: '8px' }}>
          Submit Incident Report
        </button>
      </form>
    </div>
  );
}