# Plan 011: Make approved pre-registration follow-up actions durable after queue reloads

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 260691b..HEAD -- apps/web/src/features/students/pre-registrations-tab.tsx apps/web/src/features/students/pre-registrations-workflow.ts apps/api/src/students/pre-registration.service.ts apps/api/src/students/pre-registration.controller.ts tests/e2e/student-access.spec.ts apps/web/src/features/students/pre-registrations-tab.test.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/010-characterize-pre-registration-regression-paths.md
- **Category**: bug
- **Planned at**: commit `260691b`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/177

## Why this matters

Once a pre-registration request is approved, the instructor still needs operational follow-up actions: share a first-access link or resend it by email. Today those actions are only visible in the same React session that performed the approval. If the page reloads or another instructor opens the queue later, the approved request loses its follow-up affordances even though the backend can still send email and can mint fresh first-access tokens. That breaks a core instructor workflow at the exact handoff point between approval and student activation.

## Current state

Relevant files:

- `apps/web/src/features/students/pre-registrations-tab.tsx` — renders the queue cards and gates the approved-state actions.
- `apps/web/src/features/students/pre-registrations-workflow.ts` — owns the mutation state for approve/reject/link actions.
- `apps/api/src/students/pre-registration.service.ts` — already supports `sendFirstAccessEmail()` by minting a fresh token and sending mail.
- `apps/api/src/students/pre-registration.controller.ts` — exposes the queue and email-send endpoints.
- `tests/e2e/student-access.spec.ts` — current browser coverage for approval.

Current excerpts:

```tsx
// apps/web/src/features/students/pre-registrations-tab.tsx:112-116
approvalResult={
  workflow.approvalResult?.requestId === request.id ? workflow.approvalResult : null
}
```

```tsx
// apps/web/src/features/students/pre-registrations-tab.tsx:215-244
{request.status === "approved" && props.approvalResult ? (
  <div className="space-y-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
    ...
    <Button ...>
      <Copy01Icon className="size-4" /> Copiar link de primeiro acesso
    </Button>
    <Button ... onClick={props.onSendEmail}>
      <Mail01Icon className="size-4" />
      {props.sendEmailPending ? "Enviando..." : "Enviar por email"}
    </Button>
  </div>
) : null}
```

```ts
// apps/web/src/features/students/pre-registrations-workflow.ts:95-117
if (data?.firstAccessLink) {
  setApprovalResult({
    requestId: variables.id,
    firstAccessLink: data.firstAccessLink,
  });
}
...
const sendEmailMutation = useMutation({
  mutationFn: async (id: string) => {
    const { error } = await api.POST("/students/pre-registrations/{id}/send-first-access-email", {
      params: { path: { id } },
    });
```

```ts
// apps/api/src/students/pre-registration.service.ts:421-461
async sendFirstAccessEmail(organizationId: string, requestId: string) {
  const request = await this.findRequest(organizationId, requestId);
  if (request.status !== "approved") {
    throw new BadRequestException("Email só pode ser enviado para solicitações aprovadas.");
  }

  const rawToken = randomBytes(32).toString("base64url");
  ...
  const firstAccessUrl = `${webAppUrl()}/student/first-access/${rawToken}`;

  await this.emailService.send({ ... html: buildFirstAccessEmailHtml(..., firstAccessUrl) });
}
```

Repo conventions to follow:

- Queue mutations invalidate React Query caches and then update small pieces of local UI state; match `apps/web/src/features/students/pre-registrations-workflow.ts:53-104`.
- Nest service methods return DTO-shaped objects and throw `BadRequestException` / `NotFoundException` rather than boolean flags; match `apps/api/src/students/pre-registration.service.ts:176-209`.
- Existing Playwright coverage for this area uses response waits and then asserts visible queue actions; match `tests/e2e/student-access.spec.ts:61-75`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Web tests | `pnpm --filter @tatamiq/web test -- src/features/students/pre-registrations-tab.test.tsx` | exit 0 |
| API tests | `pnpm --filter @tatamiq/api test -- src/students/pre-registration.service.spec.ts` | exit 0 |
| E2E regression | `pnpm test:e2e -- tests/e2e/student-access.spec.ts --project=chromium --workers=1` | all pass |
| Typecheck | `pnpm typecheck` | exit 0 |

## Scope

**In scope**:
- `apps/web/src/features/students/pre-registrations-tab.tsx`
- `apps/web/src/features/students/pre-registrations-workflow.ts`
- `apps/api/src/students/pre-registration.service.ts`
- `apps/api/src/students/pre-registration.controller.ts`
- `apps/api/src/students/pre-registration.service.spec.ts`
- `apps/web/src/features/students/pre-registrations-tab.test.tsx`
- `tests/e2e/student-access.spec.ts`

**Out of scope**:
- `apps/web/src/features/students/first-access-page.tsx` — covered by plan 012
- Student invite flows (`accept-student-invite`)
- Database schema changes unless absolutely required to expose a brand-new server response shape; if that becomes necessary, STOP and report

