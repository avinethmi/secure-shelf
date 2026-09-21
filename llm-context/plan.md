# SecureShelf build plan and progress

This file is the single source of truth for progress. Phases are ticked only after their commit exists on `main`, with the date, commit sha and test count on the same line. Read `CLAUDE.md` for how "show plan" and "start working" use this file. Assumptions A1 to A7 below were approved by the project lead and stand unless the proposal contradicts them.


## Context

- Assignment IE3072 Part 2: on-campus demo (65 marks) in **5 days**, AUP Word doc (15 marks) due the day before. Completeness is marked *against the submitted proposal* (`Project-Proposal-IE3072.docx`), so the proposal is the contract.
- The current repo (`avinethmi/secure-shelf`) is a client-side mock covering ~15% of the proposal (3 roles, in-memory data, plaintext passwords, no versioning/training/assets/audit). It is discarded; nothing is reused.
- Decisions taken with the user: TypeScript; rebuilt from scratch on branch `rebuild/v2` (since 2026-09-21 the work continues on `main`), old folders deleted; user + Claude write all code, teammates own AUP, content, slides and demo script.
- Rule for this plan: **no decision may contradict the proposal without asking first.** Everything below either implements the proposal literally or is flagged under "Assumptions to confirm".

## Ground rules for the 5 days

1. Work in proposal stage order (1 → 6). Each phase ends with the app runnable and a commit.
2. Nothing is scoped out by me. If the Day-3 checkpoint shows something will not land, **you** decide what to cut and the demo states it honestly as "not in first release".
3. Risky dependencies (Postgres, Argon2 native build, TOTP, PDF, uploads) are proven on Day 0 before any feature work.
4. Demo data is fictional only (proposal §7). No real Marvels names, NICs, phones, footage.

## Assumptions to confirm (proposal is silent or ambiguous)

| # | Assumption | Basis |
|---|---|---|
| A1 | Account admin (create, suspend, offboard, unlock, reset 2FA) = Owner + Security Admin | Matrix §5.1 has no row for it; Accounts module says "deny by default" |
| A2 | Publish of an *approved* version = Owner or Security Admin; approve = Owner only; write = Security Admin only | Lifecycle diagram: SA drafts, Owner reviews/approves; publisher unspecified |
| A3 | Lockout after 5 failures stays until Owner/SA unlocks (no auto-expiry) | FR-02, FR-05; matches "Contact Security Admin" wording in current app |
| A4 | Incident status management = Owner + Security Admin; Manager can only report | Matrix §5.1 gives Manager no manage rights |
| A5 | Login error text is identical for unknown email and wrong password; a *locked* account gets a distinct "locked" message | FR-02 only requires the first two to match |
| A6 | Manager sees training summaries for all staff (no team structure in proposal) | §5 "authorised roles see team summaries" |
| A7 | Local demo runs over plain HTTP on the laptop; TLS/secure-cookie flags switch on via `NODE_ENV=production` | Proposal §3.4 last paragraph scopes TLS to "beyond the local demonstration environment" |

## Architecture (proposal §4, implemented literally)

```
apps/web   React 18 + Vite + TypeScript, React Router, TanStack Query, react-hook-form + zod, Tailwind v4,
           motion (framer-motion), clsx + tailwind-merge (cn helper), @tabler/icons-react  [Aceternity UI stack]
apps/api   Node 24 + Express 4 + TypeScript (tsx), Zod, Drizzle ORM on node-postgres, Helmet, cors allowlist,
           express-rate-limit, argon2, jsonwebtoken, otplib + qrcode, node:crypto AES-256-GCM, multer + file-type, pdfkit
packages/shared   enums + zod schemas shared by web and api (npm workspaces)
PostgreSQL 16 in docker-compose (fallback: native install); two DB roles: migrator (owner) and app (no UPDATE/DELETE on audit)
apps/api/storage/  evidence files, gitignored, outside any static dir, served only through an authorised download route
```

Request pipeline (Figure 1): `authenticate (access cookie + live session check) → requirePermission → validate(zod) → service (in one DB transaction) → audit entry (same transaction)`.

Tokens: access JWT 15 min and refresh JWT 7 days, both httpOnly cookies (`SameSite=Strict`); refresh rotates on use and is stored hashed in `sessions`; offboard/suspend deletes sessions so revocation is immediate (NFR-02, FR-05). Origin header check on all state-changing requests as CSRF backstop.

Dev: Vite on 5173 proxies `/api` to 4000. Demo: `vite build` output served by the API on one origin (simplest cookie story, no CORS in play).

