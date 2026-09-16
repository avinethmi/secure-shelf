import { database } from '../models/mockDatabase.js';

export const reportIncident = (req, res) => {
  const { reportedBy, description, severity } = req.body;
  const newIncident = {
    id: Date.now(),
    reportedBy,
    description,
    severity: severity || 'Medium',
    timestamp: new Date().toLocaleString()
  };
  database.incidents.push(newIncident);
  res.status(201).json(newIncident);
};

export const getIncidents = (req, res) => {
  // Only Security Admin has view permission
  const userRole = req.headers['x-user-role'];
  if (userRole !== 'Security Admin') {
    return res.status(403).json({ message: 'Access denied. Security Admin only.' });
  }
  res.json(database.incidents);
};