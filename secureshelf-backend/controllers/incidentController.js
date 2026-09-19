import { database } from '../models/mockDatabase.js';

export const reportIncident = (req, res) => {
  const { reportedBy, type, description, severity } = req.body;
  
  const newIncident = {
    id: Date.now(),
    reportedBy: reportedBy || 'Cashier',
    type: type || 'Unauthorized Access',
    severity: severity || 'Medium',
    description,
    timestamp: new Date().toLocaleString() // Captures exact server submission time
  };

  database.incidents.push(newIncident);
  res.status(201).json(newIncident);
};

export const getIncidents = (req, res) => {
  const userRole = req.headers['x-user-role'];
  
  // Allow Security Admin and Owner to view incidents
  if (userRole !== 'Security Admin' && userRole !== 'Owner') {
    return res.status(403).json({ message: 'Access denied.' });
  }
  
  res.json(database.incidents);
};