import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Permission } from '@secureshelf/shared';
import { useAuth } from '@/features/auth/useAuth';

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg" role="status" aria-live="polite">
      <span className="size-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

// Everything under /app needs a session.
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

// A route needs at least one of the listed permissions; otherwise show a plain denied page
// (the API would 403 anyway, this just avoids a confusing empty screen).
export function RequirePermission({ anyOf }: { anyOf: Permission[] }) {
  const { can } = useAuth();
  if (!can(...anyOf)) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-lg font-semibold">Not available for your role</p>
        <p className="mt-2 text-sm text-fg-muted">Your account does not have permission for this area. If you think it should, contact your Security Administrator.</p>
      </div>
    );
  }
  return <Outlet />;
}

// Signed-in users landing on /login go straight to the app.
export function RedirectIfAuthed() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (user) return <Navigate to="/app" replace />;
  return <Outlet />;
}
