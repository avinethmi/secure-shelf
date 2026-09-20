import type { Permission } from '@secureshelf/shared';
import {
  IconLayoutDashboard,
  IconFileText,
  IconSchool,
  IconClipboardCheck,
  IconVideo,
  IconAlertTriangle,
  IconUsers,
  IconHistory,
  type Icon,
} from '@tabler/icons-react';

// Sidebar entries, grouped like Docker Desktop. An entry is shown only if the user holds one
// of its permissions; the API enforces the same rule, this only shapes the menu (FR-20).
export type NavItem = { to: string; label: string; icon: Icon; permissions: Permission[]; group: 'work' | 'govern' | 'admin' };

export const NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: IconLayoutDashboard, permissions: ['policy.read'], group: 'work' },
  { to: '/app/policies', label: 'Policies', icon: IconFileText, permissions: ['policy.read'], group: 'work' },
  { to: '/app/training', label: 'Training', icon: IconSchool, permissions: ['training.take'], group: 'work' },
  { to: '/app/incidents', label: 'Incidents', icon: IconAlertTriangle, permissions: ['incident.report'], group: 'work' },
  { to: '/app/compliance', label: 'Compliance', icon: IconClipboardCheck, permissions: ['control.assess', 'asset.manage'], group: 'govern' },
  { to: '/app/cctv', label: 'CCTV governance', icon: IconVideo, permissions: ['cctv.manage'], group: 'govern' },
  { to: '/app/audit', label: 'Audit log', icon: IconHistory, permissions: ['audit.read'], group: 'govern' },
  { to: '/app/users', label: 'Accounts', icon: IconUsers, permissions: ['users.manage'], group: 'admin' },
];

export const NAV_GROUP_LABELS: Record<NavItem['group'], string> = { work: 'My work', govern: 'Governance', admin: 'Administration' };