### Repo layout

```
secure-shelf/
  package.json            workspaces + root scripts (dev, build, test, lint, db:*)
  docker-compose.yml      postgres 16 + init SQL creating migrator/app roles
  .env.example            DATABASE_URL, MIGRATOR_DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
                          FIELD_ENCRYPTION_KEY (32-byte base64), CORS_ORIGINS, PORT, STORAGE_DIR
  apps/api/src/
    app.ts server.ts config/env.ts (zod-validated env)
    db/client.ts db/schema/*.ts db/migrations/*.sql db/seed.ts
    lib/crypto.ts (argon2id m=19456 t=2 p=1, aes-gcm encrypt/decrypt, sha256)   lib/audit.ts   lib/tx.ts
    lib/permissions.ts (ROLE_PERMISSIONS map = proposal §5.1)   lib/errors.ts
    middleware/auth.ts validate.ts rateLimit.ts originCheck.ts errorHandler.ts
    modules/{auth,users,policies,training,compliance,cctv,incidents,audit,dashboard}/{routes.ts,service.ts,schemas.ts}
  apps/api/test/          vitest + supertest against secureshelf_test DB
  apps/web/src/
    main.tsx app/router.tsx app/guards.tsx api/client.ts
    components/ui/ (Button, Input, Select, Textarea, Dialog, Table, Badge, Tabs, Toast, EmptyState) all keyboard/label/focus compliant
    features/{auth,dashboard,users,policies,training,compliance,cctv,incidents,audit}/
    layouts/AppShell.tsx (sidebar on desktop, bottom nav at <768px, tested at 375px)
  packages/shared/src/    enums.ts, schemas/*.ts
  scripts/backup.ps1 scripts/restore.ps1
  docs/ARCHITECTURE.md SECURITY.md BACKUP-RESTORE.md DEMO-SCRIPT.md AUP-OUTLINE.md
  llm-context/spec.md llm-context/proposal.md   (text versions of the two docx files, for future sessions)
```

## Data model (Drizzle schema + SQL migrations)

| Table | Key columns | Notes |
|---|---|---|
| users | id, email uniq, password_hash, role (enum: owner, security_admin, manager, cashier, stock_staff), status (active, suspended, offboarded), full_name, nic_enc, phone_enc, contact_enc, failed_attempts, locked_at, totp_secret_enc, totp_enabled, created_at | NFR-05 fields AES-256-GCM as `iv.tag.ct` base64; one role per user (FR-04) |
| sessions | id, user_id, refresh_hash, ip, user_agent, expires_at, revoked_at | FR-05 revocation, NFR-02 |
| policies | id, code (POL-001), title, type (overall, issue_specific, system_specific), classification (public, internal, confidential, restricted), created_by | FR-06 |
| policy_versions | id, policy_id, version_no, content (markdown), status (draft, review, approved, published, superseded), author_id, approver_id, review_note, approved_at, published_at, uniq(policy_id, version_no) | FR-07/08; trigger: published rows cannot change content/title; app rejects author = approver |
| policy_version_roles | version_id, role | FR-09 assignment |
| policy_acknowledgements | id, user_id, version_id, acknowledged_at, uniq(user_id, version_id) | FR-09 |
| courses | id, code, title, topic, description, pass_mark (%), max_attempts, due_days | FR-10 |
| lessons | id, course_id, order_no, title, content | |
| quiz_questions | id, course_id, lesson_id, prompt, options jsonb (4), correct_index, explanation | pool of 8 to 10 per course; explanation teaches the right answer |
| course_roles | course_id, role | required training per role (§5.2) |
| quiz_attempts | id, user_id, course_id, question_ids int[] (the 5 drawn, server-side), option_orders jsonb, answers jsonb, score, passed, started_at, submitted_at | attempt limit enforced in service; graded against the stored draw |
| course_progress | user_id, course_id, status (assigned, in_progress, passed, failed, overdue computed), lessons_done int[], due_at, completed_at | FR-11 |
| assets | id, name, category, owner_id, classification, data_types text[], location, notes | FR-12 |
| controls | id, code, source (ISO27001, NIST_CSF, PCI_DSS, PDPA), title, description | seeded from proposal §6 |
| control_assessments | id, control_id, asset_id?, status (not_started, in_progress, implemented, not_applicable, gap), owner_id, target_date, notes, updated_at | FR-13 |
| evidence_files | id, assessment_id, original_name, stored_name (uuid), mime, size, sha256, uploaded_by, uploaded_at | type+size checked, stored outside web root |
| cameras | id, code, location, purpose, retention_days, signage_present, active | FR-15 |
| camera_authorisations | id, camera_id, user_id, granted_by, granted_at, expires_at?, revoked_at? | FR-15 |
| cctv_access_declarations | id, camera_id, user_id, kind (viewing, export), reason, occurred_at, declared_at | FR-16, UI labels it "manual governance record" |
| monitoring_notices | id, version_no, content, published_at | FR-17 |
| monitoring_notice_acks | user_id, notice_id, acknowledged_at | FR-17 |
| incidents | id, ref (INC-0001), reported_by, category, severity, description, status (new, triaged, in_progress, resolved, closed), assigned_to?, created_at | FR-18 |
| incident_status_history | id, incident_id, from_status, to_status, changed_by, note, changed_at | |
| audit_events | id bigserial, at, actor_id?, actor_role?, action, entity, entity_id, details jsonb, ip, prev_hash, hash | FR-19, §5.3: hash = sha256(prev_hash + canonical JSON); inserts serialised with `pg_advisory_xact_lock`; `BEFORE UPDATE OR DELETE` trigger raises; app role has no UPDATE/DELETE grant |

