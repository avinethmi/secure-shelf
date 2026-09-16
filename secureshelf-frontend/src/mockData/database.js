export const database = {
  users: [
    {
      id: 1,
      email: 'admin@marvels.com',
      password: 'Password123!',
      role: 'Security Admin',
      failedAttempts: 0,
      isLocked: false
    },
    {
      id: 2,
      email: 'owner@marvels.com',
      password: 'Password123!',
      role: 'Owner',
      failedAttempts: 0,
      isLocked: false
    },
    {
      id: 3,
      email: 'cashier@marvels.com',
      password: 'Password123!',
      role: 'Cashier',
      failedAttempts: 0,
      isLocked: false
    }
  ],
  policies: [
    {
      id: 1,
      title: 'Acceptable Use Policy (System Standard)',
      content: 'All workstation sessions must be locked when left unattended.',
      publishedBy: 'System',
      authorId: 'system'
    }
  ],
  incidents: [],
  cctvLogs: []
};

export const loginUser = (email, password) => {
  const user = database.users.find((u) => u.email === email);
  if (!user) return { success: false, message: 'Invalid credentials.' };
  if (user.isLocked) return { success: false, message: 'Account locked due to 5 failed attempts. Contact Security Admin.' };

  if (user.password === password) {
    user.failedAttempts = 0;
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

export const createPolicy = (title, content, publishedBy, authorId) => {
  const newPolicy = { id: Date.now(), title, content, publishedBy, authorId };
  database.policies.push(newPolicy);
  return newPolicy;
};

export const removePolicy = (policyId, userRole) => {
  if (userRole !== 'Owner' && userRole !== 'Security Admin') {
    throw new Error('Unauthorized policy removal request.');
  }
  database.policies = database.policies.filter((p) => p.id !== policyId);
  return database.policies;
};