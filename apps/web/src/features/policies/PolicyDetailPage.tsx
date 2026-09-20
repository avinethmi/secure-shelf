import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconArrowLeft, IconPencil, IconSend, IconCheck, IconArrowBackUp, IconWorldUpload, IconEye, IconPlus } from '@tabler/icons-react';
import { ROLES, ROLE_LABELS, POLICY_TYPE_LABELS, publishSchema, requestChangesSchema, approveSchema, type PublishForm, type PublishInput, type ReviewNoteInput, type Role } from '@secureshelf/shared';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Field';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/useAuth';
import { usePolicy, useAckStatus, policyKeys, statusTone, statusLabel, fmtDate, type VersionSummary } from './api';

type Action = { kind: 'submit' | 'approve' | 'request-changes' | 'publish'; version: VersionSummary };

// FR-07, FR-08: the version history and lifecycle controls. Which buttons appear depends on
// the version's status and the caller's permission; the API re-checks both.
export function PolicyDetailPage() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { user, can } = useAuth();
  const q = usePolicy(id);
  const manages = can('policy.write', 'policy.approve', 'policy.publish');
  const acks = useAckStatus(id, manages);
  const [action, setAction] = useState<Action | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: policyKeys.policy(id) });
    qc.invalidateQueries({ queryKey: policyKeys.register });
    qc.invalidateQueries({ queryKey: policyKeys.acks(id) });
    qc.invalidateQueries({ queryKey: policyKeys.assigned });
  };

  const submit = useMutation({
    mutationFn: (vid: number) => api.post(`/policies/versions/${vid}/submit`),
    onSuccess: () => (toast.push('success', 'Sent to the Owner for review.'), setAction(null), invalidate()),
    onError: (e) => toast.push('danger', e instanceof ApiError ? e.message : 'Could not submit'),
  });

  if (q.isLoading) return <p className="py-10 text-center text-sm text-fg-muted">Loading policy...</p>;
  if (q.isError || !q.data) return <Alert tone="danger">This policy could not be loaded. It may not be published to your role.</Alert>;

  const { policy, versions } = q.data;
  const inFlight = versions.find((v) => v.status === 'draft' || v.status === 'review' || v.status === 'approved');
  const live = versions.find((v) => v.status === 'published');

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link to="/app/policies" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
          <IconArrowLeft aria-hidden className="size-4" /> All policies
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-fg-subtle">{policy.code}</p>
            <h2 className="text-2xl font-semibold">{policy.title}</h2>
            <p className="mt-1 text-sm text-fg-muted">
              {POLICY_TYPE_LABELS[policy.type]} · classification <span className="capitalize">{policy.classification}</span>
            </p>
          </div>
          {can('policy.write') && !inFlight && (
            <Button variant="secondary" onClick={() => navigate(`/app/policies/${id}/versions/new`)}>
              <IconPlus aria-hidden className="size-4" /> New version
            </Button>
          )}
        </div>
      </div>

      {inFlight?.status === 'draft' && inFlight.reviewNote && (
        <Alert tone="warning" title={`Changes requested on v${inFlight.versionNo}`}>
          {inFlight.reviewNote}
        </Alert>
      )}

      <section aria-labelledby="versions-heading" className="space-y-3">
        <h3 id="versions-heading" className="text-sm font-medium text-fg-muted">
          Versions
        </h3>
        <ol className="space-y-3">
          {versions.map((v) => (
            <li key={v.id} className="rounded-card border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">v{v.versionNo}</span>
                    <Badge tone={statusTone[v.status]}>{statusLabel[v.status]}</Badge>
                    {v.roles && v.roles.length > 0 && <span className="text-xs text-fg-muted">to {v.roles.map((r) => ROLE_LABELS[r]).join(', ')}</span>}
                  </div>
                  <p className="mt-1 font-medium">{v.title}</p>
                  {v.changeNote && <p className="mt-0.5 text-sm text-fg-muted">{v.changeNote}</p>}
                  <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-fg-muted sm:grid-cols-4">
                    <div>
                      <dt className="text-fg-subtle">Author</dt>
                      <dd>{v.authorName ?? 'Unknown'}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-subtle">Submitted</dt>
                      <dd>{fmtDate(v.submittedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-subtle">Approved by</dt>
                      <dd>{v.approverName ? `${v.approverName}, ${fmtDate(v.approvedAt)}` : 'None'}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-subtle">Published</dt>
                      <dd>{fmtDate(v.publishedAt)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/app/policies/read/${v.id}`)}>
                    <IconEye aria-hidden className="size-4" /> View
                  </Button>
                  {v.status === 'draft' && can('policy.write') && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/app/policies/versions/${v.id}/edit`)}>
                        <IconPencil aria-hidden className="size-4" /> Edit
                      </Button>
                      <Button size="sm" onClick={() => setAction({ kind: 'submit', version: v })}>
                        <IconSend aria-hidden className="size-4" /> Submit for review
                      </Button>
                    </>
                  )}
                  {v.status === 'review' && can('policy.approve') && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setAction({ kind: 'request-changes', version: v })}>
                        <IconArrowBackUp aria-hidden className="size-4" /> Request changes
                      </Button>
                      <Button size="sm" onClick={() => setAction({ kind: 'approve', version: v })} disabled={v.authorId === user?.id} title={v.authorId === user?.id ? 'You wrote this version; someone else must approve it' : undefined}>
                        <IconCheck aria-hidden className="size-4" /> Approve
                      </Button>
                    </>
                  )}
                  {v.status === 'review' && !can('policy.approve') && <span className="self-center text-xs text-fg-muted">Waiting for the Owner</span>}
                  {v.status === 'approved' && can('policy.publish') && (
                    <Button size="sm" onClick={() => setAction({ kind: 'publish', version: v })}>
                      <IconWorldUpload aria-hidden className="size-4" /> Publish
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {manages && live && (
        <section aria-labelledby="acks-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="acks-heading" className="text-sm font-medium text-fg-muted">
              Acknowledgements for v{live.versionNo}
            </h3>
            {acks.data && (
              <Badge tone={acks.data.summary.acknowledged === acks.data.summary.total ? 'success' : 'warning'}>
                {acks.data.summary.acknowledged} of {acks.data.summary.total} acknowledged
              </Badge>
            )}
          </div>
          <Table caption={`Acknowledgement status for version ${live.versionNo}`}>
            <THead>
              <tr>
                <TH>Person</TH>
                <TH>Role</TH>
                <TH>Acknowledged</TH>
              </tr>
            </THead>
            <TBody>
              {acks.isLoading && <EmptyRow colSpan={3}>Loading...</EmptyRow>}
              {acks.data && acks.data.people.length === 0 && <EmptyRow colSpan={3}>No active staff in the assigned roles.</EmptyRow>}
              {acks.data?.people.map((p) => (
                <TR key={p.userId}>
                  <TD label="Person">{p.fullName}</TD>
                  <TD label="Role">{ROLE_LABELS[p.role]}</TD>
                  <TD label="Acknowledged">{p.acknowledgedAt ? <Badge tone="success">{fmtDate(p.acknowledgedAt)}</Badge> : <Badge tone="warning">Pending</Badge>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </section>
      )}

      <Dialog open={action?.kind === 'submit'} onClose={() => setAction(null)} title={action ? `Submit v${action.version.versionNo} for review` : ''} description="The Owner will be asked to approve it or request changes. You cannot edit it while it is in review.">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAction(null)}>
            Cancel
          </Button>
          <Button loading={submit.isPending} onClick={() => action && submit.mutate(action.version.id)}>
            Submit
          </Button>
        </div>
      </Dialog>

      {action?.kind === 'request-changes' && <RequestChangesDialog version={action.version} onClose={() => setAction(null)} onDone={invalidate} />}
      {action?.kind === 'approve' && <ApproveDialog version={action.version} onClose={() => setAction(null)} onDone={invalidate} />}
      {action?.kind === 'publish' && <PublishDialog version={action.version} onClose={() => setAction(null)} onDone={invalidate} />}
    </div>
  );
}

function RequestChangesDialog({ version, onClose, onDone }: { version: VersionSummary; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ReviewNoteInput>({ resolver: zodResolver(requestChangesSchema), defaultValues: { note: '' } });
  const m = useMutation({
    mutationFn: (v: ReviewNoteInput) => api.post(`/policies/versions/${version.id}/request-changes`, v),
    onSuccess: () => (toast.push('success', `v${version.versionNo} returned to draft.`), onDone(), onClose()),
    onError: (e) => setServerError(e instanceof ApiError ? e.message : 'Could not send the request'),
  });
  return (
    <Dialog open onClose={onClose} title={`Request changes to v${version.versionNo}`} description="The version returns to draft and the author sees your note.">
      <form onSubmit={form.handleSubmit((v) => (setServerError(null), m.mutate(v)))} noValidate className="space-y-4">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <Textarea label="What needs to change" required rows={4} autoFocus error={form.formState.errors.note?.message} {...form.register('note')} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={m.isPending}>
            Send back to draft
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ApproveDialog({ version, onClose, onDone }: { version: VersionSummary; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<{ note?: string }>({ resolver: zodResolver(approveSchema), defaultValues: { note: '' } });
  const m = useMutation({
    mutationFn: (v: { note?: string }) => api.post(`/policies/versions/${version.id}/approve`, v),
    onSuccess: () => (toast.push('success', `v${version.versionNo} approved. It can now be published.`), onDone(), onClose()),
    onError: (e) => setServerError(e instanceof ApiError ? e.message : 'Could not approve'),
  });
  return (
    <Dialog open onClose={onClose} title={`Approve v${version.versionNo}`} description={`Written by ${version.authorName ?? 'another user'}. Approval is recorded against your account in the audit log.`}>
      <form onSubmit={form.handleSubmit((v) => (setServerError(null), m.mutate(v)))} noValidate className="space-y-4">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <Textarea label="Note (optional)" rows={3} error={form.formState.errors.note?.message} {...form.register('note')} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={m.isPending}>
            Approve
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function PublishDialog({ version, onClose, onDone }: { version: VersionSummary; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<PublishForm, unknown, PublishInput>({ resolver: zodResolver(publishSchema), defaultValues: { roles: [] } });
  const m = useMutation({
    mutationFn: (v: PublishInput) => api.post(`/policies/versions/${version.id}/publish`, v),
    onSuccess: () => (toast.push('success', `v${version.versionNo} is now the live version.`), onDone(), onClose()),
    onError: (e) => setServerError(e instanceof ApiError ? e.message : 'Could not publish'),
  });
  const rolesError = form.formState.errors.roles?.message;
  return (
    <Dialog open onClose={onClose} title={`Publish v${version.versionNo}`} description="Choose who must read and acknowledge it. Any earlier published version becomes superseded and its wording is locked forever.">
      <form onSubmit={form.handleSubmit((v) => (setServerError(null), m.mutate(v)))} noValidate className="space-y-4">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <fieldset>
          <legend className="text-sm font-medium">Assign to roles</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {ROLES.map((r: Role) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm hover:border-border-strong">
                <input type="checkbox" value={r} className="size-4 accent-sky-400" {...form.register('roles')} />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
          {rolesError && (
            <p role="alert" className="mt-2 text-xs text-danger">
              {rolesError}
            </p>
          )}
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={m.isPending}>
            Publish
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