Every mutating service call runs in `withTx` and writes its audit row in the same transaction (NFR-10).

## API surface

| Module | Endpoints (all under /api) | Permission |
|---|---|---|
| auth | POST login (rate-limited 10/min/IP), POST totp/verify, POST totp/enrol + totp/confirm, POST refresh, POST logout, GET me | public / pre-auth token |
| users | GET, POST, PATCH :id/status (suspend, offboard, reactivate), POST :id/unlock, POST :id/reset-2fa, GET lockouts | users.manage (A1) |
| policies | GET, POST; POST :id/versions; PATCH versions/:vid (draft only); POST versions/:vid/submit, /request-changes, /approve, /publish (roles[]); GET assigned (for me); POST versions/:vid/acknowledge; GET :id/acknowledgements | policy.write / policy.approve / policy.publish / policy.read |
| training | GET courses, POST courses (+lessons, questions); PUT courses/:id/roles; GET my; POST courses/:id/lessons/:lid/complete; POST courses/:id/attempt; GET summary (per role, gaps) | training.assign / training.view_team / training.take |
| compliance | assets CRUD; GET controls; assessments CRUD; POST assessments/:id/evidence (multipart); GET evidence/:id (stream, authorised); GET report.pdf | control.assess / asset.manage |
| cctv | cameras CRUD; authorisations POST/revoke; declarations POST (only if caller holds a live authorisation or is Owner/SA); GET declarations; GET notice/current; POST notice (new version); POST notice/acknowledge | cctv.manage / any (declare, ack) |
| incidents | POST (any user), GET (manage), PATCH :id/status (+note), GET :id/history | incident.report / incident.manage |
| audit | GET (filters: actor, action, entity, date), GET verify (walks chain, returns ok/firstBrokenId) | audit.read |
| dashboard | GET (role-shaped summary) | any |

`ROLE_PERMISSIONS` in `lib/permissions.ts` is the §5.1 matrix verbatim plus A1/A2/A4; `requirePermission` denies by default.

## Frontend screens (proposal §5 table)

- Auth: Login, TOTP code, TOTP enrolment (QR), first-login gates: monitoring notice → pending policy acknowledgements.
- Dashboard per role (FR-20): staff = my policies / my training / report incident; Manager adds team training; Owner adds approval queue + overdue actions + incident summary; Security Admin adds drafts, lockouts, control gaps, audit integrity status.
- Accounts: user list, create/edit, status actions, lockout table with unlock.
- Policies: list, editor (markdown), review queue, reader with "I have read" + Acknowledge (2 actions, NFR-08), acknowledgement status per version.
- Training: assigned learning, lesson reader, quiz with attempt counter, team progress + gap view.
- Compliance: assets, control assessments with evidence upload, gap report download.
- CCTV: camera register, authorisations, access declaration form (labelled manual record), staff notice.
- Incidents: report form, queue, status history.
- Audit: filtered event list, "Verify chain" button showing result.
- Layout usable at 375px; all controls labelled, focus-visible, contrast checked (NFR-09).

## Visual design: Aceternity UI aesthetic, Docker Desktop structure (user decision)

