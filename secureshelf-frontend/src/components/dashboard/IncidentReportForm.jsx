import React, { useState } from 'react';

export default function IncidentReportForm({ onAddIncident }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const newIncident = {
      id: `INC-${Date.now().toString().slice(-6)}`,
      title: title.trim(),
      description: description.trim(),
      timestamp: new Date().toLocaleString()
    };

    onAddIncident(newIncident);

    // Clear form inputs
    setTitle('');
    setDescription('');
  };

  return (
    <div className="publish-card">
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="incident-title">Incident Title</label>
          <input
            id="incident-title"
            type="text"
            placeholder="e.g., Unauthorized Access Attempt"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="incident-desc">Description</label>
          <textarea
            id="incident-desc"
            placeholder="Describe the security incident in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary">
          Submit Incident Report
        </button>
      </form>
    </div>
  );
}