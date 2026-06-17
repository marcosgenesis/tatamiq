# Plan 024: Show Presença Fora da Turma correctly in the student portal attendance history

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa3aa3..HEAD -- apps/api/src/student-access/student-portal.service.ts apps/api/src/student-access/student-access.service.ts apps/api/src/attendances/attendances.service.ts packages/contracts/src/schemas.ts apps/web/src/features/student-portal/student-attendance-section.tsx apps/web/src/features/student-access/student-drilldown-pages.tsx CONTEXT.md`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `4fa3aa3`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/190

## Why this matters

The domain explicitly distinguishes **Presença Fora da Turma**, and instructor attendance rosters already calculate that flag. Student portal attendance history currently hard-codes `isOutOfGroup: false` for every row, hiding information that should be visible consistently. This plan reuses the existing out-of-group convention for student-facing attendance history.

## Current state

Relevant files:

- `CONTEXT.md` — defines **Presença Fora da Turma** and says it must be distinguishable.
- `apps/api/src/attendances/attendances.service.ts` — instructor roster calculates out-of-group attendance.
- `apps/api/src/student-access/student-portal.service.ts` — student portal attendance history hard-codes the flag.
- `packages/contracts/src/schemas.ts` — student attendance response already includes an `isOutOfGroup` field if contract has not drifted.
- Web student attendance components — may already render the flag; verify.

Current excerpts:

```md
<!-- CONTEXT.md:286 -->
- Uma **Presença Fora da Turma** é permitida e deve ser distinguível de uma presença em turma vinculada
```

```ts
// apps/api/src/attendances/attendances.service.ts:102
attendance: toAttendanceDto(att, studentName, true),
```

```ts
// apps/api/src/attendances/attendances.service.ts:152
const isOutOfGroup = await this.checkOutOfGroup(
  organizationId,
  session.classGroupId,
  input.studentId,
);
```

```ts
// apps/api/src/student-access/student-portal.service.ts:182-202
async attendanceHistory(studentId: string): Promise<StudentAttendancesResponse> {
  // ... joins attendances, classSessions, classGroups ...
  return {
    attendances: rows.map((r) => ({
      id: r.attendance.id,
      classGroupName: r.classGroupName,
      source: r.attendance.source as "qr" | "manual",
      isOutOfGroup: false,
```

Existing convention to match: `AttendancesService.checkOutOfGroup` checks for an active `student_class_groups` link with matching `organizationId`, `classGroupId`, `studentId`, and `activeUntil IS NULL`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Targeted API tests | `pnpm --filter @tatamiq/api test -- src/student-access` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0; existing warnings may remain |
| Full tests | `pnpm test` | exit 0 |

## Scope

**In scope**:

- `apps/api/src/student-access/student-portal.service.ts`
- `apps/api/src/student-access/student-portal.service.spec.ts` (create if needed)
- `apps/web/src/features/student-portal/student-attendance-section.tsx` only if it does not render the flag already
- `apps/web/src/features/student-access/student-drilldown-pages.tsx` only if it does not render the flag already

**Out of scope**:

- Do not change attendance creation rules.
- Do not change whether out-of-group attendance counts for graduation eligibility.
- Do not redesign student portal attendance UI.
- Do not change instructor roster behavior.

## Git workflow

- Branch: `advisor/024-student-portal-out-of-group-attendance`
- Commit message style: Conventional Commits, e.g. `fix(api): expose out-of-group attendance in student portal`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Select class group IDs in student attendance history

In `apps/api/src/student-access/student-portal.service.ts`, update the `attendanceHistory` query to include `classSessions.classGroupId` in the selected row shape.

Current select has `attendance` and `classGroupName`. Add:

```ts
classGroupId: classSessions.classGroupId,
```

**Verify**: `pnpm typecheck` → exits 0 after the next steps complete.

### Step 2: Compute active class-group memberships once

Before mapping attendance rows, query `studentClassGroups` for the student’s active links:

- `studentClassGroups.studentId === studentId`
- `activeUntil IS NULL`

Build a `Set<string>` of active class group IDs. For each attendance row, set:

```ts
isOutOfGroup: !activeClassGroupIds.has(r.classGroupId)
```

This matches the current instructor convention, which checks active membership at query time. Do not attempt historical membership reconstruction in this plan; that would require a product decision about whether `activeFrom/activeUntil` should be evaluated against attendance time.

**Verify**: `pnpm typecheck` → exits 0.

### Step 3: Add a focused service test

Create `apps/api/src/student-access/student-portal.service.spec.ts` if no suitable file exists.

Test at least:

- Attendance in an active linked class group returns `isOutOfGroup: false`.
- Attendance in an unlinked class group returns `isOutOfGroup: true`.

Use a lightweight mocked Drizzle chain similar to other API service specs. If mocking the full query builder becomes too large, extract a pure helper such as:

```ts
export function projectStudentAttendanceHistory(rows, activeClassGroupIds)
```

and test that helper, while keeping DB query changes straightforward.

**Verify**: `pnpm --filter @tatamiq/api test -- src/student-access/student-portal.service.spec.ts` → exits 0.

### Step 4: Ensure the web renders the flag

Inspect student attendance UI files. If the UI already displays a badge/text for `isOutOfGroup`, do not change it. If it does not, add a small unobtrusive label such as `Fora da turma` next to the class group/status in:

- `apps/web/src/features/student-portal/student-attendance-section.tsx`, or
- `apps/web/src/features/student-access/student-drilldown-pages.tsx`, depending on where attendance history is rendered.

Keep styling consistent with existing badges. Do not redesign the page.

**Verify**: `pnpm --filter @tatamiq/web test` → exits 0; then `pnpm typecheck` → exits 0.

### Step 5: Run full verification

Run:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

All must exit 0.

## Test plan

- Add API service or pure projection tests for out-of-group attendance projection.
- Web typecheck confirms the UI consumes the existing contract field correctly.
- Full test suite must pass.

## Done criteria

All must hold:

- [ ] Student portal attendance history returns `isOutOfGroup: true` for attendance outside the student’s active class groups.
- [ ] Attendance inside active class groups still returns `false`.
- [ ] UI displays the flag if it was previously hidden.
- [ ] Targeted student-portal tests pass.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` exit 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for Plan 024 is updated.

## STOP conditions

Stop and report if:

- The contract no longer includes `isOutOfGroup` and adding it would require OpenAPI/client regeneration beyond this plan.
- Product owners want historical membership-at-attendance-time semantics instead of current active membership semantics.
- Student attendance UI has moved and cannot be found quickly.
- Mocking the service requires broad rewrites unrelated to the projection.

## Maintenance notes

This plan intentionally matches the current instructor roster semantics. If Tatamiq later needs historically precise out-of-group flags, implement that as a separate plan using `activeFrom`/`activeUntil` and attendance timestamps.
