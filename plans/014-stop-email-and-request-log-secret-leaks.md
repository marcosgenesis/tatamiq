# Plan 014: Stop email fallback and request logging from leaking auth artifacts

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa3aa3..HEAD -- apps/api/src/students/email.service.ts apps/api/src/students/email.service.spec.ts apps/api/src/students/pre-registration.service.ts apps/api/src/app.module.ts apps/api/src/health/health.controller.spec.ts .env.example apps/api/.env.example`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `4fa3aa3`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/180

## Why this matters

Tatamiq uses httpOnly cookie sessions and first-access links for student onboarding. The current development email fallback logs complete email HTML; when that email contains a first-access URL, the raw access token can land in logs. The HTTP logger also uses default `nestjs-pino` request logging with no explicit cookie/header redaction. This plan makes logs useful for debugging without preserving bearer material, cookies, or one-time access links.

## Current state

Relevant files:

- `apps/api/src/students/email.service.ts` — sends email through Resend or logs the full email payload when `RESEND_API_KEY` is absent.
- `apps/api/src/students/pre-registration.service.ts` — builds first-access URLs containing raw one-time tokens and passes them into email HTML.
- `apps/api/src/app.module.ts` — configures the API request logger.
- `apps/api/src/students/email.service.spec.ts` — existing unit tests for email fallback and Resend behavior.
- `apps/api/src/auth.spec.ts` — good example of tests that assert secret values are not leaked.

Current excerpts:

```ts
// apps/api/src/students/email.service.ts:21-22
if (!resendApiKey) {
  console.log({ event: "email_dev_fallback", ...emailPayload });
  return;
}
```

```ts
// apps/api/src/students/pre-registration.service.ts:453-458
const firstAccessUrl = `${webAppUrl()}/student/first-access/${rawToken}`;

await this.emailService.send({
  to: request.email,
  subject: `Seu acesso ao ${academy.name} no Tatamiq`,
  html: buildFirstAccessEmailHtml(academy.name, request.name, firstAccessUrl),
});
```

```ts
// apps/api/src/app.module.ts:30-32
LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? "info",
  },
}),
```

```md
<!-- README.md:45 -->
- **Auth:** Better Auth with httpOnly cookie sessions
```

Existing convention to match: use Vitest spies for logging tests, as in `apps/api/src/students/email.service.spec.ts`, and assert that secret strings are absent, as in `apps/api/src/auth.spec.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| API tests | `pnpm --filter @tatamiq/api test -- src/students/email.service.spec.ts src/health/health.controller.spec.ts` | exit 0, targeted tests pass |
| Typecheck | `pnpm typecheck` | exit 0, no TypeScript errors |
| Lint | `pnpm lint` | exit 0; existing warnings may remain, no new errors |
| Full tests | `pnpm test` | exit 0 |

## Scope

**In scope**:

- `apps/api/src/students/email.service.ts`
- `apps/api/src/students/email.service.spec.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/health/health.controller.spec.ts` only if a logger-redaction integration assertion is practical there
- `.env.example`
- `apps/api/.env.example`

**Out of scope**:

- Do not change pre-registration token generation or first-access behavior.
- Do not change Better Auth routes or session cookie configuration.
- Do not replace `nestjs-pino` with another logger.
- Do not remove email fallback entirely for local development/test.

## Git workflow

- Branch: `advisor/014-stop-log-secret-leaks`
- Commit message style: Conventional Commits, e.g. `fix(api): redact email and request log secrets`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Make email fallback safe and local-only

In `apps/api/src/students/email.service.ts`:

1. Keep the Resend send path unchanged when `RESEND_API_KEY` is configured.
2. Replace full-payload fallback logging with a sanitized object. It may include non-secret metadata such as `event`, `from`, `to`, `subject`, and `htmlLength`, but it must not include `html` or any URL containing `/student/first-access/`.
3. Make the fallback only available in local/test/E2E environments. If `RESEND_API_KEY` is absent and `NODE_ENV` is production-like, throw a friendly `BadRequestException` (or a configuration error) instead of logging the payload. Treat `development`, `test`, empty `NODE_ENV`, and `E2E=true` as local/test.
4. Do not print raw email HTML in any branch.