No DESIGN.md exists for either in the design-md library (checked: 74 specs, none match), so Phase 3 writes `docs/DESIGN.md` in that format with these tokens and rules. Dark theme only for the first release (Aceternity is dark-first; Docker Desktop defaults to dark). Light theme is a later addition.

Tokens (Aceternity look): background `#0a0a0a` / `neutral-950` with a faint grid or dot pattern; surfaces `neutral-900` with `border-white/10`; text `neutral-100` primary, `neutral-400` secondary; accent gradient sky-400 → cyan-400 → violet-500 used for headings, active nav and primary buttons; glow = blurred accent behind hovered cards; radius 12 to 16px; Inter (Google Fonts); motion 150 to 300ms, spring for hover.

Structure (Docker Desktop): left sidebar (icon + label, grouped by module, collapsible; on <768px becomes a drawer), top bar (page title, search, user chip with role), content = dense list/table views with status chips (Published/Draft/Review, severity, Passed/Overdue, Running-style dots), detail panels on the right or as a page, "Learning center"-style cards for training.

Aceternity components used (copied into `components/aceternity/`, not an npm dependency):

| Screen | Components |
|---|---|
| Login, TOTP | Spotlight + Grid background, Text Generate Effect tagline, gradient-focus inputs (Signup Form style), Moving Border on the primary button |
| App shell | Sidebar (animated expand, mobile drawer), Tabs (animated) for in-page sections |
| Dashboards | Bento Grid, Glowing Effect / Card Spotlight for KPI tiles |
| Policies | Tracing Beam beside the policy reader, sticky acknowledge bar |
| Training | Card Hover Effect for course cards, Animated Modal for quiz results, Timeline for attempt history |
| Compliance | File Upload for evidence |
| Everywhere | Tooltip Card, custom Table / Badge / Toast (Aceternity has no table; built Docker-style) |

Rules that keep the proposal's NFRs on a dark, animated UI:
- NFR-09: text contrast ≥ 4.5:1 (no `neutral-500` body text on `neutral-950`), visible focus ring `ring-2 ring-sky-400` on every control, labels on every input; all Aceternity motion wrapped in a `useReducedMotion` guard so `prefers-reduced-motion` disables beams, spotlight and text effects.
- NFR-12: background effects lazy-loaded and CSS/canvas only; no 3D globe, vortex or WebGL components.
- FR-20 (375px): sidebar → drawer, bento → single column, tables → card rows below 640px; verified by Playwright screenshots every phase.

## Traceability

| Requirement | Phase |
|---|---|
| FR-01..05, NFR-01..04, NFR-06 | 1 |
| FR-19, NFR-10 (audit + transactions) | 1 |
| FR-06..09, NFR-08 | 2 |
| FR-03 (TOTP) | 2 |
| FR-20, NFR-09, NFR-12 | 3 (shell) then every phase |
| FR-10, FR-11, §5.2 topics | 4 |
| FR-18 | 4 |
| FR-15..17 | 4 |
| FR-12..14, NFR-05 | 5 |
| NFR-07 | by construction; stated in SECURITY.md and AUP |
| NFR-11, docs, tests, AUP, demo | 6 |

## Phases (each = runnable app + commit on `main`)

### Day 0 (today)

- [x] **Phase 0: branch, wipe, scaffold, prove risky deps** (done 2026-09-21, commit 7e4f5f0; deps bumped to Express 5 / Zod 4 / React 19 / Vite 8 / Drizzle 0.45 / otplib 13 functional API; audit 0 high)
  - `git checkout -b rebuild/v2`; delete `secureshelf-frontend/`, `secureshelf-backend/`, `.vscode/`; new README stub.
  - Root workspaces, `docker-compose.yml` (postgres:16, init SQL for `secureshelf_migrator` and `secureshelf_app` roles, db `secureshelf`, `secureshelf_test`), `.env.example`, `.gitignore` (node_modules, .env, apps/api/storage, dist).
  - `apps/api`: tsx dev script, Express + Helmet + cors allowlist + json limit 10kb, `config/env.ts`, health route. `apps/web`: Vite React TS, Tailwind v4, router, proxy. `packages/shared` wired into both.
  - Smoke script proving on this Windows box: argon2 hash/verify, otplib generate/check, qrcode data URL, pdfkit writes a PDF, multer + file-type accepts png rejects exe, Docker Postgres reachable.
  - `llm-context/spec.md` + `proposal.md` copied in; `llm-context/module-notes.md` written from Appendix A below (lecture digest) so no session re-reads the pptx files.
  - Verification: `npm run dev` serves web + api; `curl /api/health` 200; smoke script prints all OK.

