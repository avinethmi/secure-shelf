import { ROLE_LABELS } from '@secureshelf/shared';
import { useAuth } from '@/features/auth/useAuth';

// Phase 1 placeholder. Phase 3 replaces this with the role-shaped bento dashboard (FR-20).
export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-fg-muted">Signed in as</p>
      <h2 className="text-2xl font-semibold">{user.fullName}</h2>
      <p className="mt-1 text-sm text-fg-muted">{ROLE_LABELS[user.role]}</p>
      <div className="mt-6 rounded-card border border-border bg-surface p-5">
        <p className="text-sm font-medium">Your permissions</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {user.permissions.map((p) => (
            <li key={p} className="rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-xs text-fg-muted">
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
