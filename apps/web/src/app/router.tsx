import { createBrowserRouter } from 'react-router-dom';
import { HealthPage } from '@/features/health/HealthPage';

// Routes fill in as phases land: /login, /totp, /app/* behind guards.
export const router = createBrowserRouter([
  { path: '/', element: <HealthPage /> },
]);
