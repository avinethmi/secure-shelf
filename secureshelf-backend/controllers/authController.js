import { database } from '../models/mockDatabase.js';

export const loginUser = (email, password) => {
  const user = database.users.find((u) => u.email === email);

  if (!user) {
    return { success: false, message: 'Invalid credentials.' };
  }

  if (user.isLocked) {
    return { success: false, message: 'Account locked due to 5 failed attempts. Contact Security Admin.' };
  }

  if (user.password === password) {
    user.failedAttempts = 0; // Reset counter on successful login
    return { success: true, user };
  } else {
    user.failedAttempts += 1;
    if (user.failedAttempts >= 5) {
      user.isLocked = true;
      return { success: false, message: 'Account locked due to 5 failed attempts.' };
    }
    return { success: false, message: 'Invalid credentials.' };
  }
};

export const unlockAccount = (targetEmail) => {
  const user = database.users.find((u) => u.email === targetEmail);
  if (user) {
    user.failedAttempts = 0;
    user.isLocked = false;
    return true;
  }
  return false;
};