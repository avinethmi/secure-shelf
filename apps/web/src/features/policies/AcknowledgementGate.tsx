import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { IconFileText, IconChevronRight } from '@tabler/icons-react';
import { POLICY_TYPE_LABELS } from '@secureshelf/shared';
import { Splash } from '@/app/guards';
import { useAuth } from '@/features/auth/useAuth';
import { Button } from '@/components/ui/Button';
import { usePendingAcknowledgements, fmtDate } from './api';

// FR-09 sign-in gate. The first time a person lands in the app in this browser session with
// policies still to acknowledge, they are taken to the reading list before anything else. It
// is shown once per sign-in; the banner in the shell keeps reminding them after that.

const key = (userId: number) => `ss.ack-gate.${userId}`;

function wasShown(userId: number) {
  try {
    return sessionStorage.getItem(key(userId)) === '1';
  } catch {
    return true;
  }
}
function markShown(userId: number) {
  try {
    sessionStorage.setItem(key(userId), '1');
  } catch {
    /* private mode: the gate simply does not repeat */
  }
}
export function clearGate(userId: number | undefined) {
  if (userId === undefined) return;
  try {
    sessionStorage.removeItem(key(userId));
  } catch {
    /* ignore */
  }
}

export function AcknowledgementGate() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { pending, isFetched } = usePendingAcknowledgements();

  const onPolicyPages = location.pathname.startsWith('/app/policies') || location.pathname === '/app/acknowledge';
  const shouldRedirect = !!user && isFetched && pending.length > 0 && !onPolicyPages && !wasShown(user.id);

  // Marking the gate as shown is a side effect, so it lives here and not in render (StrictMode
  // renders twice; a render-time write made the second pass skip the redirect).
  useEffect(() => {
    if (!shouldRedirect || !user) return;
    markShown(user.id);
    navigate('/app/acknowledge', { replace: true });
  }, [shouldRedirect, user, navigate]);

  if (user && !isFetched) return <Splash />;
  if (shouldRedirect) return null;
  return <Outlet />;
}

export function PendingAcknowledgementsPage() {
  const navigate = useNavigate();
  const { pending, isLoading } = usePendingAcknowledgements();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <p className="text-sm text-fg-muted">Before you continue</p>
        <h2 className="text-2xl font-semibold">Policies to acknowledge</h2>
        <p className="mt-1 text-sm text-fg-muted">Marvels asks every member of staff to read the policies that apply to their role and confirm they understand them. Each confirmation is recorded against the exact version you read.</p>
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-fg-muted">Checking your policies...</p>}
      {!isLoading && pending.length === 0 && <p className="rounded-card border border-border bg-surface px-4 py-8 text-center text-sm text-fg-muted">Nothing outstanding. You are up to date.</p>}

      <ol className="space-y-2">
        {pending.map((p, i) => (
          <li key={p.versionId}>
            <Link to={`/app/policies/read/${p.versionId}`} className="group flex items-center gap-4 rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                <IconFileText className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-fg-subtle">
                  {i + 1} of {pending.length} · {p.code} v{p.versionNo}
                </span>
                <span className="block font-medium group-hover:underline">{p.title}</span>
                <span className="block text-xs text-fg-muted">
                  {POLICY_TYPE_LABELS[p.type]} · published {fmtDate(p.publishedAt)}
                </span>
              </span>
              <IconChevronRight aria-hidden className="size-5 shrink-0 text-fg-subtle" />
            </Link>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-fg-muted">{pending.length > 0 ? 'You can come back to these from the Policies page at any time.' : ''}</p>
        <Button variant={pending.length > 0 ? 'secondary' : 'primary'} onClick={() => navigate('/app')}>
          {pending.length > 0 ? 'Later, go to dashboard' : 'Go to dashboard'}
        </Button>
      </div>
    </div>
  );
}
