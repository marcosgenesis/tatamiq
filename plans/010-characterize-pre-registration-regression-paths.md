# Plan 010: Add characterization coverage for the pre-registration flow's fragile paths

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 260691b..HEAD -- tests/e2e/student-access.spec.ts apps/web/src/features/students/pre-registrations-tab.test.tsx apps/api/src/students/pre-registration.service.spec.ts apps/web/src/features/students/first-access-page.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `260691b`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/176

## Why this matters

The pre-registration flow already has meaningful logic around duplicate handling, first-access token states, and instructor follow-up actions, but the automated coverage is concentrated on the happy path. That makes future fixes riskier: a later executor can accidentally break duplicate-review behavior or first-access branching while chasing UI issues, and CI will not tell them. This plan adds characterization coverage first, so the subsequent bug-fix plans can land with tighter guardrails.

## Current state

Relevant files and their roles:

- `tests/e2e/student-access.spec.ts` — browser coverage for pre-registration, approval, rejection, and student invites.
- `apps/api/src/students/pre-registration.service.spec.ts` — service-level tests for request creation and approval logic.
- `apps/web/src/features/students/pre-registrations-tab.test.tsx` — static render tests for the instructor queue cards.
- `apps/web/src/features/students/first-access-page.tsx` — first-access screen with separate branches for new-password and existing-password users.

Current excerpts:

```ts
// tests/e2e/student-access.spec.ts:61-75
const approveResponsePromise = page.waitForResponse(
  (response) =>
    response.url().includes("/students/pre-registrations/") &&
    response.url().includes("/approve") &&
    response.request().method() === "POST",
);
await requestCard.getByRole("button", { name: "Aprovar" }).click();
const approveResponse = await approveResponsePromise;
const approveBody = (await approveResponse.json()) as { firstAccessLink: string };
...
await expect(page.getByRole("button", { name: /Copiar link de primeiro acesso/i })).toBeVisible();
await expect(page.getByRole("button", { name: "Enviar por email" })).toBeVisible();
```

```ts
// apps/web/src/features/students/pre-registrations-tab.test.tsx:50-73
it("renders copy and email actions after approval result", () => {
  const html = renderToStaticMarkup(
    <RequestCard
      request={{ ...baseRequest, status: "approved", reviewedAt: "2026-05-27T01:00:00.000Z" }}
      ...
      approvalResult={{ firstAccessLink: "http://localhost:5173/student/first-access/token" }}
    />,
  );

  expect(html).toContain("Copiar link de primeiro acesso");
  expect(html).toContain("Enviar por email");
});
```

```ts
// apps/api/src/students/pre-registration.service.ts:224-235
if (existing.duplicateStudentId && input.duplicateDecision === "reject_as_duplicate") {
  return this.rejectAsDuplicate(organizationId, requestId, userId, existing);
}
...
if (linkToExisting && existing.duplicateStudentId) {
  const existingAccess = await this.findActiveAccessForStudent(existing.duplicateStudentId);
  if (existingAccess) {
    throw new BadRequestException(
      "Este aluno já possui acesso ativo. Não é possível vincular.",
    );
  }
}
```

```tsx
// apps/web/src/features/students/first-access-page.tsx:49-58
const preview = previewQuery.data;
const valid = preview?.status === "valid";
const needsPassword = valid && !preview?.hasPassword;
const passwordsMatch = password === passwordConfirm;
const passwordValid = password.length >= 8;

const canSubmit =
  acceptedTerms &&
  (needsPassword ? passwordValid && passwordsMatch : true) &&
  !completeMutation.isPending;
```

Repo conventions to match:

- Playwright E2E specs here run serially and reset fixtures in `beforeEach`; mirror `tests/e2e/student-access.spec.ts:10-15`.
- API service tests use the in-file mock DB builder rather than spinning up Nest modules; mirror `apps/api/src/students/pre-registration.service.spec.ts:1-58`.
- Web component tests use `renderToStaticMarkup` for simple branch coverage and Vitest-style assertions; mirror `apps/web/src/features/students/pre-registrations-tab.test.tsx:24-136`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Web unit tests | `pnpm --filter @tatamiq/web test -- src/features/students/pre-registrations-tab.test.tsx src/features/students/first-access-page.test.tsx` | exit 0 |
| API unit tests | `pnpm --filter @tatamiq/api test -- src/students/pre-registration.service.spec.ts` | exit 0 |
| E2E regression pass | `pnpm test:e2e -- tests/e2e/student-access.spec.ts --project=chromium --workers=1` | all tests pass |
| Full typecheck | `pnpm typecheck` | exit 0 |

## Scope

**In scope**:
- `tests/e2e/student-access.spec.ts`
- `apps/api/src/students/pre-registration.service.spec.ts`
- `apps/web/src/features/students/pre-registrations-tab.test.tsx`
- `apps/web/src/features/students/first-access-page.test.tsx` (new)

