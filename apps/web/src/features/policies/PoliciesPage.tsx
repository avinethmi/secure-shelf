import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconPlus, IconCircleCheck, IconAlertCircle, IconChevronRight } from '@tabler/icons-react';
import { POLICY_TYPE_LABELS, ROLE_LABELS } from '@secureshelf/shared';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Tabs } from '@/components/ui/Tabs';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';
import { useAuth } from '@/features/auth/useAuth';
import { useAssigned, useRegister, statusTone, statusLabel, fmtDate, type AssignedPolicy } from './api';

// FR-06 to FR-09. Owner and Security Admin get the register (every policy, live version,
// whatever is in flight) plus their own reading list; everyone else gets the reading list.
export function PoliciesPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const manages = can('policy.write', 'policy.approve', 'policy.publish');
  const [tab, setTab] = useState<'register' | 'mine'>(manages ? 'register' : 'mine');
  const assigned = useAssigned();
  const pendingCount = (assigned.data ?? []).filter((p) => !p.acknowledgedAt).length;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Policies</h2>
          <p className="text-sm text-fg-muted">
            {manages ? 'Draft, review, approve and publish numbered versions. Published wording never changes.' : 'Policies assigned to your role. Read each one and acknowledge it.'}
          </p>
        </div>
        {can('policy.write') && (
          <Button onClick={() => navigate('/app/policies/new')}>
            <IconPlus aria-hidden className="size-4" /> New policy
          </Button>
        )}
      </div>

      {manages && (
        <Tabs
          tabs={[
            { key: 'register', label: 'Register' },
            { key: 'mine', label: 'Assigned to me', count: pendingCount || undefined },
          ]}
          value={tab}
          onChange={setTab}
        />
      )}

      {tab === 'register' && manages ? <Register /> : <AssignedList policies={assigned.data ?? []} loading={assigned.isLoading} error={assigned.isError} />}
    </div>
  );
}

function Register() {
  const navigate = useNavigate();
  const register = useRegister();
  const list = register.data ?? [];
  const reviewCount = list.filter((p) => p.inFlight?.status === 'review').length;

  return (
    <div className="space-y-4">
      {reviewCount > 0 && (
        <Alert tone="info" title={`${reviewCount} version${reviewCount > 1 ? 's' : ''} awaiting Owner review`}>
          Open the policy to approve it or request changes.
        </Alert>
      )}
      {register.isError && <Alert tone="danger">Could not load the policy register.</Alert>}
      <Table caption="Policy register">
        <THead>
          <tr>
            <TH>Code</TH>
            <TH>Policy</TH>
            <TH>Live version</TH>
            <TH>In progress</TH>
            <TH className="w-10">
              <span className="sr-only">Open</span>
            </TH>
          </tr>
        </THead>
        <TBody>
          {register.isLoading && <EmptyRow colSpan={5}>Loading policies...</EmptyRow>}
          {!register.isLoading && list.length === 0 && <EmptyRow colSpan={5}>No policies yet. Create the first draft.</EmptyRow>}
          {list.map((p) => (
            <TR key={p.id} onClick={() => navigate(`/app/policies/${p.id}`)}>
              <TD label="Code" className="sm:w-24">
                <span className="font-mono text-xs whitespace-nowrap text-fg-muted">{p.code}</span>
              </TD>
              <TD label="Policy">
                <Link to={`/app/policies/${p.id}`} className="block font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                  {p.title}
                </Link>
                <span className="block text-xs text-fg-muted">
                  {POLICY_TYPE_LABELS[p.type]} · {p.classification}
                </span>
              </TD>
              <TD label="Live version">
                {p.published ? (
                  <span className="flex flex-wrap items-center justify-end gap-1.5 sm:justify-start">
                    <Badge tone="success">v{p.published.versionNo}</Badge>
                    <span className="text-xs text-fg-muted">{p.published.roles.map((r) => ROLE_LABELS[r]).join(', ')}</span>
                  </span>
                ) : (
                  <span className="text-xs text-fg-subtle">Not published</span>
                )}
              </TD>
              <TD label="In progress">
                {p.inFlight ? (
                  <span className="flex flex-wrap items-center justify-end gap-1.5 sm:justify-start">
                    <Badge tone={statusTone[p.inFlight.status]}>
                      v{p.inFlight.versionNo} {statusLabel[p.inFlight.status]}
                    </Badge>
                    <span className="text-xs text-fg-muted">{p.inFlight.authorName}</span>
                  </span>
                ) : (
                  <span className="text-xs text-fg-subtle">None</span>
                )}
              </TD>
              <TD className="hidden sm:table-cell">
                <IconChevronRight aria-hidden className="size-4 text-fg-subtle" />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function AssignedList({ policies, loading, error }: { policies: AssignedPolicy[]; loading: boolean; error: boolean }) {
  const pending = policies.filter((p) => !p.acknowledgedAt);
  const done = policies.filter((p) => p.acknowledgedAt);

  if (error) return <Alert tone="danger">Could not load your policies.</Alert>;
  if (loading) return <p className="py-10 text-center text-sm text-fg-muted">Loading your policies...</p>;
  if (!policies.length) return <p className="rounded-card border border-border bg-surface px-4 py-10 text-center text-sm text-fg-muted">No policies have been published to your role yet.</p>;

  return (
    <div className="space-y-6">
      <section aria-labelledby="pending-heading">
        <h3 id="pending-heading" className="mb-2 text-sm font-medium text-fg-muted">
          Needs your acknowledgement ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="rounded-card border border-border bg-surface px-4 py-6 text-center text-sm text-fg-muted">You are up to date.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {pending.map((p) => (
              <li key={p.versionId}>
                <PolicyCard p={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
      {done.length > 0 && (
        <section aria-labelledby="done-heading">
          <h3 id="done-heading" className="mb-2 text-sm font-medium text-fg-muted">
            Acknowledged ({done.length})
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {done.map((p) => (
              <li key={p.versionId}>
                <PolicyCard p={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PolicyCard({ p }: { p: AssignedPolicy }) {
  const acked = !!p.acknowledgedAt;
  return (
    <Link
      to={`/app/policies/read/${p.versionId}`}
      className="group block h-full rounded-card border border-border bg-surface p-4 transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-[0_0_30px_-12px_var(--color-accent)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-fg-subtle">
            {p.code} · v{p.versionNo}
          </p>
          <p className="mt-0.5 font-medium group-hover:underline">{p.title}</p>
          <p className="mt-1 text-xs text-fg-muted">
            {POLICY_TYPE_LABELS[p.type]} · published {fmtDate(p.publishedAt)}
          </p>
        </div>
        {acked ? <IconCircleCheck aria-hidden className="size-5 shrink-0 text-success" /> : <IconAlertCircle aria-hidden className="size-5 shrink-0 text-warning" />}
      </div>
      <p className={`mt-3 text-xs ${acked ? 'text-fg-muted' : 'text-warning'}`}>{acked ? `Acknowledged ${fmtDate(p.acknowledgedAt)}` : 'Open, read, and acknowledge'}</p>
    </Link>
  );
}
