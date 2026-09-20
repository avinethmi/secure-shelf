// Enumerations shared by the API and the web app. Values are stored in PostgreSQL as-is.
// Source of truth for names: proposal §5.1 (roles), §2.2 (policy types), L3 lecture (classification).

export const ROLES = ['owner', 'security_admin', 'manager', 'cashier', 'stock_staff'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  security_admin: 'Security Admin',
  manager: 'Manager',
  cashier: 'Cashier',
  stock_staff: 'Stock Staff',
};

// Roles that must use a second factor (proposal FR-03)
export const TOTP_REQUIRED_ROLES: readonly Role[] = ['owner', 'security_admin'];

export const USER_STATUSES = ['active', 'suspended', 'offboarded'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const POLICY_TYPES = ['overall', 'issue_specific', 'system_specific'] as const;
export type PolicyType = (typeof POLICY_TYPES)[number];

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  overall: 'Overall (enterprise)',
  issue_specific: 'Issue-specific',
  system_specific: 'System-specific',
};

export const CLASSIFICATIONS = ['public', 'internal', 'confidential', 'restricted'] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const POLICY_VERSION_STATUSES = ['draft', 'review', 'approved', 'published', 'superseded'] as const;
export type PolicyVersionStatus = (typeof POLICY_VERSION_STATUSES)[number];

export const COURSE_STATUSES = ['assigned', 'in_progress', 'passed', 'failed'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const CONTROL_SOURCES = ['ISO27001', 'NIST_CSF', 'PCI_DSS', 'PDPA'] as const;
export type ControlSource = (typeof CONTROL_SOURCES)[number];

export const ASSESSMENT_STATUSES = ['not_started', 'in_progress', 'implemented', 'not_applicable', 'gap'] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const CCTV_ACCESS_KINDS = ['viewing', 'export'] as const;
export type CctvAccessKind = (typeof CCTV_ACCESS_KINDS)[number];

export const INCIDENT_CATEGORIES = [
  'unauthorised_access',
  'suspicious_activity',
  'policy_violation',
  'hardware_or_register',
  'data_handling',
  'other',
] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const INCIDENT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_STATUSES = ['new', 'triaged', 'in_progress', 'resolved', 'closed'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

// Permission codes. The role → permission map lives in the API (lib/permissions.ts) and is
// the proposal §5.1 matrix; the web app only uses these codes to show or hide navigation.
export const PERMISSIONS = [
  'users.manage',
  'policy.write',
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
] as const;
export type Permission = (typeof PERMISSIONS)[number];
