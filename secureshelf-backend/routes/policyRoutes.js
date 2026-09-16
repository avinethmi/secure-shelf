import express from 'express';
import { createPolicy, removePolicy } from '../controllers/policyController.js';
import { database } from '../models/mockDatabase.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(database.policies);
});

router.post('/', (req, res) => {
  const { title, content, publishedBy, authorId } = req.body;
  const policy = createPolicy(title, content, publishedBy, authorId);
  res.status(201).json(policy);
});

router.delete('/:id', (req, res) => {
  const userRole = req.headers['x-user-role'];
  try {
    const updatedPolicies = removePolicy(Number(req.params.id), userRole);
    res.json(updatedPolicies);
  } catch (err) {
    res.status(403).json({ message: err.message });
  }
});

export default router;