import { database } from '../models/mockDatabase.js';

export const createPolicy = (title, content, publishedBy, authorId) => {
  const newPolicy = {
    id: Date.now(),
    title,
    content,
    publishedBy,
    authorId
  };
  database.policies.push(newPolicy);
  return newPolicy;
};

export const removePolicy = (policyId, userRole) => {
  // Only Owner and Security Admin are authorized to remove published policies
  if (userRole !== 'Owner' && userRole !== 'Security Admin') {
    throw new Error('Unauthorized policy removal request.');
  }
  database.policies = database.policies.filter((p) => p.id !== policyId);
  return database.policies;
};