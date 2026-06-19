# Plan 013: Add the promised minimal abuse throttling to public pre-registration submission

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 260691b..HEAD -- CONTEXT.md apps/api/src/students/pre-registration.controller.ts apps/api/src/students/pre-registration.service.ts apps/api/src/students/pre-registration.service.spec.ts apps/web/src/features/students/pre-registration-page.tsx tests/e2e/student-access.spec.ts packages/database/src/schema.ts packages/database/drizzle`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `260691b`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/179

## Why this matters

The domain model for this product explicitly promises “proteção mínima por limite de tentativas por IP/email” on the academy pre-registration link. The live implementation currently exposes anonymous endpoints that accept unlimited form attempts, with only a duplicate-open-request check by email after the request reaches the service. That leaves the public link open to spam and operational abuse, and it means the shipped product is behind its own documented safety floor.

## Current state

Relevant files:
- `CONTEXT.md` — documents the minimum abuse-throttling expectation.
- `apps/api/src/students/pre-registration.controller.ts` — anonymous pre-registration endpoints.
- `apps/api/src/students/pre-registration.service.ts` — public request creation logic.
- `apps/web/src/features/students/pre-registration-page.tsx` — public page that must surface throttling failures gracefully.
- `packages/database/src/schema.ts` and `packages/database/drizzle/` — only relevant if the chosen implementation needs durable attempt storage.

Current excerpts:

```md
# CONTEXT.md:67-72
Link compartilhável ... com proteção mínima por limite de tentativas por IP/email na V0
...
uma solicitação rejeitada pode ser reenviada como nova tentativa
```

```ts
// apps/api/src/students/pre-registration.controller.ts:40-50
@Post("pre-register/:token/requests")
@AllowAnonymous()
@HttpCode(200)
createRequest(
  @Param("token") token: string,
  @ZodBody(CreatePreRegistrationRequestDto) body: CreatePreRegistrationRequestDto,
): Promise<PreRegistrationRequestDto> {
  return this.preRegistrationService.createRequest(token, body);
}
```

```ts
// apps/api/src/students/pre-registration.service.ts:99-103
const duplicateEmail = await this.findOpenRequestByEmail(organizationId, normalizedEmail);
if (duplicateEmail) {
  throw new ConflictException("Já existe uma solicitação em análise para este email.");
}
```

```tsx
// apps/web/src/features/students/pre-registration-page.tsx:55-72
if (error) {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: string }).message)
      : "Não foi possível enviar sua solicitação.";
  throw new Error(message);
}
...
onError: (mutationError) => {
  setError(
    mutationError instanceof Error
      ? mutationError.message
      : "Não foi possível enviar sua solicitação.",
  );
},
```

There is no existing rate-limit/throttling infrastructure in the audited API package (`rg` found no `Throttler`, `rate limit`, or similar patterns), but there is an existing request-IP pattern in platform code via `request.ip` (`apps/api/src/platform/platform.controller.ts:260-285`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| API tests | `pnpm --filter @tatamiq/api test -- src/students/pre-registration.service.spec.ts` | exit 0 |
| Web tests | `pnpm --filter @tatamiq/web test -- src/features/students/pre-registration-page.test.tsx` | exit 0 |
| E2E regression | `pnpm test:e2e -- tests/e2e/student-access.spec.ts --project=chromium --workers=1` | all pass |
| Typecheck | `pnpm typecheck` | exit 0 |

## Scope

**In scope**:
- `apps/api/src/students/pre-registration.controller.ts`
- `apps/api/src/students/pre-registration.service.ts`
- `apps/api/src/students/pre-registration.service.spec.ts`
- `apps/web/src/features/students/pre-registration-page.tsx`
- `apps/web/src/features/students/pre-registration-page.test.tsx` (new)
- `tests/e2e/student-access.spec.ts`
- `packages/database/src/schema.ts` and `packages/database/drizzle/*` **only if** durable attempt tracking is needed

**Out of scope**:
- queue/instructor-only pre-registration flows
- student invite throttling
- global API-wide rate limiting
- email-confirmation redesign

## Git workflow

- Branch: `advisor/013-pre-registration-throttling`
- Commit style: Conventional Commits, e.g. `feat: throttle public pre-registration submissions`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Choose the narrowest throttling design that satisfies the domain promise

Before editing code, decide whether the minimum viable implementation can be kept in-process or needs durable storage.

Preferred decision order:
1. if the deployment/runtime guarantees make a lightweight per-IP/per-email server-side limiter trustworthy enough for V0, use that;
2. if multi-instance behavior makes in-memory throttling meaningless, add a small durable attempt record in Postgres with TTL-style cleanup semantics.

The contract to satisfy is minimal abuse throttling, not a perfect WAF. Document the chosen thresholds in code comments and tests.

**Verify**: no code change yet; record the chosen thresholds in executor notes.

### Step 2: Enforce throttling on anonymous request creation

Update `apps/api/src/students/pre-registration.controller.ts` and/or `pre-registration.service.ts` so public submission considers both:
- repeated attempts from the same IP address;
- repeated attempts for the same normalized email.

Implementation requirements:
- preserve the current “same academy + open request email” conflict rule;
- throttling must apply before the insert succeeds;
- return a user-safe error message in Portuguese that explains the person should wait and try again later;
- use the same exception style already present in the service/controller.

If the controller needs request metadata, follow the existing `request.ip` pattern already used in platform controller code.

**Verify**: `pnpm --filter @tatamiq/api test -- src/students/pre-registration.service.spec.ts` → exit 0 with new throttling tests.

### Step 3: Surface throttling failures clearly on the public page

In `apps/web/src/features/students/pre-registration-page.tsx`, keep the current error-handling pattern but ensure the throttling message from the API is shown cleanly and does not look like a generic backend failure.

If necessary, add a focused web test file for the throttled-error render branch.

**Verify**: `pnpm --filter @tatamiq/web test -- src/features/students/pre-registration-page.test.tsx` → exit 0.

### Step 4: Add a browser regression proving the abuse guard does not break the happy path

Extend `tests/e2e/student-access.spec.ts` with a narrow assertion that the ordinary one-shot pre-registration flow still works after throttling lands. Do **not** attempt to hammer the endpoint in Playwright; keep the E2E focused on the legitimate path and leave threshold edge cases to API tests.

**Verify**: `pnpm test:e2e -- tests/e2e/student-access.spec.ts --project=chromium --workers=1` → all pass.

### Step 5: Run the final gate

Run root typecheck after API/web/test changes.

**Verify**: `pnpm typecheck` → exit 0.

## Test plan

- `apps/api/src/students/pre-registration.service.spec.ts`
  - blocks repeated submissions beyond the configured email threshold
  - blocks repeated submissions beyond the configured IP threshold
  - still allows a normal first submission
  - still allows re-submission rules that the domain permits (e.g. rejected request can submit again) if the limiter window has passed or the chosen policy allows it
- `apps/web/src/features/students/pre-registration-page.test.tsx`
  - throttled API error is shown as user-facing text
- `tests/e2e/student-access.spec.ts`
  - existing happy-path pre-registration still succeeds unchanged

## Done criteria

- [ ] Anonymous pre-registration submission now enforces a minimal per-IP/per-email throttle
- [ ] The public page shows a specific user-safe throttling error
- [ ] `pnpm --filter @tatamiq/api test -- src/students/pre-registration.service.spec.ts` exits 0
- [ ] `pnpm --filter @tatamiq/web test -- src/features/students/pre-registration-page.test.tsx` exits 0
- [ ] `pnpm test:e2e -- tests/e2e/student-access.spec.ts --project=chromium --workers=1` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- a meaningful per-IP limiter cannot be implemented because the runtime strips or falsifies client IPs in this deployment path;
- adding durable throttling requires a broader shared rate-limit subsystem that would touch unrelated endpoints;
- the contracts for the public page cannot carry a specific throttling message without a wider API-client refactor;
- the team decides the domain statement in `CONTEXT.md` should be relaxed instead of implemented.

## Maintenance notes

- Reviewers should look closely at threshold values: too low creates false positives for families sharing a network; too high fails the abuse goal.
- Keep the throttling code local to the pre-registration flow unless a deliberate platform-wide limiter initiative starts later.
- If durable storage is introduced, schedule cleanup/retention follow-up explicitly rather than leaving old attempt rows unbounded.
