import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconArrowLeft, IconDeviceFloppy } from '@tabler/icons-react';
import {
  POLICY_TYPES,
  POLICY_TYPE_LABELS,
  CLASSIFICATIONS,
  createPolicySchema,
  createVersionSchema,
  type CreatePolicyForm,
  type CreatePolicyInput,
  type CreateVersionForm,
  type CreateVersionInput,
} from '@secureshelf/shared';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Alert';
import { Tabs } from '@/components/ui/Tabs';
import { Markdown } from '@/components/ui/Markdown';
import { useToast } from '@/components/ui/Toast';
import { usePolicy, useVersion, policyKeys } from './api';

const TEMPLATE = `# Policy title

## 1. Purpose
Why this policy exists and who it protects.

## 2. Authorised access and use
- What staff may do.

## 3. Prohibited use
- What staff must not do.

## 4. Systems management
Who maintains the systems this policy covers.

## 5. Violations
How breaches are handled.

## 6. Review
How often this policy is reviewed.`;

// FR-06 (new policy), FR-07 (new numbered version, edit a draft). One editor, three entry
// points; the URL decides which. Content is markdown with a live preview.
export function PolicyEditorPage() {
  const { id: idParam, vid: vidParam } = useParams();
  if (vidParam) return <EditDraft vid={Number(vidParam)} />;
  if (idParam) return <NewVersion policyId={Number(idParam)} />;
  return <NewPolicy />;
}

function EditorFrame({ title, subtitle, backTo, children }: { title: string; subtitle: string; backTo: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <Link to={backTo} className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
          <IconArrowLeft aria-hidden className="size-4" /> Back
        </Link>
        <h2 className="mt-2 text-xl font-semibold">{title}</h2>
        <p className="text-sm text-fg-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

// Content field with an Edit / Preview toggle so the author sees the rendered policy before
// submitting it. On wide screens both are shown side by side.
function ContentField({ value, error, register }: { value: string; error?: string; register: UseFormRegisterReturn }) {
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  return (
    <div className="space-y-2">
      <Tabs
        className="w-fit lg:hidden"
        tabs={[
          { key: 'edit', label: 'Edit' },
          { key: 'preview', label: 'Preview' },
        ]}
        value={view}
        onChange={setView}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={view === 'preview' ? 'hidden lg:block' : ''}>
          <Textarea label="Policy text (markdown)" required rows={22} hint="Headings with #, bullets with -, bold with **text**." error={error} className="font-mono text-[13px]" {...register} />
        </div>
        <div className={view === 'edit' ? 'hidden lg:block' : ''}>
          <p className="mb-1.5 text-sm font-medium">Preview</p>
          <div className="max-h-[36rem] overflow-y-auto rounded-lg border border-border bg-surface p-5">{value.trim() ? <Markdown source={value} /> : <p className="text-sm text-fg-subtle">Nothing to preview yet.</p>}</div>
        </div>
      </div>
    </div>
  );
}

function NewPolicy() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<CreatePolicyForm, unknown, CreatePolicyInput>({ resolver: zodResolver(createPolicySchema), defaultValues: { type: 'issue_specific', classification: 'internal', content: TEMPLATE, changeNote: 'Initial draft' } });
  const create = useMutation({
    mutationFn: (v: CreatePolicyInput) => api.post<{ policy: { id: number } }>('/policies', v),
    onSuccess: (r) => {
      toast.push('success', 'Draft created.');
      qc.invalidateQueries({ queryKey: policyKeys.register });
      navigate(`/app/policies/${r.policy.id}`, { replace: true });
    },
    onError: (e) => setServerError(e instanceof ApiError ? e.message : 'Could not create the policy'),
  });
  const content = form.watch('content') ?? '';

  return (
    <EditorFrame title="New policy" subtitle="Starts as draft version 1. Submit it for the Owner to review when it is ready." backTo="/app/policies">
      <form onSubmit={form.handleSubmit((v) => (setServerError(null), create.mutate(v)))} noValidate className="space-y-5">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Title" required className="sm:col-span-3" error={form.formState.errors.title?.message} {...form.register('title')} />
          <Select label="Policy type" required options={POLICY_TYPES.map((t) => ({ value: t, label: POLICY_TYPE_LABELS[t] }))} error={form.formState.errors.type?.message} {...form.register('type')} />
          <Select label="Classification" required options={CLASSIFICATIONS.map((c) => ({ value: c, label: c[0]!.toUpperCase() + c.slice(1) }))} error={form.formState.errors.classification?.message} {...form.register('classification')} />
          <Input label="Change note" error={form.formState.errors.changeNote?.message} {...form.register('changeNote')} />
        </div>
        <ContentField value={content} error={form.formState.errors.content?.message} register={form.register('content')} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate('/app/policies')}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            <IconDeviceFloppy aria-hidden className="size-4" /> Save draft
          </Button>
        </div>
      </form>
    </EditorFrame>
  );
}

