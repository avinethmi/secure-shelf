import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft, IconCircleCheck } from '@tabler/icons-react';
import { POLICY_TYPE_LABELS, ROLE_LABELS } from '@secureshelf/shared';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Markdown } from '@/components/ui/Markdown';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/useAuth';
import { useVersion, policyKeys, statusTone, statusLabel, fmtDate } from './api';

// FR-09 and NFR-08: open the policy, tick "I have read", press Acknowledge. Two actions after
// opening, one request. The record (user, version, time) is kept against this exact wording.
export function PolicyReaderPage() {
  const { vid: vidParam } = useParams();
  const vid = Number(vidParam);
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const q = useVersion(vid);
  const [confirmed, setConfirmed] = useState(false);

  const ack = useMutation({
    mutationFn: () => api.post<{ acknowledgedAt: string; alreadyAcknowledged: boolean }>(`/policies/versions/${vid}/acknowledge`),
    onSuccess: (r) => {
      toast.push('success', r.alreadyAcknowledged ? 'You had already acknowledged this version.' : 'Acknowledgement recorded.');
      qc.invalidateQueries({ queryKey: policyKeys.version(vid) });
      qc.invalidateQueries({ queryKey: policyKeys.assigned });
      if (q.data) qc.invalidateQueries({ queryKey: policyKeys.acks(q.data.policy.id) });
    },
    onError: (e) => toast.push('danger', e instanceof ApiError ? e.message : 'Could not record the acknowledgement'),
  });

  if (q.isLoading) return <p className="py-10 text-center text-sm text-fg-muted">Loading policy...</p>;
  if (q.isError || !q.data) return <Alert tone="danger">This policy version is not available to you.</Alert>;

  const { version, policy, acknowledgedAt, canAcknowledge } = q.data;
  const manages = can('policy.write', 'policy.approve', 'policy.publish');
  const backTo = manages ? `/app/policies/${policy.id}` : '/app/policies';

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <Link to={backTo} className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
        <IconArrowLeft aria-hidden className="size-4" /> {manages ? policy.code : 'My policies'}
      </Link>

      <header className="mt-3 rounded-card border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-fg-subtle">
            {policy.code} · v{version.versionNo}
          </span>
          <Badge tone={statusTone[version.status]}>{statusLabel[version.status]}</Badge>
          <Badge tone="neutral" dot={false} className="capitalize">
            {policy.classification}
          </Badge>
        </div>
        <h2 className="mt-2 text-2xl font-semibold">{version.title}</h2>
        <p className="mt-1 text-sm text-fg-muted">
          {POLICY_TYPE_LABELS[policy.type]}
          {version.publishedAt ? ` · published ${fmtDate(version.publishedAt)}` : ''}
          {version.roles.length ? ` · applies to ${version.roles.map((r) => ROLE_LABELS[r]).join(', ')}` : ''}
        </p>
        {version.status === 'superseded' && (
          <p className="mt-3 text-sm text-warning">This wording has been replaced by a newer version. It is kept so earlier acknowledgements stay linked to what was accepted.</p>
        )}
      </header>

      <article aria-label="Policy text" className="mt-5 rounded-card border border-border bg-surface p-5 sm:p-8">
        <Markdown source={version.content} />
      </article>

      {(canAcknowledge || acknowledgedAt) && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 px-4 py-3 backdrop-blur md:left-60">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            {acknowledgedAt ? (
              <p className="flex items-center gap-2 text-sm text-success">
                <IconCircleCheck aria-hidden className="size-5" /> You acknowledged this version on {fmtDate(acknowledgedAt)}.
              </p>
            ) : (
              <>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="size-4 accent-sky-400" />I have read and understood this policy
                </label>
                <Button disabled={!confirmed} loading={ack.isPending} onClick={() => ack.mutate()}>
                  Acknowledge
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
