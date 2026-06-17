# Plan 016: Generate missed current-month Mensalidades after the due day during catch-up

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa3aa3..HEAD -- apps/api/src/monthly-fees/fee-generation.service.ts apps/api/src/monthly-fees/monthly-fee-rules.ts apps/api/src/monthly-fees/monthly-fees.controller.ts apps/api/src/monthly-fees/monthly-fee-status-projection.spec.ts docs/adr/0009-overdue-status-calculated-not-persisted.md`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `4fa3aa3`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/182

## Why this matters

ADR-0009 says the dashboard catch-up generates missing **Mensalidades** but never mutates overdue statuses. Today, catch-up skips a current-month fee once the due day has passed. If the daily cron misses a run, an academy is ownerless during the 5-day generation window, or a deployment is paused, the month’s fee may never appear. This plan keeps the cron’s 5-day-ahead behavior but makes explicit catch-up create missing current-month fees even after the due day.

## Current state

Relevant files:

- `apps/api/src/monthly-fees/fee-generation.service.ts` — daily cron and dashboard catch-up generation logic.
- `apps/api/src/monthly-fees/monthly-fees.controller.ts` — calls `feeGenerationService.catchUp(academyId)` before listing fees.
- `docs/adr/0009-overdue-status-calculated-not-persisted.md` — documents that catch-up generates missing fees without changing statuses.

Current excerpts:

```ts
// apps/api/src/monthly-fees/fee-generation.service.ts:24
const count = await this.generateForOrganization(organizationId, 5);
```

```ts
// apps/api/src/monthly-fees/fee-generation.service.ts:30-31
async catchUp(organizationId: string): Promise<number> {
  return this.generateForOrganization(organizationId, null);
}
```

```ts
// apps/api/src/monthly-fees/fee-generation.service.ts:73-77
if (daysAheadLimit !== null) {
  const daysUntilDue = dueDateDay - currentDay;
  if (daysUntilDue < 0 || daysUntilDue > daysAheadLimit) continue;
} else {
  if (dueDateDay < currentDay) continue;
}
```

```md
<!-- docs/adr/0009-overdue-status-calculated-not-persisted.md:7 -->
The daily cron still exists for fee generation (creating new monthly fees 5 days before the due date for active students), but it does not mutate existing fee statuses. The dashboard catch-up also generates missing fees but never changes statuses.
```

Existing convention to match: API unit tests live next to the implementation as `*.spec.ts` and use Vitest (`apps/api/src/monthly-fees/monthly-fee-status-projection.spec.ts`, `apps/api/src/monthly-fees/monthly-fee-lifecycle.spec.ts`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Targeted API tests | `pnpm --filter @tatamiq/api test -- src/monthly-fees/fee-generation.service.spec.ts` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0; existing warnings may remain |
| Full tests | `pnpm test` | exit 0 |

## Scope

**In scope**:

- `apps/api/src/monthly-fees/fee-generation.service.ts`
- `apps/api/src/monthly-fees/fee-generation.service.spec.ts` (create)

**Out of scope**:

- Do not change persisted monthly fee statuses; `overdue` stays calculated.
- Do not change the cron schedule or timezone.
- Do not create fees for previous months unless the maintainer explicitly asks; this plan is only for the current month catch-up.
- Do not change monthly fee amount/due-day validation outside this service.

## Git workflow

- Branch: `advisor/016-monthly-fee-catchup-after-due-day`
- Commit message style: Conventional Commits, e.g. `fix(api): catch up missed current-month fees`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add characterization tests for the current bug and cron behavior

Create `apps/api/src/monthly-fees/fee-generation.service.spec.ts`.

Cover these cases with a lightweight Drizzle mock or a focused fake repository shape:

1. `catchUp` creates a missing current-month fee even when `currentDay > dueDay`.
2. `cronGenerate` / the 5-day generation path still does not create a fee after the due day.
3. Existing fee for the same `studentId/referenceYear/referenceMonth` is skipped.
4. Ownerless organization still skips generation.

Use `vi.useFakeTimers()` / `vi.setSystemTime()` so the current date is deterministic. Include at least one date in `America/Sao_Paulo` where due day has passed, e.g. system time after the 10th of the month.

If the current private method shape makes direct cron-path testing too awkward, extract a small non-exported helper or add an optional `now` parameter to `catchUp`/`generateForOrganization` for tests. Do not expose a public API just for tests unless necessary.

**Verify**: initially the catch-up-after-due-day test should fail before the implementation change. After implementing Step 2 it must pass.

### Step 2: Split catch-up mode from cron look-ahead mode

In `apps/api/src/monthly-fees/fee-generation.service.ts`, make the generation mode explicit instead of using `null` to mean catch-up.

Target behavior:

- Cron mode: create fees only when due date is today through 5 days ahead; skip if due day is already past.
- Catch-up mode: create the current-month fee for every eligible active student with configured amount/due day, regardless of whether the due day has passed, as long as the fee does not already exist.
- Both modes: continue to skip ownerless academies and skip existing fees.

A clear implementation shape is:

```ts
type FeeGenerationMode = { kind: "cron"; daysAheadLimit: number } | { kind: "catch_up" };
```

Then replace the current date-window branch with mode-specific logic. Avoid changing `clampDueDay`, `formatDueDate`, or ADR-0009 status projection.

**Verify**: `pnpm --filter @tatamiq/api test -- src/monthly-fees/fee-generation.service.spec.ts` → exits 0.

### Step 3: Remove non-null assertions while touching the loop

The current loop uses non-null assertions:

```ts
const dueDay = student.monthlyDueDay!;
const amount = student.monthlyAmountInCents!;
```

Because the query filters nulls but TypeScript cannot infer that, replace these with a local guard:

```ts
if (student.monthlyDueDay === null || student.monthlyAmountInCents === null) continue;
```

Then use the narrowed values. This removes two existing lint warnings without changing behavior.

**Verify**: `pnpm lint` → exits 0; the two `fee-generation.service.ts` non-null warnings should be gone. Other pre-existing warnings may remain.

### Step 4: Run full verification

Run the full commands after targeted tests pass.

**Verify**:

- `pnpm typecheck` → exits 0.
- `pnpm test` → exits 0.

## Test plan

- New file: `apps/api/src/monthly-fees/fee-generation.service.spec.ts`.
- Test cases:
  - catch-up creates after due day;
  - cron mode does not create after due day;
  - existing fees are idempotently skipped;
  - ownerless academies are skipped.
- Use existing monthly-fee tests as style references, especially `apps/api/src/monthly-fees/monthly-fee-lifecycle.spec.ts`.

## Done criteria

All must hold:

- [ ] `catchUp` creates a missing current-month fee even after the due day.
- [ ] Cron generation still creates only within the 5-day look-ahead window and skips past due days.
- [ ] Existing current-month fees are not duplicated.
- [ ] Ownerless academies are still skipped.
- [ ] `fee-generation.service.ts` no longer uses non-null assertions for `monthlyDueDay` / `monthlyAmountInCents`.
- [ ] Targeted fee-generation tests pass.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` exit 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for Plan 016 is updated.

## STOP conditions

Stop and report if:

- Product requirements now say catch-up should generate previous months too; that is a larger billing policy decision.
- The fee-generation service has been rewritten and no longer matches the excerpts.
- Test setup requires a real database instead of a lightweight unit test.
- Fixing this would require changing ADR-0009’s calculated overdue status model.

## Maintenance notes

The daily cron and dashboard catch-up intentionally differ after this plan. Reviewers should check that future refactors keep the distinction explicit; using `null`/magic numbers for mode selection was the original source of ambiguity.