function VersionForm({
  defaults,
  submitLabel,
  pending,
  serverError,
  onSubmit,
  onCancel,
}: {
  defaults: CreateVersionForm;
  submitLabel: string;
  pending: boolean;
  serverError: string | null;
  onSubmit: (v: CreateVersionInput) => void;
  onCancel: () => void;
}) {
  const form = useForm<CreateVersionForm, unknown, CreateVersionInput>({ resolver: zodResolver(createVersionSchema), defaultValues: defaults });
  const content = form.watch('content') ?? '';
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Title" required error={form.formState.errors.title?.message} {...form.register('title')} />
        <Input label="Change note" hint="What changed and why. Shown on the register." error={form.formState.errors.changeNote?.message} {...form.register('changeNote')} />
      </div>
      <ContentField value={content} error={form.formState.errors.content?.message} register={form.register('content')} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          <IconDeviceFloppy aria-hidden className="size-4" /> {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function NewVersion({ policyId }: { policyId: number }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const policy = usePolicy(policyId);
  const latestId = policy.data?.versions[0]?.id;
  const latest = useVersion(latestId ?? NaN);
  const create = useMutation({
    mutationFn: (v: CreateVersionInput) => api.post(`/policies/${policyId}/versions`, v),
    onSuccess: () => {
      toast.push('success', 'New draft version created.');
      qc.invalidateQueries({ queryKey: policyKeys.policy(policyId) });
      qc.invalidateQueries({ queryKey: policyKeys.register });
      navigate(`/app/policies/${policyId}`, { replace: true });
    },
    onError: (e) => setServerError(e instanceof ApiError ? e.message : 'Could not create the version'),
  });

  if (policy.isLoading || (latestId && latest.isLoading)) return <p className="py-10 text-center text-sm text-fg-muted">Loading...</p>;
  if (!policy.data) return <Alert tone="danger">Policy not found.</Alert>;
  const nextNo = (policy.data.versions[0]?.versionNo ?? 0) + 1;

  return (
    <EditorFrame title={`${policy.data.policy.code}: new version ${nextNo}`} subtitle="Starts from the latest wording. The current published version stays live until this one is approved and published." backTo={`/app/policies/${policyId}`}>
      <VersionForm
        defaults={{ title: latest.data?.version.title ?? policy.data.policy.title, content: latest.data?.version.content ?? TEMPLATE, changeNote: '' }}
        submitLabel="Save draft"
        pending={create.isPending}
        serverError={serverError}
        onSubmit={(v) => (setServerError(null), create.mutate(v))}
        onCancel={() => navigate(`/app/policies/${policyId}`)}
      />
    </EditorFrame>
  );
}

function EditDraft({ vid }: { vid: number }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const q = useVersion(vid);
  const save = useMutation({
    mutationFn: (v: CreateVersionInput) => api.patch(`/policies/versions/${vid}`, v),
    onSuccess: () => {
      toast.push('success', 'Draft saved.');
      qc.invalidateQueries({ queryKey: policyKeys.version(vid) });
      if (q.data) qc.invalidateQueries({ queryKey: policyKeys.policy(q.data.policy.id) });
      qc.invalidateQueries({ queryKey: policyKeys.register });
      navigate(`/app/policies/${q.data?.policy.id}`, { replace: true });
    },
    onError: (e) => setServerError(e instanceof ApiError ? e.message : 'Could not save the draft'),
  });

  // A version that left draft while this page was open is no longer editable.
  useEffect(() => {
    if (q.data && q.data.version.status !== 'draft') navigate(`/app/policies/${q.data.policy.id}`, { replace: true });
  }, [q.data, navigate]);

  if (q.isLoading) return <p className="py-10 text-center text-sm text-fg-muted">Loading...</p>;
  if (!q.data) return <Alert tone="danger">Version not found.</Alert>;
  const { version, policy } = q.data;

  return (
    <EditorFrame title={`${policy.code}: edit draft v${version.versionNo}`} subtitle={version.reviewNote ? `Changes requested: ${version.reviewNote}` : 'Only drafts can be edited. Submit it for review when ready.'} backTo={`/app/policies/${policy.id}`}>
      <VersionForm
        defaults={{ title: version.title, content: version.content, changeNote: version.changeNote ?? '' }}
        submitLabel="Save draft"
        pending={save.isPending}
        serverError={serverError}
        onSubmit={(v) => (setServerError(null), save.mutate(v))}
        onCancel={() => navigate(`/app/policies/${policy.id}`)}
      />
    </EditorFrame>
  );
}
