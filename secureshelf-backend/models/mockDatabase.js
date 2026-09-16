// Database state holding accounts, lockout counters, CCTV logs, policies, and incidents
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