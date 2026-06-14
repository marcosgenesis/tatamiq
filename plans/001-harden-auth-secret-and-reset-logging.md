# Plan 001: Harden auth secret configuration and password reset logging

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat b113c3a..HEAD -- apps/api/src/auth.ts apps/api/src/students/email.service.ts apps/api/src/auth*.spec.ts apps/api/src/students/*.spec.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `b113c3a`, 2026-06-13

## Why this matters

Tatamiq uses Better Auth with httpOnly cookie sessions. If the API starts without `BETTER_AUTH_SECRET` outside local development, it currently falls back to a known hardcoded string. Password reset links are also logged in full; those URLs are bearer secrets and can be used by anyone with log access. This plan makes unsafe production configuration fail fast and removes secret URLs from normal logs while preserving developer ergonomics.

## Current state

Relevant files:

- `apps/api/src/auth.ts` — Better Auth configuration and password reset callback.
- `apps/api/src/students/email.service.ts` — existing pattern for development-only email fallback logging.
- `apps/api/src/students/email.service.spec.ts` — existing Vitest style for environment-variable-dependent behavior.

Current excerpts:

```ts
// apps/api/src/auth.ts:20-27
export const auth = betterAuth({
  appName: "Tatamiq",
  baseURL: apiUrl,
  basePath: "/auth",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "dev-only-tatamiq-better-auth-secret-change-me-minimum-32-chars",
  trustedOrigins: [webUrl],
```

```ts
// apps/api/src/auth.ts:32-40
emailAndPassword: {
  enabled: true,
  sendResetPassword: async ({ user, url }) => {
    console.log({
      event: "password_reset_link_created",
      email: user.email,
      url,
    });
  },
},
```

```ts
// apps/api/src/students/email.service.ts:16-21
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.log({ event: "email_dev_fallback", ...emailPayload });
  return;
}
```

Repo conventions to match:

- TypeScript, no semicolons, double quotes, Biome formatting.
- Tests use Vitest (`describe`, `it`, `expect`, `beforeEach`, `afterEach`, `vi`) and restore `process.env` manually in env-sensitive specs; see `apps/api/src/students/email.service.spec.ts`.
- Commit messages use Conventional Commits, e.g. `fix: derive mensalidade payment origin`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Focused tests | `pnpm --filter @tatamiq/api test -- auth` | exit 0, new auth config tests pass |
| Typecheck | `pnpm typecheck` | exit 0, no errors |
| Lint | `pnpm lint` | exit 0 |
| Full tests | `pnpm test` | exit 0 |

## Scope

**In scope**:

- `apps/api/src/auth.ts`
- `apps/api/src/auth.spec.ts` or `apps/api/src/auth-config.spec.ts` (create one focused test file)

**Out of scope**:

- Do not change Better Auth plugin behavior, routes, database schema, or session duration.
- Do not implement real email delivery for password reset links in this plan.
- Do not change `EmailService` unless needed only as a test pattern reference.
- Do not print any reset URL or auth secret in tests, errors, or snapshots.

## Git workflow

- Branch: `advisor/001-harden-auth-secret-and-reset-logging`
- Commit message: `fix(api): harden auth secret configuration`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Extract environment-aware auth secret resolution

In `apps/api/src/auth.ts`, replace the inline `secret: process.env.BETTER_AUTH_SECRET ?? ...` with a small exported helper, for example `resolveBetterAuthSecret(env = process.env)`. Target behavior:

- If `env.BETTER_AUTH_SECRET` is non-empty after trimming, return it.
- If running in local development or tests (`NODE_ENV` is `"development"`, `"test"`, or unset), return the current dev-only fallback string.
- If running in production-like mode (`NODE_ENV === "production"` or any non-local value), throw an `Error` with a message that names `BETTER_AUTH_SECRET` but does not include any secret value.

Then use `secret: resolveBetterAuthSecret()` in the `betterAuth` config.

**Verify**: `pnpm --filter @tatamiq/api typecheck` → exits 0.

### Step 2: Stop logging full password reset URLs

In `apps/api/src/auth.ts`, change `sendResetPassword` so it does not log the `url`. Acceptable behavior for now:

- In local/dev fallback, log a structured event with `event: "password_reset_link_created"` and `email: user.email` only, plus a non-sensitive hint such as `delivery: "dev-log"`.
- Do not include `url`, token query params, or raw reset link anywhere in logs.

Keep the callback async and do not change the Better Auth API shape.

**Verify**: `rg -n "password_reset_link_created|url," apps/api/src/auth.ts` → `password_reset_link_created` may appear, but no `url` property should remain in the logged object.

### Step 3: Add focused auth config tests

Create `apps/api/src/auth.spec.ts` or `apps/api/src/auth-config.spec.ts` testing the exported helper from Step 1. Cover at least:

1. returns provided `BETTER_AUTH_SECRET`;
2. returns the dev fallback when `NODE_ENV` is `"development"` and secret is absent;
3. returns the dev fallback when `NODE_ENV` is `"test"` and secret is absent;
4. throws when `NODE_ENV` is `"production"` and secret is absent;
5. thrown error message mentions `BETTER_AUTH_SECRET` and does not include the dev fallback string.

Avoid importing `auth` itself if it makes test setup expensive; import only the helper if possible.

**Verify**: `pnpm --filter @tatamiq/api test -- auth` → exits 0 and includes the new tests.

## Test plan

- New focused unit tests in `apps/api/src/auth.spec.ts` or `apps/api/src/auth-config.spec.ts`.
- Use `apps/api/src/students/email.service.spec.ts` as the style pattern for manipulating environment variables.
- Verification: `pnpm --filter @tatamiq/api test -- auth`, then `pnpm test`.

## Done criteria

- [ ] `apps/api/src/auth.ts` no longer contains an inline production fallback for `BETTER_AUTH_SECRET`.
- [ ] `apps/api/src/auth.ts` no longer logs the password reset `url`.
- [ ] New tests cover local fallback and production fail-fast behavior.
- [ ] `pnpm --filter @tatamiq/api test -- auth` exits 0.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` exit 0.
- [ ] No files outside the in-scope list are modified except `plans/README.md` status.

## STOP conditions

Stop and report if:

- Better Auth requires a compile-time constant secret in a way that prevents a helper function from being used.
- Existing code has already introduced a config module that supersedes this plan.
- Fixing password reset delivery requires implementing a mail provider or changing product behavior.
- Any verification fails twice after reasonable local fixes.

## Maintenance notes

Reviewers should check that neither secrets nor reset URLs are logged. A future config-validation module should absorb `resolveBetterAuthSecret` rather than reintroducing scattered env fallbacks.
