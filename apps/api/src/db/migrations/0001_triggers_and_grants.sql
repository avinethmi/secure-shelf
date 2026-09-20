-- Hand-written: rules the database enforces on its own, independent of application code.

-- 1. Audit log is append-only (FR-19, proposal §5.3). Any UPDATE or DELETE raises, even for
--    the owner role. A superuser could still drop the trigger; that limitation is documented
--    in the proposal and in docs/SECURITY.md.
CREATE OR REPLACE FUNCTION audit_events_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_events_no_update_delete ON audit_events;
--> statement-breakpoint
CREATE TRIGGER audit_events_no_update_delete
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_immutable();
--> statement-breakpoint

-- 2. A published policy version can never have its wording changed (FR-07). Only the status
--    may move on (published -> superseded) and updated_at may tick.
CREATE OR REPLACE FUNCTION policy_versions_published_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('published', 'superseded') THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.content IS DISTINCT FROM OLD.content
       OR NEW.change_note IS DISTINCT FROM OLD.change_note
       OR NEW.version_no IS DISTINCT FROM OLD.version_no
       OR NEW.policy_id IS DISTINCT FROM OLD.policy_id
       OR NEW.author_id IS DISTINCT FROM OLD.author_id
       OR NEW.approver_id IS DISTINCT FROM OLD.approver_id
       OR NEW.published_at IS DISTINCT FROM OLD.published_at THEN
      RAISE EXCEPTION 'policy version % is published and cannot be edited', OLD.id
        USING ERRCODE = 'check_violation';
    END IF;
    IF OLD.status = 'published' AND NEW.status NOT IN ('published', 'superseded') THEN
      RAISE EXCEPTION 'a published policy version can only become superseded'
        USING ERRCODE = 'check_violation';
    END IF;
    IF OLD.status = 'superseded' AND NEW.status <> 'superseded' THEN
      RAISE EXCEPTION 'a superseded policy version is final'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS policy_versions_lock_published ON policy_versions;
--> statement-breakpoint
CREATE TRIGGER policy_versions_lock_published
  BEFORE UPDATE ON policy_versions
  FOR EACH ROW EXECUTE FUNCTION policy_versions_published_immutable();
--> statement-breakpoint
DROP TRIGGER IF EXISTS policy_versions_no_delete_published ON policy_versions;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION policy_versions_no_delete_published() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('published', 'superseded') THEN
    RAISE EXCEPTION 'policy version % is published and cannot be deleted', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER policy_versions_no_delete_published
  BEFORE DELETE ON policy_versions
  FOR EACH ROW EXECUTE FUNCTION policy_versions_no_delete_published();
--> statement-breakpoint

-- 3. Privileges for the runtime role. Least privilege: the API can read and write the
--    application tables, but can only INSERT into audit_events and can never touch the
--    migrations bookkeeping.
GRANT USAGE ON SCHEMA public TO secureshelf_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO secureshelf_app;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO secureshelf_app;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM secureshelf_app;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA drizzle FROM secureshelf_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE secureshelf_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO secureshelf_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE secureshelf_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO secureshelf_app;
