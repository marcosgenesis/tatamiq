# Auth foundation plan

**Status:** Completed

**Completed on:** 2026-05-21

**Implementation commits:**

- `0b0ac56 feat(auth): add instructor auth foundation`

## Goal

Add the first real authentication foundation for the instructor area using Better Auth, email/password sessions, and Better Auth Organization as the technical implementation of **Academia**.

This slice authenticates only the **Dono/Instrutor Solo**. **Acesso do Aluno** remains a later slice driven by **Convite do Aluno**.

## Decisions

- Public sign-up creates a **Dono/Instrutor Solo** account.
- Sign-up asks for name, email, and password.
- Sign-up auto-logs in and sends the user to academy onboarding.
- A newly signed-in user without an academy can only access onboarding and logout.
- Onboarding asks only for the academy name.
- Onboarding creates a Better Auth organization directly from the frontend using `authClient.organization.create`.
- The academy slug is generated in the frontend as `slugify(name) + short random suffix` and is not exposed as a user choice.
- After organization creation, the frontend explicitly calls `authClient.organization.setActive`.
- After onboarding, the user lands on `/`.
- Better Auth Organization is the technical source of truth for **Academia**.
- Better Auth organization member role `owner` represents the **Dono/Instrutor Solo**.
- Organization creation is limited to one organization per user in V0.
- Organization deletion is disabled in V0.
- Better Auth Admin plugin is deferred.
- **Aluno** will later be a Better Auth user linked through Tatamiq-owned StudentAccess, not an organization member.
- `organization.invitation` is not used for **Convite do Aluno**.
- `GET /me/context` is not included in this slice; the frontend uses Better Auth session and organization client APIs directly.
- Better Auth endpoints stay outside Tatamiq's OpenAPI contracts for now.
- Frontend keeps separate clients: `apiClient` for product API and `authClient` for Better Auth.
- Password policy follows Better Auth defaults in V0.
- Email confirmation does not block V0 usage.
- Password reset is included in this slice.
- Email delivery uses an adapter; dev mode logs the full reset URL.
- Auth UI uses a public premium dark layout separate from the instructor AppShell.
- Playwright remains in the repo, but auth flow validation will use `agent-browser`, not new E2E specs.

## Better Auth setup

Install and configure:

- `better-auth`
- `@better-auth/drizzle-adapter`
- `@thallesp/nestjs-better-auth`

Use the NestJS integration documented by Better Auth:

- create the Nest app with `bodyParser: false`;
- import `AuthModule.forRoot({ auth })`;
- use `@AllowAnonymous()` for public routes;
- use `@OrgRoles(["owner"])` for instructor operational routes.

Better Auth server plugins for this slice:

- core email/password auth;
- organization plugin;
- no admin plugin yet;
- no teams;
- no dynamic access control.

Organization plugin configuration:

- `organizationLimit: 1`;
- `creatorRole: "owner"` or default owner behavior;
- `disableOrganizationDeletion: true`;
- `trustedOrigins`/CORS aligned with the web app origin.

## Routes and guards

Public API routes:

- `GET /health`;
- Swagger/OpenAPI routes in development;
- Better Auth `/auth/*` routes.

Protected instructor/product routes:

- all future operational routes require authenticated session and organization owner role;
- backend derives tenant from `session.session.activeOrganizationId`;
- clients must not send `academyId` for operational filtering.

Remove:

- `GET /academies/demo`;
- all frontend dependency on `Academia Demo` or demo academy fallback.

## Frontend routes

Public auth routes:

- `/sign-in` — **Entrar no Tatamiq**;
- `/sign-up` — **Criar sua conta**;
- `/forgot-password` — **Recuperar senha**;
- `/reset-password` — **Definir nova senha**.

Onboarding route:

- `/onboarding/academy` — **Crie sua academia**;
- CTA: **Começar a organizar minha academia**.

Private instructor routes remain:

