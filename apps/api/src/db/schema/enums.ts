import { pgEnum } from 'drizzle-orm/pg-core';
import {
  ROLES,
  USER_STATUSES,
  POLICY_TYPES,
  CLASSIFICATIONS,
  POLICY_VERSION_STATUSES,
  COURSE_STATUSES,
  CONTROL_SOURCES,
  ASSESSMENT_STATUSES,
  CCTV_ACCESS_KINDS,
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
} from '@secureshelf/shared';

// PostgreSQL enums mirror the shared TypeScript enums so the database itself rejects
// values the application does not know about.
export const roleEnum = pgEnum('role', ROLES);
export const userStatusEnum = pgEnum('user_status', USER_STATUSES);
export const policyTypeEnum = pgEnum('policy_type', POLICY_TYPES);
export const classificationEnum = pgEnum('classification', CLASSIFICATIONS);
export const policyVersionStatusEnum = pgEnum('policy_version_status', POLICY_VERSION_STATUSES);
export const courseStatusEnum = pgEnum('course_status', COURSE_STATUSES);
export const controlSourceEnum = pgEnum('control_source', CONTROL_SOURCES);
export const assessmentStatusEnum = pgEnum('assessment_status', ASSESSMENT_STATUSES);
export const cctvAccessKindEnum = pgEnum('cctv_access_kind', CCTV_ACCESS_KINDS);
export const incidentCategoryEnum = pgEnum('incident_category', INCIDENT_CATEGORIES);
export const incidentSeverityEnum = pgEnum('incident_severity', INCIDENT_SEVERITIES);
export const incidentStatusEnum = pgEnum('incident_status', INCIDENT_STATUSES);
