# Plan 012: Route existing-account first access to the right destination

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 260691b..HEAD -- CONTEXT.md apps/api/src/students/pre-registration.service.ts apps/api/src/students/pre-registration.service.spec.ts apps/web/src/features/students/first-access-page.tsx tests/e2e/student-access.spec.ts apps/web/src/features/students/first-access-page.test.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/010-characterize-pre-registration-regression-paths.md
- **Category**: bug
- **Planned at**: commit `260691b`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/178

## Why this matters

The domain explicitly distinguishes two first-access outcomes: new accounts define a password, while emails that already belong to an existing auth account should be routed into login / student access without a password reset step. The current implementation ignores that distinction and always navigates to `/sign-in`, even after an existing-account activation. That forces extra friction on a supported case and diverges from the documented flow.

## Current state

Relevant files:
- `CONTEXT.md` — source of truth for the product/domain expectation.
- `apps/api/src/students/pre-registration.service.ts` — decides the `redirectTo` value after first access completes.
- `apps/api/src/students/pre-registration.service.spec.ts` — service-level tests for first-access completion.
- `apps/web/src/features/students/first-access-page.tsx` — decides where the browser goes after the completion response.
- `tests/e2e/student-access.spec.ts` — currently accepts both `/sign-in` and `/` after first access because the behavior is unstable.

Current excerpts:

```md
# CONTEXT.md:76
quando o email já pertence a uma conta existente, o acesso é vinculado a essa conta e o link leva ao login/área do aluno sem redefinir senha
```

```ts
// apps/api/src/students/pre-registration.service.ts:397-416
const hasPassword = await this.userHasPassword(authUser.id);
...
await this.db
  .update(preRegistrationRequests)
  .set({ firstAccessConsumedAt: now, updatedAt: now })
  .where(eq(preRegistrationRequests.id, row.request.id));

return { redirectTo: hasPassword ? "sign-in" : "sign-in" };
```

```tsx
// apps/web/src/features/students/first-access-page.tsx:25-46
const completeMutation = useMutation({
  mutationFn: async () => {
    ...
    const { error } = await api.POST("/student/first-access/{token}/complete", {
      params: { path: { token: props.token } },
      body,
    });
    if (error) throw new Error("Não foi possível completar o acesso.");
  },
  onSuccess: () => {
    navigate({ to: "/sign-in" });
  },
});
```

```ts
// tests/e2e/student-access.spec.ts:85-96
await firstAccessPage.getByRole("button", { name: "Definir senha e acessar" }).click();
await expect(firstAccessPage).toHaveURL(/\/(sign-in)?$/);

if (await firstAccessPage.getByLabel("Email").isVisible().catch(() => false)) {
  await signInAsStudentOnly(firstAccessPage, requestEmail, password);
}
await expect(
  firstAccessPage
    .getByText(/^Olá,/)
    .or(firstAccessPage.getByRole("heading", { name: "Painel" }))
    .first(),
).toBeVisible();
```

Repo conventions to match:
- API behavior is tested in service specs with fake time and mock DBs; mirror `apps/api/src/students/pre-registration.service.spec.ts`.
- Web pages use React Query mutation callbacks to navigate after success; mirror `apps/web/src/features/students/first-access-page.tsx:25-46`.
- Playwright helpers already support a student-only sign-in flow via `signInAsStudentOnly()`; reuse it rather than duplicating login steps.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| API tests | `pnpm --filter @tatamiq/api test -- src/students/pre-registration.service.spec.ts` | exit 0 |
| Web tests | `pnpm --filter @tatamiq/web test -- src/features/students/first-access-page.test.tsx` | exit 0 |
| E2E regression | `pnpm test:e2e -- tests/e2e/student-access.spec.ts --project=chromium --workers=1` | all pass |
| Typecheck | `pnpm typecheck` | exit 0 |

## Scope

**In scope**:
- `apps/api/src/students/pre-registration.service.ts`
- `apps/api/src/students/pre-registration.service.spec.ts`
- `apps/web/src/features/students/first-access-page.tsx`
- `apps/web/src/features/students/first-access-page.test.tsx`
- `tests/e2e/student-access.spec.ts`