- `/`;
- `/students`;
- `/class-groups`;
- `/schedule`;
- `/attendances`;
- `/graduation`;
- `/monthly-fees`;
- `/settings`.

## Frontend auth behavior

- Use Better Auth React/client APIs for session and organization state.
- If unauthenticated user accesses private route, redirect to `/sign-in`.
- If authenticated user has no organization, redirect to `/onboarding/academy`.
- If authenticated user has exactly one organization but no active organization, set it active.
- If authenticated user with organization accesses auth pages, redirect to `/`.
- Show a loading guard while resolving session/organization to avoid dashboard flashes.
- AppShell shows the active academy name from Better Auth organization data.
- AppShell/sidebar/drawer includes a simple **Sair** action.

## Auth form UX

All auth forms should include essential states:

- required/email validation where appropriate;
- loading/disabled submit state;
- generic error state;
- success state for forgot password;
- links between sign-in, sign-up, and forgot password;
- redirect behavior for already-authenticated users.

Sign-up with an already-used email should show a generic message such as: “Não foi possível criar a conta. Tente entrar ou recuperar sua senha.”

## Development seed

Remove the public demo academy endpoint and seed semantics.

Create an explicit development seed for local/manual testing:

- email: `dev@tatamiq.local`;
- password: `tatamiq123`;
- academy: **Academia de Teste**.

This seed is development data, not a product feature or tenant default.

## Environment variables

API:

- `BETTER_AUTH_SECRET`;
- `BETTER_AUTH_URL`;
- `WEB_APP_URL`;
- `DATABASE_URL`.

Web:

- `VITE_API_URL`.

Use Better Auth cookie defaults where possible. Configure trusted origins/CORS for the web app origin. Do not force secure cookies in local HTTP development.

## Documentation updates

- Add ADR `0007-better-auth-organization-academy.md`.
- Update `docs/architecture/data-model-v0.md` so Better Auth User/Organization replace the old custom `User`/`Academy`/`InstructorProfile` auth model.
- Keep `CONTEXT.md` domain language as **Academia**, **Dono/Instrutor Solo**, **Aluno**, and **Acesso do Aluno**.

## Testing and validation

Automated checks:

- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm build`.

Browser validation with `agent-browser`:

- sign-up creates an account and redirects to academy onboarding;
- onboarding creates an academy and redirects to `/`;
- dashboard shows the active academy name;
- logout returns to `/sign-in`;
- sign-in with the seeded dev user works;
- forgot password logs a reset URL in dev mode;
- reset password page accepts the logged token link;
- private routes redirect unauthenticated users to `/sign-in`;
- authenticated users without academy are restricted to onboarding.

## Acceptance criteria

- [x] Better Auth is configured in the Nest API.
- [x] Better Auth Organization plugin represents **Academia** technically.
- [x] `@thallesp/nestjs-better-auth` protects Nest routes by default.
- [x] Public API routes are explicitly anonymous.
- [x] Instructor operational routes can use `@OrgRoles(["owner"])`.
- [x] Better Auth Drizzle schema/migration is in place.
- [x] Custom `academies` table and `/academies/demo` endpoint are removed.
- [x] Dev seed creates `dev@tatamiq.local` and **Academia de Teste**.
- [x] Web has `authClient` separate from product `apiClient`.
- [x] Public auth pages exist with essential states.
- [x] Academy onboarding creates and activates a Better Auth organization.
- [x] Private route guards handle unauthenticated and no-academy states.
- [x] AppShell shows active academy and provides **Sair**.
- [x] Password reset logs full reset URL in dev.
- [x] OpenAPI excludes Better Auth endpoints.
- [x] Data model docs are updated.
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.
- [x] `pnpm build` passes.
- [x] Auth flow is validated with `agent-browser`.

## Follow-up after auth foundation

Next likely slice: instructor-owned student CRUD using the active Better Auth organization as `academy_id`/tenant.
