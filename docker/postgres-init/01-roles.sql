-- Runs once when the postgres volume is first created.
-- Two roles, as in the proposal's security model:
--   secureshelf_migrator  owns the schema and runs migrations (created by POSTGRES_USER)
--   secureshelf_app       what the API connects as; it never gets UPDATE/DELETE on audit_events
CREATE ROLE secureshelf_app LOGIN PASSWORD 'app_dev_password';

-- Test database, same ownership model
CREATE DATABASE secureshelf_test OWNER secureshelf_migrator;

GRANT CONNECT ON DATABASE secureshelf TO secureshelf_app;
GRANT CONNECT ON DATABASE secureshelf_test TO secureshelf_app;