- [x] **Phase 1: database, auth, RBAC, audit chain (proposal stage 1)** (done 2026-09-21, commit 11f5e18; 17/17 API tests; web login/TOTP/shell/Accounts verified headless at 375px and 1200px; found+fixed: JWTs signed in the same second were identical, added jti)
  - Drizzle schema for all tables above; `drizzle-kit generate`; hand-add SQL: audit trigger, policy_versions immutability trigger, grants (`REVOKE UPDATE, DELETE ON audit_events FROM secureshelf_app`).
  - `lib/crypto.ts`, `lib/audit.ts` (advisory lock + chain), `lib/tx.ts`, `lib/permissions.ts`.
  - auth: login (argon2 verify, same error for unknown/wrong, failed_attempts, lock at 5, rate limit 10/min/IP), refresh rotation, logout, `me`; middleware `authenticate` checks session row alive.
  - users: list/create/status/unlock/reset-2fa; offboard deletes sessions.
  - Seed: 7 fictional users (owner, security admin, manager, 2 cashiers, 2 stock staff), password policy documented.
  - Web: login page, auth context, route guards by permission, AppShell with role-aware nav, empty dashboard.
  - Tests (vitest+supertest): lockout after 5, identical error text, rate limit 429 on 11th, cashier gets 403 on `/api/users`, audit verify ok, raw `UPDATE audit_events` as app role rejected.
  - Verification: owner and cashier logins show different nav (stage 1 acceptance evidence).

### Day 1

- [x] **Phase 2: policy lifecycle + acknowledgement + TOTP (proposal stage 2)** (done 2026-09-21, commit c06845b; 21/21 API tests; SA draft -> Owner approve -> publish -> cashier acknowledge verified headless in Chrome at 1200px and 375px, 25/25 flow checks; TOTP was already done in Phase 1; markdown rendered by a small in-house renderer, no new dependency)
  - policies service with state machine draft → review → approved → published; request-changes returns to draft; approve rejects `approver == author`; publish requires roles, marks previous published version `superseded`; DB trigger blocks edits to published content.
  - Acknowledgements; `GET /policies/assigned` returns pending + done for the caller's role.
  - TOTP: enrolment forced at first login for Owner/SA (pre-auth token → QR → confirm), verify step on login, secret AES-GCM at rest, reset by users.manage.
  - Web: policy list/editor/review queue/reader (read → tick → Acknowledge), acknowledgement status; first-login gate showing pending policies; TOTP screens.
  - Seed: 4 policies (Acceptable Use, Password & Account, CCTV & Monitoring, Customer Data Handling) with versions in draft/review/published states and some acknowledgements.
  - Tests: author cannot approve own version (403), edit published version rejected at DB, acknowledge is idempotent.
  - Verification: SA drafts → Owner approves → publish to Cashier → cashier logs in, acknowledges in ≤3 actions (stage 2 evidence).

- [ ] **Phase 3: role dashboards + responsive shell + design pass**
  - `GET /dashboard` per-role summary; dashboard cards per role as listed above.
  - Write `docs/DESIGN.md` (Aceternity aesthetic, Docker Desktop structure, see Visual design section); tokens into Tailwind theme; copy the listed Aceternity components into `components/aceternity/` with the reduced-motion guard; Docker-style Table/Badge/Toast; sidebar drawer at <768px; check every screen so far at 375px (Playwright viewport screenshot).
  - Verification: dashboard loads <2s locally; 375px screenshots show no horizontal overflow.

### Day 2

- [ ] **Phase 4: training, incidents, CCTV governance (proposal stages 3 and 5)**
  - training: courses/lessons/questions CRUD (Owner/SA/Manager assign via course_roles), lesson completion (quiz unlocks only after all lessons done), progress statuses incl. overdue, summary + gaps (required topics per role vs passed).
  - quiz mechanics (agreed with user): pool of 8 to 10 questions per course, 5 drawn at random per attempt with shuffled question and option order, draw stored server-side and graded server-side; seed defaults pass mark 80%, 3 attempts; results screen = score band message (perfect / passed / not passed with attempts left / attempts exhausted), per-question review with explanation and "read again" link to the lesson; on a fail the correct option is hidden (explanation only), on a pass the full key is shown; attempt history kept per person; Owner/SA/Manager can reset a person's attempts (audited); exhausted attempts count as a training gap.
  - content template for teammate B: `docs/content/course-template.json` (prompt, 4 options, correct, explanation, lesson).
  - incidents: report (any role), queue, status transitions with history and audit.
  - cctv: cameras, authorisations, declarations (authorisation check), monitoring notice versioning + acknowledgement gate at login.
  - Web screens for all three.
  - Seed: courses per §5.2 (cashier: customer data, payment safety, passwords, incident reporting; stock: devices, supplier info, physical security; owner/SA: policy approval, privacy, CCTV governance, incident management), 4 cameras + authorisations, 1 notice, 3 incidents.
  - Tests: attempt limit enforced, declaration without authorisation 403, incident status history written.
  - Verification: cashier completes a course and manager summary updates (stage 3); declaration + incident appear in audit (stage 5).

