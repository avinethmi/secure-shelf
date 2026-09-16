import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import policyRoutes from './routes/policyRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import cctvRoutes from './routes/cctvRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/cctv', cctvRoutes);

app.listen(PORT, () => {
  console.log(`SecureShelf backend running on port ${PORT}`);
});