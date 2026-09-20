# SecureShelf

Security policy and awareness system for Marvels (retail and wholesale). IE3072 Information Security Policy and Management, group assignment, SLIIT 2026.

SecureShelf gives the owner and staff one place to publish security policies, record acknowledgements, complete role-based training, keep an asset and control register, document CCTV governance, report incidents, and keep an append-only audit trail. It is a management aid, not a replacement for the billing or CCTV systems.

## Stack

| Layer | Choice |
|---|---|
| Web | React 19, Vite, TypeScript, Tailwind CSS v4, TanStack Query, react-hook-form + Zod |
| API | Node 22+, Express 5, TypeScript, Zod validation, Drizzle ORM |
| Data | PostgreSQL 16 (Docker), two roles: `secureshelf_migrator` (schema owner) and `secureshelf_app` (runtime, no UPDATE/DELETE on audit) |
| Security | Helmet, CORS allowlist, rate limiting, Argon2id, TOTP second factor, AES-256-GCM field encryption, httpOnly SameSite=Strict cookies, hash-chained audit log |

## Run it

```bash
cp .env.example .env         # then replace the three secrets (see comments in the file)
npm install
npm run db:up                # PostgreSQL in Docker
npm run db:migrate
npm run db:seed              # fictional demo data
npm run dev                  # web on http://localhost:5173, API on http://localhost:4000
```

Demo build (one origin, served by the API):

```bash
npm run build
NODE_ENV=production npm start   # http://localhost:4000
```

Checks: `npm run smoke` (native dependencies and database), `npm test` (API integration tests), `npm run typecheck`.

## Layout

```
apps/api          Express API (src/modules/* per feature, src/db for schema and migrations)
apps/web          React SPA
packages/shared   enums and Zod schemas used by both
docker/           PostgreSQL init SQL
docs/             architecture, security, backup/restore, demo script, AUP outline
llm-context/      assignment spec, proposal and lecture digest as text
```

Proposal: `../Project-Proposal-IE3072.docx` (text copy in `llm-context/proposal.md`).
