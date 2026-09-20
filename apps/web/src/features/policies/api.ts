import { useQuery } from '@tanstack/react-query';
import type { Classification, PolicyType, PolicyVersionStatus, Role } from '@secureshelf/shared';
import { api } from '@/api/client';
import { useAuth } from '@/features/auth/useAuth';

// Response shapes from apps/api/src/modules/policies/service.ts.

export type PolicyRow = {
  id: number;
  code: string;
  title: string;
  type: PolicyType;
  classification: Classification;
  createdBy: number;
  createdAt: string;
};

export type VersionSummary = {
  id: number;
  policyId: number;
  versionNo: number;
  title: string;
  changeNote: string | null;
  status: PolicyVersionStatus;
  authorId: number;
  authorName: string | null;
  approverId: number | null;
  approverName: string | null;
  reviewNote: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles?: Role[];
};

export type RegisterEntry = PolicyRow & {
  versionCount: number;
  published: (VersionSummary & { roles: Role[] }) | null;
  inFlight: VersionSummary | null;
};

export type AssignedPolicy = {
  policyId: number;
  code: string;
  type: PolicyType;
  classification: Classification;
  versionId: number;
  versionNo: number;
  title: string;
  publishedAt: string | null;
  acknowledgedAt: string | null;
};

export type VersionDetail = {
  version: VersionSummary & { content: string; roles: Role[] };
  policy: PolicyRow;
  acknowledgedAt: string | null;
  canAcknowledge: boolean;
};

export type AckStatus = {
  version: { id: number; versionNo: number; title: string; publishedAt: string | null; roles: Role[] } | null;
  people: { userId: number; fullName: string; role: Role; acknowledgedAt: string | null }[];
  summary: { total: number; acknowledged: number };
};

export const policyKeys = {
  register: ['policies', 'register'] as const,
  assigned: ['policies', 'assigned'] as const,
  policy: (id: number) => ['policies', 'policy', id] as const,
  version: (vid: number) => ['policies', 'version', vid] as const,
  acks: (id: number) => ['policies', 'acks', id] as const,
};

export const useRegister = (enabled = true) =>
  useQuery({ queryKey: policyKeys.register, queryFn: () => api.get<{ policies: RegisterEntry[] }>('/policies').then((r) => r.policies), enabled });

export const useAssigned = () =>
  useQuery({ queryKey: policyKeys.assigned, queryFn: () => api.get<{ policies: AssignedPolicy[] }>('/policies/assigned').then((r) => r.policies) });

export const usePolicy = (id: number) =>
  useQuery({ queryKey: policyKeys.policy(id), queryFn: () => api.get<{ policy: PolicyRow; versions: (VersionSummary & { roles: Role[] })[] }>(`/policies/${id}`), enabled: Number.isFinite(id) });

export const useVersion = (vid: number) => useQuery({ queryKey: policyKeys.version(vid), queryFn: () => api.get<VersionDetail>(`/policies/versions/${vid}`), enabled: Number.isFinite(vid) });

export const useAckStatus = (id: number, enabled: boolean) =>
  useQuery({ queryKey: policyKeys.acks(id), queryFn: () => api.get<AckStatus>(`/policies/${id}/acknowledgements`), enabled: enabled && Number.isFinite(id) });

// FR-09 gate: what the signed-in person still has to acknowledge.
export function usePendingAcknowledgements() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: policyKeys.assigned,
    queryFn: () => api.get<{ policies: AssignedPolicy[] }>('/policies/assigned').then((r) => r.policies),
    enabled: !!user,
  });
  const pending = (q.data ?? []).filter((p) => !p.acknowledgedAt);
  return { pending, isLoading: q.isLoading, isFetched: q.isFetched };
}

export const statusTone: Record<PolicyVersionStatus, 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent'> = {
  draft: 'neutral',
  review: 'warning',
  approved: 'info',
  published: 'success',
  superseded: 'neutral',
};

export const statusLabel: Record<PolicyVersionStatus, string> = {
  draft: 'Draft',
  review: 'In review',
  approved: 'Approved',
  published: 'Published',
  superseded: 'Superseded',
};

export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'None');