## Git workflow

- Branch: `advisor/011-durable-pre-registration-follow-up-actions`
- Commit style: Conventional Commits, e.g. `fix: persist pre-registration follow-up actions`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Decide the durable approved-state contract before touching UI

Read the approved-request workflow end to end and choose the smallest contract that makes follow-up actions available after reload **without pretending the original raw token can be reconstructed**.

The preferred shape is:
- approved requests always show **Enviar por email**;
- approved requests show a distinct action to mint a **new** copyable first-access link when the original raw link is no longer available;
- the existing immediate post-approval flow may still show “Copiar link de primeiro acesso” using the just-returned raw URL.

If the live code or product owner expectation clearly demands preserving the original copy action across reload without rotating the token, STOP and report — the backend only stores the hash, not the raw token.

**Verify**: no code change yet; note the chosen contract in the PR description / executor notes.

### Step 2: Expose a server-side way to mint a fresh copyable first-access link for approved requests

In `apps/api/src/students/pre-registration.service.ts` and `apps/api/src/students/pre-registration.controller.ts`, add an instructor-only action for approved requests that regenerates the first-access token and returns the fresh raw link. Reuse the token-generation pattern already present in `approveRequest()` and `sendFirstAccessEmail()`.

Requirements:
- only approved requests can use it;
- regenerating the link must overwrite `firstAccessTokenHash`, `firstAccessTokenExpiresAt`, and clear `firstAccessConsumedAt`;
- do not send email from this endpoint;
- return a DTO that includes the new `firstAccessLink`.

Add or update service tests to prove the token is rotated and the consumed flag is cleared.

**Verify**: `pnpm --filter @tatamiq/api test -- src/students/pre-registration.service.spec.ts` → exit 0.

### Step 3: Make the approved queue card render durable follow-up actions

In `apps/web/src/features/students/pre-registrations-workflow.ts` and `pre-registrations-tab.tsx`:

1. keep the existing in-memory `approvalResult` behavior for the immediate post-approval success state;
2. add a dedicated mutation for the new “generate first-access link” server action;
3. change the approved-card rendering so the email action is available for every approved request, not only when `approvalResult` is present;
4. when no in-memory raw link exists, render the copy/link action as an explicit regeneration action (name it clearly so the user understands a new link will be created);
5. after generating the new link, reuse the existing clipboard/toast pattern from `copyFirstAccessLink()`.

Update the existing web unit tests to assert both branches:
- approved request with an in-memory raw link;
- approved request loaded from the queue without `approvalResult`.

**Verify**: `pnpm --filter @tatamiq/web test -- src/features/students/pre-registrations-tab.test.tsx` → exit 0.

### Step 4: Extend the E2E to cover reload durability

Update `tests/e2e/student-access.spec.ts` so the pre-registration approval test explicitly reloads or reopens the queue after approval, then verifies:
- the approved request still exposes the email action;
- the approved request exposes the new link-regeneration/copy affordance;
- invoking the durable action yields a fresh first-access link or success signal.

Use response waits, not hard sleeps.

**Verify**: `pnpm test:e2e -- tests/e2e/student-access.spec.ts --project=chromium --workers=1` → all pass.

### Step 5: Run the final repo gate

Run typecheck after the API, web, and E2E updates.

**Verify**: `pnpm typecheck` → exit 0.

## Test plan

- `apps/api/src/students/pre-registration.service.spec.ts`
  - approved request can regenerate a fresh first-access link
  - regeneration clears consumed state
  - non-approved request is rejected
- `apps/web/src/features/students/pre-registrations-tab.test.tsx`
  - approved request without `approvalResult` still renders durable follow-up actions
  - immediate post-approval branch still renders copy + email actions
- `tests/e2e/student-access.spec.ts`
  - after queue reload, approved request still has follow-up actions
  - durable link action returns a usable first-access link or equivalent success indication

## Done criteria

- [ ] API exposes an instructor-only approved-request link-regeneration action with passing tests
- [ ] Approved queue cards still show follow-up actions after reload
- [ ] `pnpm --filter @tatamiq/api test -- src/students/pre-registration.service.spec.ts` exits 0
- [ ] `pnpm --filter @tatamiq/web test -- src/features/students/pre-registrations-tab.test.tsx` exits 0
- [ ] `pnpm test:e2e -- tests/e2e/student-access.spec.ts --project=chromium --workers=1` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- product stakeholders want the original raw first-access link to remain copyable after reload without token rotation;
- implementing the server action requires a database schema change not listed in scope;
- the contracts layer must change in a way that touches many unrelated consumers;
- the existing email endpoint is already relied on elsewhere to return data to the caller.

## Maintenance notes

- Reviewers should pay attention to naming: the post-reload action must communicate whether it copies the existing link or creates a new one.
- If email delivery is ever made asynchronous/queued, keep the durable follow-up actions separate from email status tracking; they solve different operator needs.
- Plan 012 will adjust first-access redirect semantics; do not couple that behavioral change into this plan.