### Day 3

- [ ] **Phase 5: compliance register, evidence, PDF report, encrypted fields (proposal stage 4)**
  - assets, controls (seed ~12 from ISO 27001 A.5/A.6/A.7/A.8, NIST CSF GV/ID/PR/RS, PCI selected, PDPA), assessments, evidence upload (multer memory → file-type magic check → allow pdf/png/jpg ≤5 MB → write uuid name under `STORAGE_DIR` → sha256), authorised streaming download.
  - `GET /compliance/report.pdf` (pdfkit): open gaps, overdue assessments, overdue training, unacknowledged published policies, generated-at, generated-by.
  - NIC/phone/contact encryption on users (create/edit form, masked display, decrypt only for users.manage).
  - Web: assets, assessments, evidence, report button. Audit viewer + Verify button.
  - Verification: an open gap appears in the generated PDF (stage 4 evidence); tampering the DB as migrator role makes Verify report the broken id.
  - **Day-3 checkpoint:** list anything not landed; you decide cuts.

### Day 4 (AUP due today)

- [ ] **Phase 6: hardening, tests, backup/restore, docs, AUP support, demo prep (proposal stage 6)**
  - `npm audit` clean of high/critical (NFR-06); Zod on every route confirmed by grep; error handler never leaks stack traces; security headers verified with curl.
  - `scripts/backup.ps1` (pg_dump custom format) and `scripts/restore.ps1` (drop + pg_restore); `docs/BACKUP-RESTORE.md`; perform and record one restore (NFR-11).
  - Playwright: login → notice → acknowledge policy flow; cashier blocked from `/users`; 375px screenshots for the report.
  - `docs/ARCHITECTURE.md`, `docs/SECURITY.md` (maps NFR-01..12 to code paths), `docs/DEMO-SCRIPT.md` (per-module presenter, exact clicks, seeded accounts), `docs/AUP-OUTLINE.md` (feature list + enforcement measures the app actually provides, for the teammates writing the Word doc; review their draft against the rubric's three criteria).
  - Demo laptop checklist: Docker Desktop autostart, `.env` present, `npm run build && npm start`, authenticator app enrolled for the Owner/SA presenter, seed reset command.
  - Full rehearsal following DEMO-SCRIPT.md.

### Day 5: demo.

## Team split (rubric: teamwork 10, training needs 5, ethical data 5)

- You + Claude: all code, seed data structure, docs above.
- Teammate A: AUP Word document from `docs/AUP-OUTLINE.md` (due Day 4), reviewed against the app.
- Teammate B: policy texts and lesson/quiz content (delivered as markdown/JSON files by Day 2 so seed can import them).
- Teammate C: slides + demo script rehearsal lead; each member presents one module.

## Risks and fallbacks

| Risk | Fallback |
|---|---|
| `argon2` native module fails on Windows | `@node-rs/argon2` (same Argon2id params) |
| Docker unavailable on demo laptop | native PostgreSQL 16 installer; same migrations |
| TOTP phone problems during demo | Owner/SA can reset another user's 2FA; keep a second enrolled device |
| Time: Phase 5 slips | Day-3 checkpoint; PDF and evidence upload are the last-built items so cutting them touches nothing else |
| OneDrive sync of node_modules slows installs | exclude `node_modules` via OneDrive settings, or run from a junction outside OneDrive; state before Phase 0 |

## Verification (end to end)

1. `docker compose up -d` → `npm run db:migrate && npm run db:seed` → `npm run dev`.
2. `npm test` (api integration suite) passes; `npm run e2e` (Playwright) passes.
3. Walk `docs/DEMO-SCRIPT.md` on a clean seed: every proposal stage's acceptance evidence (§7 table) is observed.
4. `npm run build && npm start` serves the SPA from the API on one port; repeat step 3 there (the demo configuration).
5. Restore drill: backup, drop DB, restore, log in.