**Out of scope**:
- pre-registration queue UI (`pre-registrations-tab.tsx`) — covered by plan 011
- student invite acceptance flow
- auth shell / generic sign-in page implementation
- `CONTEXT.md` itself (it is evidence here, not a target)

## Git workflow

- Branch: `advisor/012-existing-account-first-access-routing`
- Commit style: Conventional Commits, e.g. `fix: route existing-account first access correctly`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Make the API return a meaningful redirect outcome

In `apps/api/src/students/pre-registration.service.ts`, preserve the current token-consumption behavior but change the response so `redirectTo` differentiates between:
- new account / password just defined;
- existing account that already had a password.

Use a small explicit response vocabulary rather than overloading boolean state in the frontend. Update or extend the service tests to cover both branches.

**Verify**: `pnpm --filter @tatamiq/api test -- src/students/pre-registration.service.spec.ts` → exit 0.

### Step 2: Honor the API redirect result in the first-access page

In `apps/web/src/features/students/first-access-page.tsx`, stop hardcoding `navigate({ to: "/sign-in" })`. Read the completion response and navigate according to the returned redirect target.

Preferred behavior:
- new-account path still goes to `/sign-in` after password creation;
- existing-account path goes directly to the student area if the app can do so safely, or to `/sign-in` with an explicit student redirect parameter if direct entry is not possible without a session.

If direct navigation to `/student` turns out to be impossible because no auth session exists yet, do **not** improvise. Keep the API/frontend contract truthful by returning a login destination plus redirect hint instead.

**Verify**: `pnpm --filter @tatamiq/web test -- src/features/students/first-access-page.test.tsx` → exit 0.

### Step 3: Tighten the E2E around the existing-account branch

Update `tests/e2e/student-access.spec.ts` so the first-access assertions no longer accept arbitrary outcomes. Add or adapt coverage for the branch where the approved email already belongs to an auth account, then assert the expected destination exactly.

Reuse `signInAsStudentOnly()` only where the contract still requires an explicit login hop.

**Verify**: `pnpm test:e2e -- tests/e2e/student-access.spec.ts --project=chromium --workers=1` → all pass.

### Step 4: Run the final gate

Run typecheck once after the API/web/E2E changes.

**Verify**: `pnpm typecheck` → exit 0.

## Test plan

- `apps/api/src/students/pre-registration.service.spec.ts`
  - `completeFirstAccess()` returns the new-account redirect when password is created
  - `completeFirstAccess()` returns the existing-account redirect when password already exists
- `apps/web/src/features/students/first-access-page.test.tsx`
  - mutation success navigates to the expected destination for each redirect result
- `tests/e2e/student-access.spec.ts`
  - first-access path for an existing-account request lands in the exact expected area/login flow

## Done criteria

- [ ] API no longer returns identical `redirectTo` values for both branches
- [ ] `apps/web/src/features/students/first-access-page.tsx` navigates from the completion response instead of a hardcoded route
- [ ] `pnpm --filter @tatamiq/api test -- src/students/pre-registration.service.spec.ts` exits 0
- [ ] `pnpm --filter @tatamiq/web test -- src/features/students/first-access-page.test.tsx` exits 0
- [ ] `pnpm test:e2e -- tests/e2e/student-access.spec.ts --project=chromium --workers=1` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- the contracts package does not have a compatible place to express the richer redirect target and changing it would cascade into unrelated consumers;
- the existing-account path cannot create a trustworthy destination without a broader auth redesign;
- seeded data in the E2E fixtures cannot exercise an existing-account pre-registration case;
- another in-flight change has already altered first-access routing semantics.

## Maintenance notes

- Reviewers should validate that the new redirect vocabulary is explicit enough to survive future UI changes; opaque booleans will reintroduce this drift.
- Keep the distinction between “where the first-access page goes next” and “what area the user ultimately uses” clear in naming and tests.
- If the auth flow later introduces magic-link login or silent session creation, revisit this plan’s redirect contract rather than layering new conditionals into the page.
