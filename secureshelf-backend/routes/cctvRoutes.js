import express from 'express';
// Change 'import db from ...' to import { connectDB } with curly braces
import { connectDB } from '../config/db.js'; 

const router = express.Router();
// Initialize the mock database connection
const db = connectDB();

// GET /api/cctv/logs - Retrieve all CCTV logs from Database
router.get('/api/cctv/logs', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, camera, reason, timestamp FROM cctv_logs ORDER BY timestamp DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch CCTV logs' });
  }
});

// POST /api/cctv/logs - Save new log to Database
router.post('/api/cctv/logs', async (req, res) => {
  const { camera, reason, timestamp } = req.body;
  if (!camera || !reason) {
    return res.status(400).json({ error: 'Camera and reason are required' });
  }

  try {
    const result = await db.query(
      'INSERT INTO cctv_logs (camera, reason, timestamp) VALUES ($1, $2, $3) RETURNING *',
      [camera, reason, timestamp || new Date().toISOString()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record CCTV log' });
  }
});

export default router;