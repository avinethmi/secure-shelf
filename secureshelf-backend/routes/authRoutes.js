import express from 'express';
import { loginUser, unlockAccount } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const result = loginUser(email, password);
  if (result.success) {
    res.json(result);
  } else {
    res.status(401).json(result);
  }
});

router.post('/unlock', (req, res) => {
  const { email } = req.body;
  const success = unlockAccount(email);
  if (success) {
    res.json({ message: 'Account unlocked successfully.' });
  } else {
    res.status(404).json({ message: 'Account not found.' });
  }
});

export default router;