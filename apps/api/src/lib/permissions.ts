import type { Permission, Role } from '@secureshelf/shared';

// Proposal §5.1 capability matrix, plus the three assumptions recorded in the plan:
//   A1  account administration = Owner + Security Admin
//   A2  write = Security Admin; approve = Owner; publish = Owner or Security Admin
//   A4  incident management = Owner + Security Admin
// Anything not listed is denied.
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: [
    'users.manage',
    'policy.approve',
    'policy.publish',
    'policy.read',
    'training.assign',
    'training.view_team',
    'training.take',
    'asset.manage',
    'control.assess',
    'report.generate',
    'cctv.manage',
    'cctv.declare',
    'incident.report',
    'incident.manage',
    'audit.read',
  ],
  security_admin: [
    'users.manage',
    'policy.write',
    'policy.publish',
    'policy.read',
    'training.assign',
    'training.view_team',
    'training.take',
    'asset.manage',
    'control.assess',
    'report.generate',
    'cctv.manage',
    'cctv.declare',
    'incident.report',
    'incident.manage',
    'audit.read',
  ],
  manager: ['policy.read', 'training.assign', 'training.view_team', 'training.take', 'cctv.declare', 'incident.report'],
  cashier: ['policy.read', 'training.take', 'cctv.declare', 'incident.report'],
  stock_staff: ['policy.read', 'training.take', 'cctv.declare', 'incident.report'],
};

export const hasPermission = (role: Role, permission: Permission) => ROLE_PERMISSIONS[role].includes(permission);
export const permissionsFor = (role: Role): readonly Permission[] => ROLE_PERMISSIONS[role];
