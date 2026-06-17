# Plan 019: Preserve America/Sao_Paulo wall times in schedule and class views

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa3aa3..HEAD -- apps/api/src/schedule/schedule-rules.ts apps/api/src/schedule/weekly-agenda-projection.ts apps/api/src/schedule/weekly-agenda-projection.spec.ts apps/api/src/schedule/schedule.service.ts apps/api/src/classes/classes.service.ts apps/api/src/student-access/student-access.service.ts apps/api/src/student-access/student-portal.service.ts apps/web/src/features/schedule/schedule-calendar-layout.ts tests/e2e/schedule-management.spec.ts docs/architecture/technical-stack-v0.md`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: Plan 018 recommended before execution, but not a hard code dependency
- **Category**: bug
- **Planned at**: commit `4fa3aa3`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/185

## Why this matters

Tatamiq V0 is explicitly in the `America/Sao_Paulo` timezone, but recurring class times are encoded as `...Z` UTC timestamps and the web calendar reads them with local `Date#getHours()`. A class configured for 19:30 can render as 16:30 for a Brazil user because 19:30Z is 16:30 in São Paulo. This plan centralizes schedule time conversion so wall-clock class times remain stable across API projections, class start, student portal, and the calendar layout.

## Current state

Relevant files:

- `docs/architecture/technical-stack-v0.md` — documents default V0 timezone.
- `apps/api/src/schedule/schedule-rules.ts` — helper currently composes `scheduledStartAt` as UTC.
- `apps/api/src/schedule/weekly-agenda-projection.ts` — builds schedule occurrence `scheduledStartAt` / `startTime`.
- `apps/api/src/classes/classes.service.ts` — creates recurring `class_sessions.scheduledStartAt`.
- `apps/api/src/student-access/student-access.service.ts` and `apps/api/src/student-access/student-portal.service.ts` — build student-facing upcoming schedule data.
- `apps/web/src/features/schedule/schedule-calendar-layout.ts` — computes calendar position from `new Date(occ.scheduledStartAt).getHours()`.

Current excerpts:

```md
<!-- docs/architecture/technical-stack-v0.md:110 -->
- Default V0 timezone: `America/Sao_Paulo`.
```

```ts
// apps/api/src/schedule/schedule-rules.ts:22-23
export function toScheduledStartAt(date: string, startTime: string): string {
  return `${date}T${startTime}:00.000Z`;
}
```

```ts
// apps/api/src/schedule/weekly-agenda-projection.ts:176-177
scheduledStartAt: toScheduledStartAt(date, row.startTime),
startTime: row.startTime,
```

```ts
// apps/api/src/classes/classes.service.ts:50
const scheduledStartAt = new Date(`${input.scheduledDate}T${schedule.startTime}:00.000Z`);
```

```ts
// apps/web/src/features/schedule/schedule-calendar-layout.ts:24-25
export function localStartMinutes(occ: ScheduleOccurrence): number {
  const d = new Date(occ.scheduledStartAt);
```

Existing convention to match: schedule logic has pure helpers and tests (`apps/api/src/schedule/schedule-rules.spec.ts`, `apps/api/src/schedule/weekly-agenda-projection.spec.ts`). Prefer adding pure date/time helpers with unit tests before touching services.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Targeted API tests | `pnpm --filter @tatamiq/api test -- src/schedule/schedule-rules.spec.ts src/schedule/weekly-agenda-projection.spec.ts` | exit 0 |
| Targeted web tests | `pnpm --filter @tatamiq/web test -- src/features/schedule` | exit 0 or exits 0 with no matching tests |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0; existing warnings may remain |
| Full tests | `pnpm test` | exit 0 |
| E2E schedule | `pnpm test:e2e -- tests/e2e/schedule-management.spec.ts` | exit 0 if local Postgres/browser available |

## Scope

**In scope**:

- `apps/api/src/schedule/schedule-rules.ts`
- `apps/api/src/schedule/schedule-rules.spec.ts` if present, otherwise create it
- `apps/api/src/schedule/weekly-agenda-projection.ts`
- `apps/api/src/schedule/weekly-agenda-projection.spec.ts`
- `apps/api/src/schedule/schedule.service.ts`
- `apps/api/src/classes/classes.service.ts`
- `apps/api/src/student-access/student-access.service.ts`
- `apps/api/src/student-access/student-portal.service.ts`
- `apps/web/src/features/schedule/schedule-calendar-layout.ts`
- `tests/e2e/schedule-management.spec.ts` only for assertions that prove 19:30 renders as 19:30

**Out of scope**:

- Do not migrate stored database timestamps.
- Do not add multi-timezone academy support.
- Do not redesign schedule contracts unless unavoidable.
- Do not change class recurrence rules beyond timezone conversion.

## Git workflow

- Branch: `advisor/019-sao-paulo-schedule-times`
- Commit message style: Conventional Commits, e.g. `fix(schedule): preserve sao paulo class times`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add pure São Paulo date/time helpers and tests

In `apps/api/src/schedule/schedule-rules.ts`, add helpers for V0 timezone handling. Suggested helpers:

- `SAO_PAULO_TIME_ZONE = "America/Sao_Paulo"`
- `toSaoPauloScheduledStartAt(date: string, startTime: string): string`
- `saoPauloDatePart(date: Date): string`
- `saoPauloTimePart(date: Date): string`

