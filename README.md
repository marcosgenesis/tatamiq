# Tatamiq

Tatamiq is a V0-stage product for managing Brazilian Jiu-Jitsu students in small academies operated by a solo owner/instructor.

The goal of the V0 is to let a pilot academy operate for one week without spreadsheets for the core workflows: students, class groups, attendance, graduation tracking, and monthly fees.

## Product scope

Tatamiq V0 includes:

- student and guardian management;
- class groups and weekly agenda;
- ad hoc classes and class cancellations;
- QR-based attendance with manual correction;
- BJJ belt/degree history and graduation eligibility;
- monthly fees with Pix receipt verification;
- student access by invite;
- CSV import/export;
- basic internal indicators for instructors and students.

Out of scope for V0:

- native mobile apps;
- offline mode;
- geolocation-based attendance;
- integrated payments or bank reconciliation;
- multi-unit/franchise management;
- multi-instructor permissions;
- responsible/guardian portal;
- public academy page;
- technical curriculum/checklists;
- charts and analytics dashboards.

## Technical stack

The planned V0 stack is:

- **Monorepo:** pnpm workspaces + Turborepo
- **Frontend:** Vite + React + TypeScript
- **Frontend hosting:** Cloudflare Pages
- **Backend:** NestJS + TypeScript REST API
- **Backend hosting:** Fly.io
- **Database:** Neon Postgres
- **Database toolkit:** Drizzle
- **Auth:** Better Auth with httpOnly cookie sessions
- **Storage:** Cloudflare R2
- **API contract:** OpenAPI generated from Zod contracts
- **Frontend API client:** `openapi-typescript` + `openapi-fetch`
- **UI:** ReUI, shadcn/ui fallback, Tailwind, Huge Icons
- **Testing:** Vitest, Testing Library, Playwright
- **Quality:** Biome, Husky, lint-staged, GitHub Actions
- **Analytics/logs:** PostHog basic events + Pino JSON logs

See [`docs/architecture/technical-stack-v0.md`](./docs/architecture/technical-stack-v0.md) for details.

## Documentation

Important project documents:

- [`CONTEXT.md`](./CONTEXT.md) — domain language and relationships
- [`docs/product/v0-spec.md`](./docs/product/v0-spec.md) — consolidated V0 product specification
- [`docs/product/v0-backlog.md`](./docs/product/v0-backlog.md) — implementation backlog and milestones
- [`docs/architecture/data-model-v0.md`](./docs/architecture/data-model-v0.md) — proposed data model
- [`docs/architecture/diagrams-v0.md`](./docs/architecture/diagrams-v0.md) — Mermaid ER and sequence diagrams
- [`docs/architecture/technical-stack-v0.md`](./docs/architecture/technical-stack-v0.md) — technical stack decisions
- [`docs/adr/`](./docs/adr) — architecture decision records

## Architecture decisions

Current ADRs:

- [`0001-pwa-online-first.md`](./docs/adr/0001-pwa-online-first.md)
- [`0002-manual-pix-verification.md`](./docs/adr/0002-manual-pix-verification.md)
- [`0003-rotating-qr-attendance.md`](./docs/adr/0003-rotating-qr-attendance.md)
- [`0004-single-academy-solo-instructor-v0.md`](./docs/adr/0004-single-academy-solo-instructor-v0.md)
- [`0005-academy-tenant-isolation.md`](./docs/adr/0005-academy-tenant-isolation.md)
- [`0006-v0-technical-stack.md`](./docs/adr/0006-v0-technical-stack.md)

## Repository status

This repository currently contains product and architecture documentation. The application code has not been scaffolded yet.

Expected future layout:

```txt
apps/
  web/              # Vite + React PWA
  api/              # NestJS REST API
packages/
  database/         # Drizzle schema, migrations, seed scripts
  contracts/        # Zod schemas shared by API and web
  config/           # shared config
  types/            # shared TypeScript-only types, if needed
docs/
```

## Development workflow

Use Conventional Commits for all commits.

Examples:

```txt
feat: add student enrollment flow
fix: prevent duplicate monthly fees
docs: add V0 data model diagrams
chore: configure monorepo tooling
refactor: extract attendance validation service
test: add QR attendance e2e coverage
```

## Next steps

Recommended implementation order:

1. scaffold the pnpm + Turborepo monorepo;
2. create `apps/web`, `apps/api`, `packages/database`, and `packages/contracts`;
3. configure Biome, TypeScript, CI, Husky, and lint-staged;
4. configure Drizzle with Neon Postgres;
5. implement Better Auth with cookie sessions;
6. build the first vertical slice: academy, instructor, students, and class groups;
7. continue with class sessions, QR attendance, monthly fees, and graduation.
