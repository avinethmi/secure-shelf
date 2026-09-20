import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth, RequirePermission, RedirectIfAuthed } from './guards';
import { AppShell } from '@/layouts/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { TotpVerifyPage, TotpEnrolPage } from '@/features/auth/TotpPages';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { UsersPage } from '@/features/users/UsersPage';
import { PoliciesPage } from '@/features/policies/PoliciesPage';
import { PolicyDetailPage } from '@/features/policies/PolicyDetailPage';
import { PolicyEditorPage } from '@/features/policies/PolicyEditorPage';
import { PolicyReaderPage } from '@/features/policies/PolicyReaderPage';
import { AcknowledgementGate, PendingAcknowledgementsPage } from '@/features/policies/AcknowledgementGate';

function ComingSoon({ what }: { what: string }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-lg font-semibold">{what}</p>
      <p className="mt-2 text-sm text-fg-muted">This module lands in a later phase of the build.</p>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app" replace /> },
  {
    element: <RedirectIfAuthed />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/login/verify', element: <TotpVerifyPage /> },
      { path: '/login/enrol', element: <TotpEnrolPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        // FR-09: people with unread assigned policies are shown them once per sign-in.
        element: <AcknowledgementGate />,
        children: [
          {
            path: '/app',
            element: <AppShell />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'acknowledge', element: <PendingAcknowledgementsPage /> },
              { path: 'policies', element: <PoliciesPage /> },
              { path: 'policies/read/:vid', element: <PolicyReaderPage /> },
              {
                element: <RequirePermission anyOf={['policy.write']} />,
                children: [
                  { path: 'policies/new', element: <PolicyEditorPage /> },
                  { path: 'policies/:id/versions/new', element: <PolicyEditorPage /> },
                  { path: 'policies/versions/:vid/edit', element: <PolicyEditorPage /> },
                ],
              },
              { path: 'policies/:id', element: <PolicyDetailPage /> },
              { path: 'training', element: <ComingSoon what="Training" /> },
              { path: 'incidents', element: <ComingSoon what="Incidents" /> },
              { element: <RequirePermission anyOf={['control.assess', 'asset.manage']} />, children: [{ path: 'compliance', element: <ComingSoon what="Compliance" /> }] },
              { element: <RequirePermission anyOf={['cctv.manage']} />, children: [{ path: 'cctv', element: <ComingSoon what="CCTV governance" /> }] },
              { element: <RequirePermission anyOf={['audit.read']} />, children: [{ path: 'audit', element: <ComingSoon what="Audit log" /> }] },
              { element: <RequirePermission anyOf={['users.manage']} />, children: [{ path: 'users', element: <UsersPage /> }] },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/app" replace /> },
]);
