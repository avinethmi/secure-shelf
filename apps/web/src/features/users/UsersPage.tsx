import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconLockOpen, IconPlus, IconUserOff, IconUserX, IconDeviceMobileOff, IconUserCheck } from '@tabler/icons-react';
import { ROLES, ROLE_LABELS, createUserSchema, type CreateUserInput, type CreateUserForm, type Role, type UserStatus } from '@secureshelf/shared';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/useAuth';

type AdminUser = {
  id: number;
  email: string;
  fullName: string;
  jobTitle: string | null;
  role: Role;
  status: UserStatus;
  failedAttempts: number;
  lockedAt: string | null;
  totpEnabled: boolean;
  createdAt: string;
  nic: string | null;
  phone: string | null;
};

const statusTone: Record<UserStatus, 'success' | 'warning' | 'neutral'> = { active: 'success', suspended: 'warning', offboarded: 'neutral' };

// FR-05: create, suspend, offboard; FR-02: unlock; FR-03: reset 2FA. All audited server-side.
export function UsersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { user: me } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ user: AdminUser; action: 'suspend' | 'offboard' | 'reactivate' | 'unlock' | 'reset-2fa' } | null>(null);

  const users = useQuery({ queryKey: ['users'], queryFn: () => api.get<{ users: AdminUser[] }>('/users').then((r) => r.users) });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  const act = useMutation({
    mutationFn: async ({ user, action }: NonNullable<typeof confirm>) => {
      if (action === 'unlock') return api.post(`/users/${user.id}/unlock`);
      if (action === 'reset-2fa') return api.post(`/users/${user.id}/reset-2fa`);
      const status: UserStatus = action === 'suspend' ? 'suspended' : action === 'offboard' ? 'offboarded' : 'active';
      return api.patch(`/users/${user.id}/status`, { status });
    },
    onSuccess: (_d, v) => {
      toast.push('success', `${v.user.fullName}: ${labelFor(v.action)} done.`);
      setConfirm(null);
      invalidate();
    },
    onError: (e) => toast.push('danger', e instanceof ApiError ? e.message : 'Action failed'),
  });

  const list = users.data ?? [];
  const locked = list.filter((u) => u.lockedAt);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Accounts</h2>
          <p className="text-sm text-fg-muted">One role per person. Leaving an account suspended or offboarded signs it out everywhere immediately.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <IconPlus aria-hidden className="size-4" /> New account
        </Button>
      </div>

      {locked.length > 0 && (
        <Alert tone="warning" title={`${locked.length} locked account${locked.length > 1 ? 's' : ''}`}>
          Locked after 5 failed sign-in attempts. Confirm the person's identity before unlocking.
        </Alert>
      )}

      {users.isError && <Alert tone="danger">Could not load accounts.</Alert>}

      <Table caption="Staff accounts">
        <THead>
          <tr>
            <TH>Person</TH>
            <TH>Role</TH>
            <TH>Status</TH>
            <TH>2FA</TH>
            <TH className="text-right">Actions</TH>
          </tr>
        </THead>
        <TBody>
          {users.isLoading && <EmptyRow colSpan={5}>Loading accounts...</EmptyRow>}
          {!users.isLoading && list.length === 0 && <EmptyRow colSpan={5}>No accounts yet.</EmptyRow>}
          {list.map((u) => (
            <TR key={u.id}>
              <TD label="Person">
                <span className="block font-medium">{u.fullName}</span>
                <span className="block text-xs text-fg-muted">{u.email}</span>
              </TD>
              <TD label="Role">{ROLE_LABELS[u.role]}</TD>
              <TD label="Status">
                <span className="flex flex-wrap justify-end gap-1.5 sm:justify-start">
                  <Badge tone={statusTone[u.status]}>{u.status}</Badge>
                  {u.lockedAt && <Badge tone="danger">locked</Badge>}
                </span>
              </TD>
              <TD label="2FA">{u.role === 'owner' || u.role === 'security_admin' ? <Badge tone={u.totpEnabled ? 'success' : 'warning'}>{u.totpEnabled ? 'enrolled' : 'pending'}</Badge> : <span className="text-fg-subtle">n/a</span>}</TD>
              <TD label="Actions" className="sm:text-right">
                <span className="flex flex-wrap justify-end gap-1">
                  {u.lockedAt && (
                    <Button size="sm" variant="secondary" onClick={() => setConfirm({ user: u, action: 'unlock' })}>
                      <IconLockOpen aria-hidden className="size-4" /> Unlock
                    </Button>
                  )}
                  {(u.role === 'owner' || u.role === 'security_admin') && u.totpEnabled && u.id !== me?.id && (
                    <Button size="sm" variant="ghost" onClick={() => setConfirm({ user: u, action: 'reset-2fa' })} title="Reset two-factor authentication">
                      <IconDeviceMobileOff aria-hidden className="size-4" /> Reset 2FA
                    </Button>
                  )}
                  {u.id !== me?.id && u.status === 'active' && (
                    <Button size="sm" variant="ghost" onClick={() => setConfirm({ user: u, action: 'suspend' })}>
                      <IconUserOff aria-hidden className="size-4" /> Suspend
                    </Button>
                  )}
                  {u.id !== me?.id && u.status === 'suspended' && (
                    <Button size="sm" variant="ghost" onClick={() => setConfirm({ user: u, action: 'reactivate' })}>
                      <IconUserCheck aria-hidden className="size-4" /> Reactivate
                    </Button>
                  )}
                  {u.id !== me?.id && u.status !== 'offboarded' && (
                    <Button size="sm" variant="danger" onClick={() => setConfirm({ user: u, action: 'offboard' })}>
                      <IconUserX aria-hidden className="size-4" /> Offboard
                    </Button>
                  )}
                </span>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => (setCreateOpen(false), invalidate())} />

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title={confirm ? `${labelFor(confirm.action)}: ${confirm.user.fullName}` : ''} description={confirm ? describe(confirm.action) : undefined}>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button variant={confirm?.action === 'offboard' ? 'danger' : 'primary'} loading={act.isPending} onClick={() => confirm && act.mutate(confirm)}>
            Confirm
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function labelFor(a: NonNullable<Parameters<typeof describe>[0]>) {
  return { suspend: 'Suspend', offboard: 'Offboard', reactivate: 'Reactivate', unlock: 'Unlock', 'reset-2fa': 'Reset two-factor' }[a];
}
function describe(a: 'suspend' | 'offboard' | 'reactivate' | 'unlock' | 'reset-2fa') {
  return {
    suspend: 'The person is signed out everywhere now and cannot sign in until reactivated. This is recorded in the audit log.',
    offboard: 'Permanent. All sessions are revoked and the account can never be reactivated (L5: removal of access rights on termination).',
    reactivate: 'The person can sign in again with their existing password.',
    unlock: 'Clears the failed-attempt counter. Only do this after confirming the person\'s identity.',
    'reset-2fa': 'Removes the current authenticator setup and signs the person out. They will enrol a new device at their next sign-in.',
  }[a];
}

function CreateUserDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<CreateUserForm, unknown, CreateUserInput>({ resolver: zodResolver(createUserSchema), defaultValues: { role: 'cashier' } });

  const create = useMutation({
    mutationFn: (values: CreateUserInput) => api.post('/users', values),
    onSuccess: () => {
      toast.push('success', 'Account created.');
      form.reset({ role: 'cashier' });
      onCreated();
    },
    onError: (e) => setServerError(e instanceof ApiError ? e.message : 'Could not create the account'),
  });

  return (
    <Dialog open={open} onClose={onClose} title="New account" description="NIC, phone and contact details are encrypted at rest and only visible to account administrators.">
      <form onSubmit={form.handleSubmit((v) => (setServerError(null), create.mutate(v)))} noValidate className="grid gap-4 sm:grid-cols-2">
        {serverError && (
          <div className="sm:col-span-2">
            <Alert tone="danger">{serverError}</Alert>
          </div>
        )}
        <Input label="Full name" required autoComplete="off" error={form.formState.errors.fullName?.message} {...form.register('fullName')} />
        <Input label="Email" type="email" required autoComplete="off" error={form.formState.errors.email?.message} {...form.register('email')} />
        <Select label="Role" required options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} error={form.formState.errors.role?.message} {...form.register('role')} />
        <Input label="Job title" error={form.formState.errors.jobTitle?.message} {...form.register('jobTitle')} />
        <Input label="Temporary password" type="text" required autoComplete="new-password" hint="At least 12 characters. Ask the person to change it after first sign-in." error={form.formState.errors.password?.message} {...form.register('password')} />
        <Input label="NIC number" hint="Encrypted (AES-256-GCM)" error={form.formState.errors.nic?.message} {...form.register('nic')} />
        <Input label="Phone" hint="Encrypted" error={form.formState.errors.phone?.message} {...form.register('phone')} />
        <Input label="Contact address" hint="Encrypted" error={form.formState.errors.contact?.message} {...form.register('contact')} />
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Create account
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
