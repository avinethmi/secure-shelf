# SecureShelf (IE3072 group project)

Read first: `llm-context/plan.md` (phase plan, progress, assumptions A1 to A7), `llm-context/proposal.md` (the contract the demo is marked against), `llm-context/spec.md` (marking scheme), `llm-context/module-notes.md` (what the module teaches). Do not re-read the docx/pptx originals.

## Non-negotiables

- The proposal is the contract. Do not change a requirement, role, workflow, or technology it names without asking the user first. Assumptions where it is silent are listed in the approved plan (A1 to A7).
- Product name is SecureShelf (user decision, matches the proposal).
- Demo data is fictional only. Never seed real names, NICs, phone numbers, or CCTV details.
- Credentials never enter source control. `.env` is ignored; `.env.example` has placeholders only.
- No em dashes anywhere (UI copy, code, comments, docs).

## How the code is organised

- `apps/api/src/modules/<feature>/{routes,service,schemas}.ts`. Routes only parse and respond; services hold rules and run inside `withTx` with an audit entry in the same transaction.
- Every mutating route: `authenticate` -> `requirePermission('<code>')` -> `validate(schema)` -> service.
- Permissions are the proposal §5.1 matrix in `apps/api/src/lib/permissions.ts`. Deny by default.
- Shared enums and Zod schemas live in `packages/shared`; import them, do not duplicate.
- Web: `apps/web/src/features/<feature>/` pages and hooks; `components/ui` for our accessible primitives; `components/aceternity` for copied Aceternity components (each wrapped so `prefers-reduced-motion` disables motion).
- Dark theme only. Every screen must work at 375px wide, with labelled inputs and a visible focus ring.

## Commands

`npm run dev`, `npm run smoke`, `npm test`, `npm run typecheck`, `npm run db:migrate`, `npm run db:seed`, `npm run db:reset`.

## Git

Work on `main`. Commit after each phase of the plan with a Conventional Commits subject. Do not push unless the user says so.

## Team commands

Both need a working setup first: `.env` copied from `.env.example` with the three secrets filled in, Docker running, `npm install`, `npm run db:migrate`, `npm run db:seed` (see README "Run it").

- **show plan**: read `llm-context/plan.md` and print a table of phases 0 to 6 with status (done, next, pending), the commit sha and date taken from the ticked lines, then list the bullets of the next unchecked phase. Read only, change nothing.
- **start working**: run `npm run smoke` and `npm test` first and record the baseline. Implement the first unchecked phase in `llm-context/plan.md` following its bullets and every rule in this file. `npm run typecheck` and `npm test` must pass before committing. Commit with a Conventional Commits subject, and in the same commit tick the phase in `plan.md` with the date, sha and test count. Then stop and report what changed. Never skip ahead to a later phase, never push.