Suggested shape:

```ts
const canUseDevFallback = isLocalEmailFallbackAllowed(process.env);
if (!resendApiKey) {
  if (!canUseDevFallback) throw new BadRequestException("Envio de email não configurado.");
  console.log({
    event: "email_dev_fallback",
    from: emailPayload.from,
    to: emailPayload.to,
    subject: emailPayload.subject,
    htmlLength: emailPayload.html.length,
  });
  return;
}
```

Add a small helper near `emailFrom()` and unit-test it through `EmailService.send` behavior; it does not need to be exported unless tests require it.

**Verify**: `pnpm --filter @tatamiq/api test -- src/students/email.service.spec.ts` → exits 0.

### Step 2: Update email service tests to prove secrets are not logged

In `apps/api/src/students/email.service.spec.ts`:

- Update the existing fallback test so it expects no `html` property in the logged object.
- Add a regression test that passes HTML containing a first-access URL and a fake token, then asserts the logged JSON/string representation does not contain the token and does not contain `/student/first-access/`.
- Add a test for production-like `NODE_ENV` with empty `RESEND_API_KEY`: it must not call `console.log` and must reject with a friendly error.
- Keep the existing Resend test proving the provider path still sends the full HTML to Resend.

**Verify**: `pnpm --filter @tatamiq/api test -- src/students/email.service.spec.ts` → exits 0 and includes the new non-leak tests.

### Step 3: Redact request/response headers in the API logger

In `apps/api/src/app.module.ts`, configure `pinoHttp.redact` so request logs do not include session cookies or bearer credentials. Include at least:

- `req.headers.cookie`
- `req.headers.authorization`
- `req.headers["x-api-key"]`
- `res.headers["set-cookie"]`

Use Pino's built-in redaction option. Do not disable request logging entirely.

Example target shape:

```ts
LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? "info",
    redact: {
      paths: [
        "req.headers.cookie",
        "req.headers.authorization",
        "req.headers.x-api-key",
        "res.headers.set-cookie",
      ],
      censor: "[REDACTED]",
    },
  },
}),
```

If Pino path syntax for hyphenated headers requires bracket notation in this project, use the syntax that typechecks and is documented by `pino`.

**Verify**: `pnpm typecheck` → exits 0.

### Step 4: Align env comments with the new fallback rule

In `.env.example` and `apps/api/.env.example`, update the Resend comment so it says the empty-key fallback is for local development/test only, not production. Do not add real secrets.

**Verify**: `pnpm lint` → exits 0; existing warnings may remain.

## Test plan

- Update `apps/api/src/students/email.service.spec.ts` as described above.
- If practical without brittle logger internals, add a small assertion around logger configuration in a targeted API test. If that requires bootstrapping the entire Nest app just to inspect internal Pino options, skip it and rely on typecheck plus code review; do not add a fragile test.
- Run:
  - `pnpm --filter @tatamiq/api test -- src/students/email.service.spec.ts`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`

## Done criteria

All must hold:

- [ ] `EmailService` fallback logs no `html` and no first-access URL/token material.
- [ ] Production-like env with missing `RESEND_API_KEY` does not log email payloads.
- [ ] `LoggerModule` has explicit redaction for cookies and authorization-like headers.
- [ ] `.env.example` and `apps/api/.env.example` explain that email fallback is local/test only.
- [ ] `pnpm --filter @tatamiq/api test -- src/students/email.service.spec.ts` exits 0.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` exit 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for Plan 014 is updated.

## STOP conditions

Stop and report if:

- `EmailService` no longer resembles the current excerpt; another change already redesigned email delivery.
- Pino redaction cannot be configured without replacing the logger stack.
- The fix appears to require changing Better Auth internals or session cookie configuration.
- Any test would need to include a real secret or token value copied from a local environment.

## Maintenance notes

Future email templates may contain other one-time links. Keep the fallback logging metadata-only rather than trying to redact individual URL patterns. Reviewers should inspect logs for absence of `html`, cookies, authorization headers, and `set-cookie`, not just for passing tests.