**Out of scope**:
- Any production code under `apps/api/src/students/` or `apps/web/src/features/students/`
- Contract/schema changes under `packages/contracts` or `packages/database`
- Student invite flows outside pre-registration

## Git workflow

- Branch: `advisor/010-characterize-pre-registration-regressions`
- Commit style: Conventional Commits, e.g. `test: add pre-registration characterization coverage`
- Do not push or open a PR unless the operator explicitly asks.

## Steps

### Step 1: Expand API service characterization around duplicate decisions and first-access follow-up

In `apps/api/src/students/pre-registration.service.spec.ts`, add focused tests for the branches that are present in the service but not currently protected well enough:

1. approving a duplicate request with `duplicateDecision: "reject_as_duplicate"` returns a rejected request and no first-access link;
2. approving a duplicate request with `duplicateDecision: "link_to_existing"` fails when the existing student already has active access;
3. `sendFirstAccessEmail()` regenerates a token, clears `firstAccessConsumedAt`, and sends an email payload containing the `/student/first-access/` URL.

Reuse the existing mock DB helpers and the fake-time pattern already present in this spec.

**Verify**: `pnpm --filter @tatamiq/api test -- src/students/pre-registration.service.spec.ts` → exit 0 with the new cases passing.

### Step 2: Expand web branch coverage for approved requests and first-access states

1. In `apps/web/src/features/students/pre-registrations-tab.test.tsx`, add a test that covers the approved-card branch when `approvalResult` is `null`, so later plans can intentionally change that branch with an explicit regression test diff instead of silent drift.
2. Create `apps/web/src/features/students/first-access-page.test.tsx` and cover at least these render branches:
   - valid preview with `hasPassword: false` shows password fields and the “Definir senha e acessar” CTA;
   - valid preview with `hasPassword: true` hides password fields and shows the existing-account messaging;
   - consumed preview shows the “Ir para login” link.

Keep the test style aligned with the lightweight Vitest/react rendering already used in this area; do not introduce a new test stack.

**Verify**: `pnpm --filter @tatamiq/web test -- src/features/students/pre-registrations-tab.test.tsx src/features/students/first-access-page.test.tsx` → exit 0.

### Step 3: Deepen the browser spec around duplicate handling

In `tests/e2e/student-access.spec.ts`, add one or two narrowly-scoped assertions that cover the duplicate-decision path in the instructor queue without changing production behavior. Prefer using a request that collides with an existing seeded student, then assert that the duplicate warning and one duplicate-resolution action are visible before approval.

Do not attempt to fix any known bugs in this plan; the goal is to make the current high-risk branches observable.

**Verify**: `pnpm test:e2e -- tests/e2e/student-access.spec.ts --project=chromium --workers=1` → all tests pass.

### Step 4: Run the repo-wide verification gate for touched layers

Run the root typecheck once after all test edits land.

**Verify**: `pnpm typecheck` → exit 0.

## Test plan

Add or extend automated tests only:

- `apps/api/src/students/pre-registration.service.spec.ts`
  - duplicate rejection path
  - duplicate link-to-existing blocked by active access
  - first-access email resend token reset
- `apps/web/src/features/students/pre-registrations-tab.test.tsx`
  - approved request branch without in-memory approval result
- `apps/web/src/features/students/first-access-page.test.tsx`
  - new-account branch
  - existing-account branch
  - consumed-token branch
- `tests/e2e/student-access.spec.ts`
  - duplicate warning / duplicate decision visibility in the instructor queue

Use these existing patterns as exemplars:
- API mock builder: `apps/api/src/students/pre-registration.service.spec.ts:1-58`
- Static markup web tests: `apps/web/src/features/students/pre-registrations-tab.test.tsx:24-136`
- Serial Playwright reset flow: `tests/e2e/student-access.spec.ts:10-25`

## Done criteria

- [ ] `pnpm --filter @tatamiq/api test -- src/students/pre-registration.service.spec.ts` exits 0
- [ ] `pnpm --filter @tatamiq/web test -- src/features/students/pre-registrations-tab.test.tsx src/features/students/first-access-page.test.tsx` exits 0
- [ ] `pnpm test:e2e -- tests/e2e/student-access.spec.ts --project=chromium --workers=1` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:

- any in-scope file has drifted enough that the cited branches no longer exist;
- adding the web tests requires introducing a new testing library or altering shared test infrastructure;
- the seeded data no longer contains a stable duplicate candidate for the E2E assertion;
- any of the new tests would require production-code changes to pass.

## Maintenance notes

- These characterization tests are intended to protect later plans 011 and 012; reviewers should verify they assert user-visible behavior, not just implementation detail.
- If the team later migrates web tests away from `renderToStaticMarkup`, keep the asserted branches but update the mechanics in one dedicated refactor rather than mixing it into a bug fix.
- Follow-up bug fixes should update these tests only when the intended behavior changes explicitly.
