# SecureShelf (IE3072 group project)

Read first: `llm-context/proposal.md` (the contract the demo is marked against), `llm-context/spec.md` (marking scheme), `llm-context/module-notes.md` (what the module teaches). Do not re-read the docx/pptx originals.

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

Work on `rebuild/v2`. Commit after each phase of the plan with a Conventional Commits subject. Do not push unless the user says so.
