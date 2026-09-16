import { database } from '../models/mockDatabase.js';

export const addCCTVLog = (req, res) => {
  const { camera, reason } = req.body;
  const newLog = {
    id: Date.now(),
    camera,
    reason,
    date: new Date().toLocaleString()
  };
  database.cctvLogs.push(newLog);
  res.status(201).json(newLog);
};

export const getCCTVLogs = (req, res) => {
  res.json(database.cctvLogs);
};