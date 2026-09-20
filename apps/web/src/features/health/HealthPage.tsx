import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { ROLE_LABELS } from '@secureshelf/shared';

type Health = { status: string; service: string; time: string };

// Phase 0 placeholder: proves web → proxy → api → shared package all work end to end.
export function HealthPage() {
  const health = useQuery({ queryKey: ['health'], queryFn: () => api.get<Health>('/health') });

  return (
    <main className="bg-grid min-h-screen px-4 py-16">
      <div className="mx-auto max-w-md rounded-card border border-border bg-surface p-6">
        <h1 className="text-gradient text-3xl font-bold">SecureShelf</h1>
        <p className="mt-1 text-fg-muted">Security policy and awareness system for Marvels</p>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-fg-muted">API</dt>
            <dd>
              {health.isLoading && 'checking...'}
              {health.isError && <span className="text-danger">unreachable</span>}
              {health.data && <span className="text-success">{health.data.status}</span>}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-muted">Shared package</dt>
            <dd>{Object.keys(ROLE_LABELS).length} roles</dd>
          </div>
        </dl>
      </div>
    </main>
  );
}
