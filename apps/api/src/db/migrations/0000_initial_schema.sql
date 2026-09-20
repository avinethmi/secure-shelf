CREATE TYPE "public"."assessment_status" AS ENUM('not_started', 'in_progress', 'implemented', 'not_applicable', 'gap');--> statement-breakpoint
CREATE TYPE "public"."cctv_access_kind" AS ENUM('viewing', 'export');--> statement-breakpoint
CREATE TYPE "public"."classification" AS ENUM('public', 'internal', 'confidential', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."control_source" AS ENUM('ISO27001', 'NIST_CSF', 'PCI_DSS', 'PDPA');--> statement-breakpoint
CREATE TYPE "public"."course_status" AS ENUM('assigned', 'in_progress', 'passed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."incident_category" AS ENUM('unauthorised_access', 'suspicious_activity', 'policy_violation', 'hardware_or_register', 'data_handling', 'other');--> statement-breakpoint
CREATE TYPE "public"."incident_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('new', 'triaged', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."policy_type" AS ENUM('overall', 'issue_specific', 'system_specific');--> statement-breakpoint
CREATE TYPE "public"."policy_version_status" AS ENUM('draft', 'review', 'approved', 'published', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'security_admin', 'manager', 'cashier', 'stock_staff');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'offboarded');--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"refresh_hash" text NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"full_name" text NOT NULL,
	"job_title" text,
	"nic_enc" text,
	"phone_enc" text,
	"contact_enc" text,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"totp_secret_enc" text,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"type" "policy_type" NOT NULL,
	"classification" "classification" DEFAULT 'internal' NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "policy_acknowledgements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"version_id" integer NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policy_ack_user_version_uq" UNIQUE("user_id","version_id")
);
--> statement-breakpoint
CREATE TABLE "policy_version_roles" (
	"version_id" integer NOT NULL,
	"role" "role" NOT NULL,
	CONSTRAINT "policy_version_roles_version_id_role_pk" PRIMARY KEY("version_id","role")
);
--> statement-breakpoint
CREATE TABLE "policy_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_id" integer NOT NULL,
	"version_no" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"change_note" text,
	"status" "policy_version_status" DEFAULT 'draft' NOT NULL,
	"author_id" integer NOT NULL,
	"approver_id" integer,
	"review_note" text,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policy_versions_policy_version_uq" UNIQUE("policy_id","version_no")
);
--> statement-breakpoint
CREATE TABLE "course_progress" (
	"user_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"status" "course_status" DEFAULT 'assigned' NOT NULL,
	"lessons_done" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attempts_used" integer DEFAULT 0 NOT NULL,
	"best_score" integer,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "course_progress_user_id_course_id_pk" PRIMARY KEY("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "course_roles" (
	"course_id" integer NOT NULL,
	"role" "role" NOT NULL,
	CONSTRAINT "course_roles_course_id_role_pk" PRIMARY KEY("course_id","role")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"topic" text NOT NULL,
	"description" text NOT NULL,
	"pass_mark" integer DEFAULT 80 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"questions_per_attempt" integer DEFAULT 5 NOT NULL,
	"due_days" integer DEFAULT 14 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"order_no" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	CONSTRAINT "lessons_course_order_uq" UNIQUE("course_id","order_no")
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"attempt_no" integer NOT NULL,
	"question_ids" jsonb NOT NULL,
	"option_orders" jsonb NOT NULL,
	"answers" jsonb,
	"score" integer,
	"passed" boolean,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"lesson_id" integer,
	"prompt" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"owner_id" integer,
	"classification" "classification" DEFAULT 'internal' NOT NULL,
	"data_types" text[] DEFAULT '{}' NOT NULL,
	"location" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "control_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"control_id" integer NOT NULL,
	"asset_id" integer,
	"status" "assessment_status" DEFAULT 'not_started' NOT NULL,
	"owner_id" integer,
	"target_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"source" "control_source" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "controls_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "evidence_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessment_id" integer NOT NULL,
	"original_name" text NOT NULL,
	"stored_name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"uploaded_by" integer NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_files_stored_name_unique" UNIQUE("stored_name")
);
--> statement-breakpoint
CREATE TABLE "camera_authorisations" (
	"id" serial PRIMARY KEY NOT NULL,
	"camera_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"granted_by" integer NOT NULL,
	"reason" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cameras" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"location" text NOT NULL,
	"purpose" text NOT NULL,
	"retention_days" integer DEFAULT 30 NOT NULL,
	"signage_present" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cameras_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "cctv_access_declarations" (
	"id" serial PRIMARY KEY NOT NULL,
	"camera_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"kind" "cctv_access_kind" NOT NULL,
	"reason" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"declared_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitoring_notice_acks" (
	"user_id" integer NOT NULL,
	"notice_id" integer NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitoring_notice_acks_user_id_notice_id_pk" PRIMARY KEY("user_id","notice_id")
);
--> statement-breakpoint
CREATE TABLE "monitoring_notices" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_no" integer NOT NULL,
	"content" text NOT NULL,
	"published_by" integer NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitoring_notices_version_no_unique" UNIQUE("version_no")
);
--> statement-breakpoint
CREATE TABLE "incident_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"incident_id" integer NOT NULL,
	"from_status" "incident_status",
	"to_status" "incident_status" NOT NULL,
	"changed_by" integer NOT NULL,
	"note" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"reported_by" integer NOT NULL,
	"category" "incident_category" NOT NULL,
	"severity" "incident_severity" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"status" "incident_status" DEFAULT 'new' NOT NULL,
	"assigned_to" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incidents_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" integer,
	"actor_role" "role",
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" text,
	"prev_hash" char(64) NOT NULL,
	"hash" char(64) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_acknowledgements" ADD CONSTRAINT "policy_acknowledgements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_acknowledgements" ADD CONSTRAINT "policy_acknowledgements_version_id_policy_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."policy_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_version_roles" ADD CONSTRAINT "policy_version_roles_version_id_policy_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."policy_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_roles" ADD CONSTRAINT "course_roles_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_assessments" ADD CONSTRAINT "control_assessments_control_id_controls_id_fk" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_assessments" ADD CONSTRAINT "control_assessments_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_assessments" ADD CONSTRAINT "control_assessments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_assessment_id_control_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."control_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camera_authorisations" ADD CONSTRAINT "camera_authorisations_camera_id_cameras_id_fk" FOREIGN KEY ("camera_id") REFERENCES "public"."cameras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camera_authorisations" ADD CONSTRAINT "camera_authorisations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camera_authorisations" ADD CONSTRAINT "camera_authorisations_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cctv_access_declarations" ADD CONSTRAINT "cctv_access_declarations_camera_id_cameras_id_fk" FOREIGN KEY ("camera_id") REFERENCES "public"."cameras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cctv_access_declarations" ADD CONSTRAINT "cctv_access_declarations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_notice_acks" ADD CONSTRAINT "monitoring_notice_acks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_notice_acks" ADD CONSTRAINT "monitoring_notice_acks_notice_id_monitoring_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."monitoring_notices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_notices" ADD CONSTRAINT "monitoring_notices_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_status_history" ADD CONSTRAINT "incident_status_history_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_status_history" ADD CONSTRAINT "incident_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "policy_versions_status_idx" ON "policy_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_course_idx" ON "quiz_attempts" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "quiz_questions_course_idx" ON "quiz_questions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "control_assessments_status_idx" ON "control_assessments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "camera_auth_user_idx" ON "camera_authorisations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "incidents_status_idx" ON "incidents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_at_idx" ON "audit_events" USING btree ("at");