For V0, São Paulo is UTC-03 with no daylight saving time. You may implement conversion via `Intl.DateTimeFormat` where possible. If you choose a fixed `-03:00` offset helper, document in a code comment that this matches V0’s São Paulo assumption and should be revisited if multi-timezone/DST support is introduced.

Add tests proving:

- `toSaoPauloScheduledStartAt("2026-05-20", "19:30")` represents 19:30 São Paulo, not 19:30 UTC.
- Formatting the resulting Date with `America/Sao_Paulo` returns `19:30`.
- Date-only helper still returns the expected weekday for existing tests.

**Verify**: `pnpm --filter @tatamiq/api test -- src/schedule/schedule-rules.spec.ts` → exits 0.

### Step 2: Use the helper in weekly/today schedule projections

In `apps/api/src/schedule/weekly-agenda-projection.ts`:

- Replace calls to `toScheduledStartAt(date, row.startTime)` with the new São Paulo-aware helper.
- For ad-hoc rows and persisted class sessions, derive `scheduledDate` and `startTime` using `saoPauloDatePart` and `saoPauloTimePart` instead of `toISOString().slice(...)`.

Update `weekly-agenda-projection.spec.ts` expectations. The important assertion is not the exact UTC instant; it is that `startTime` and rendered São Paulo time match the configured schedule time.

**Verify**: `pnpm --filter @tatamiq/api test -- src/schedule/weekly-agenda-projection.spec.ts` → exits 0.

### Step 3: Use the helper when starting recurring classes

In `apps/api/src/classes/classes.service.ts`, replace:

```ts
new Date(`${input.scheduledDate}T${schedule.startTime}:00.000Z`)
```

with the São Paulo-aware helper from `schedule-rules.ts`:

```ts
const scheduledStartAt = new Date(toSaoPauloScheduledStartAt(input.scheduledDate, schedule.startTime));
```

Add or update class service/rules tests if an existing spec covers recurring start. If no test scaffold exists, rely on schedule projection tests plus E2E schedule flow.

**Verify**: `pnpm --filter @tatamiq/api test -- src/classes` → exits 0.

### Step 4: Update student-facing schedule builders

In both student schedule paths:

- `apps/api/src/student-access/student-access.service.ts`
- `apps/api/src/student-access/student-portal.service.ts`

Replace UTC string composition and `toISOString().slice(11, 16)` time extraction with the São Paulo-aware helpers. Ensure student portal upcoming classes and schedule endpoints show the same local wall times as instructor schedule.

**Verify**: `pnpm typecheck` → exits 0.

### Step 5: Make web calendar positioning use `startTime`

In `apps/web/src/features/schedule/schedule-calendar-layout.ts`, change `localStartMinutes` so it parses `occ.startTime` directly instead of relying on `new Date(occ.scheduledStartAt).getHours()`.

Target shape:

```ts
export function localStartMinutes(occ: ScheduleOccurrence): number {
  const [hours, minutes] = occ.startTime.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}
```

Guard invalid values defensively if needed, but the contract already supplies `startTime`.

**Verify**: `pnpm --filter @tatamiq/web test -- src/features/schedule` → exits 0 or no matching tests with exit 0; then `pnpm typecheck` → exits 0.

### Step 6: Add/adjust E2E assertion if local environment supports it

In `tests/e2e/schedule-management.spec.ts`, add a focused assertion only if it fits the existing flow: a class group schedule set to `19:30` should render as `19:30` in the schedule UI, not `16:30`.

Do not make broad UI rewrites. If E2E cannot run locally, ensure the test code is type-safe and let CI (Plan 018) execute it.

**Verify**: `pnpm test:e2e -- tests/e2e/schedule-management.spec.ts` → exits 0 if local Postgres/browser are available. If not available, state this clearly.

## Test plan

- Unit tests for schedule helpers and weekly agenda projection.
- Web test if a schedule layout test exists; otherwise typecheck covers the pure parser.
- E2E schedule assertion if practical.
- Run full `pnpm test` after targeted tests.

## Done criteria

All must hold:

- [ ] Recurring schedule helper no longer encodes wall time as `HH:mmZ` UTC.
- [ ] API projections derive `scheduledDate` and `startTime` in `America/Sao_Paulo`.
- [ ] Starting a recurring class stores the instant corresponding to the São Paulo wall time.
- [ ] Web calendar layout positions events using `startTime`, not local browser parsing of UTC strings.
- [ ] Targeted schedule tests pass.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` exit 0.
- [ ] E2E schedule test is run or explicitly documented as requiring unavailable local infrastructure.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for Plan 019 is updated.

## STOP conditions

Stop and report if:

- Contract changes are required beyond preserving existing `scheduledStartAt` and `startTime` fields.
- You discover stored production data already relies on the old UTC interpretation and needs a migration/backfill decision.
- Date/time behavior cannot be made deterministic without adding a timezone library dependency.
- E2E failures indicate unrelated schedule regressions that require product/UI changes outside this plan.

## Maintenance notes

This is a high-risk date/time fix. Reviewers should inspect every remaining `toISOString().slice(0, 10)` and `toISOString().slice(11, 16)` in schedule/student schedule code and decide whether it is still correct. Future multi-timezone academy support should replace these V0 São Paulo helpers with a per-academy timezone model.
