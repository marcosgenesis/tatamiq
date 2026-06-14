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

## V0 progress

> Updated as features are completed. See [`docs/product/v0-spec.md`](./docs/product/v0-spec.md) for full spec.

### Done

- [x] Monorepo scaffold (pnpm + Turborepo + Biome + Husky + CI)
- [x] Auth (sign-in, sign-up, forgot/reset password, Better Auth)
- [x] Onboarding (academy creation)
- [x] Students CRUD (create, list, detail, update, inactivate, reactivate)
- [x] Guardians (create/update with student)
- [x] Class Groups CRUD (create, list, detail, update, archive, reactivate)
- [x] Schedule (week view, today view, ad-hoc classes, recurring cancellations)
- [x] Classes (start recurring/ad-hoc, end class, active class view)
- [x] QR Attendance (rotating token 30s, student scan, manual entry, invalidate)
- [x] Student Access (invite link, accept, revoke, student portal shell)
- [x] Dark/light theme toggle

### To do

- [ ] **Graduação** — belt/degree system (adult + child), promotion history, eligibility (time + valid attendances), IBJJF-based editable rules
- [x] **Mensalidades** — monthly fee schema, auto-generation (5d before due), manual creation, adjustment w/ reason, waiver w/ reason, overdue status rotation
- [x] **Pix + verificação** — academy Pix config, student receipt upload (R2), instructor approval/rejection queue
- [x] **Academy settings** — edit name/logo/address/phone/Instagram, Pix config, logo upload (R2)
- [ ] **Dashboard instrutor** — payments in verification, overdue fees, eligible for promotion, pending/expired invites (today's classes already works)
- [ ] **Anotações aluno** — free-text notes on student profile, public/private visibility, archive
- [x] **Import/export CSV** — student import, student/attendance/fee export
- [x] **Portal aluno** — next 7d schedule, attendance history 12m, fee history 12m, graduation view, send receipt, edit contact/photo
- [x] **Indicadores internos** — receipt approved/rejected, fee open/overdue, new note, new promotion, cancelled class
- [ ] **Filtros obrigatórios** — students by class group/belt, attendances by period/class/student, fees by status/due date/student

## Development workflow

Use Conventional Commits for all commits.

```txt
feat: add student enrollment flow
fix: prevent duplicate monthly fees
docs: add V0 data model diagrams
chore: configure monorepo tooling
refactor: extract attendance validation service
test: add QR attendance e2e coverage
```
