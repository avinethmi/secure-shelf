import { database } from '../models/mockDatabase.js';

export const connectDB = () => {
  console.log('Mock database connection initialized.');
  return database;
};