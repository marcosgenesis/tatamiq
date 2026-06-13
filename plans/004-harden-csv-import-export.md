# Plan 004: Harden CSV import confirmation and fix attendance CSV export shape

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat b113c3a..HEAD -- apps/api/src/csv/csv.service.ts apps/api/src/csv/import-preview-store.ts apps/api/src/csv/csv.service.spec.ts apps/api/src/students/students.service.ts packages/database/src/schema.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/003-characterize-csv-import-export.md`
- **Category**: bug
- **Planned at**: commit `b113c3a`, 2026-06-13

## Why this matters

CSV import is a bulk data mutation path for Alunos and Responsáveis. It currently writes rows one by one without a transaction and treats duplicate emails as warnings even though normal student creation rejects them. Attendance export also emits a malformed CSV row with more data cells than headers. This plan makes the mutation path safer and fixes the export schema, using the characterization tests from Plan 003 as a guardrail.

## Current state

Relevant files:

- `apps/api/src/csv/csv.service.ts` — import preview/confirmation and CSV exports.
- `apps/api/src/csv/csv.service.spec.ts` — must exist from Plan 003 and characterize current behavior.
- `apps/api/src/students/students.service.ts` — normal student create/update duplicate email behavior.
- `packages/database/src/schema.ts` — table definitions for `students`, `studentGuardians`, and indexes.

Current excerpts:

```ts
// apps/api/src/csv/csv.service.ts:123-125
if (email && emailSet.has(email.toLowerCase())) {
  warnings.push("Email já cadastrado em outro aluno.");
}
```

```ts
// apps/api/src/csv/csv.service.ts:174-227
this.previewStore.delete(previewToken);

const academyBelts = await this.db
  .select()
  .from(belts)
  .where(eq(belts.organizationId, organizationId));
// ...
for (const row of preview.rows) {
  if (row.errors.length > 0) {
    skipped++;
    continue;
  }
  // ... direct insert into students and optionally studentGuardians
}

return { imported, skipped };
```

```ts
// apps/api/src/csv/csv.service.ts:296-305
const header = "Data,Aluno,Turma,Fonte,Invalidada";
const csvLines = rows.map((r) =>
  [
    r.attendance.createdAt.toISOString().split("T")[0],
    escapeCsv(r.studentName),
    escapeCsv(r.classGroupName),
    r.attendance.source,
    "",
    r.attendance.invalidatedAt ? "Sim" : "Não",
  ].join(","),
);
```

```ts
// apps/api/src/students/students.service.ts:187-209
private async assertUniqueEmail(
  organizationId: string,
  email: string | null | undefined,
  ignoreStudentId?: string,
) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return;
  // ... queries students and throws BadRequestException when existing
}
```

Repo conventions to match:

- API services use Nest exceptions such as `BadRequestException` and `NotFoundException` for domain/API errors.
- Drizzle transactions are used in lifecycle services for multi-write operations; see `apps/api/src/monthly-fees/monthly-fee-lifecycle.ts`.
- Tests use Vitest and direct service tests with mocked dependencies.
- Domain term is **Aluno**, not generic member/user, in user-facing messages.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Focused CSV tests | `pnpm --filter @tatamiq/api test -- csv` | exit 0, updated CSV expectations pass |
| API tests | `pnpm --filter @tatamiq/api test` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |

## Scope

**In scope**:

- `apps/api/src/csv/csv.service.ts`
- `apps/api/src/csv/csv.service.spec.ts`

**Out of scope**:

- Do not change API route paths or response DTO shapes except existing CSV content.
- Do not change database schema or add indexes in this plan.
- Do not route CSV import through `StudentsService` if doing so creates circular module dependencies; keep the fix local to `CsvService`.
- Do not introduce streaming CSV parsing or large-file upload changes.
- Do not change monthly fees CSV export unless a test proves a directly related bug.

## Git workflow

- Branch: `advisor/004-harden-csv-import-export`
- Commit message: `fix(api): harden csv import and export`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Update tests from characterization to desired behavior

Modify `apps/api/src/csv/csv.service.spec.ts` from Plan 003 so desired behavior is explicit:

- duplicate email during `previewImport` is an error, not a warning;
- attendance export data rows have exactly the same number of columns as the header;
- confirm import is atomic: if inserting a guardian fails after a student insert, the transaction rejects and no partial committed state is reported by the service test.

For the atomicity test, mock `db.transaction(async (tx) => ...)` and assert the service uses the transaction object (`tx`) for inserts. You do not need to simulate a real database rollback; verify that multi-write work is inside a transaction and that an error propagates.

**Verify**: `pnpm --filter @tatamiq/api test -- csv` → expected to fail before implementation because behavior has not been changed yet.

### Step 2: Make duplicate emails import-blocking

In `apps/api/src/csv/csv.service.ts`, change duplicate email preview behavior from warning to error:

- Keep the existing query that builds `emailSet` for current students.
- Also track duplicate emails within the uploaded CSV itself. If the same non-empty email appears in two valid-looking CSV rows, both should be treated as errors or at least the later duplicate should be an error. Prefer an error message like `Email duplicado no arquivo CSV.` for within-file duplicates.
- Existing student email conflict should push an error like `Email já cadastrado em outro aluno.` rather than a warning.

Be careful to normalize with `trim().toLowerCase()` consistently.

**Verify**: `pnpm --filter @tatamiq/api test -- csv` → duplicate-email tests pass; other tests may still fail until later steps.

### Step 3: Wrap confirmImport in a transaction

In `confirmImport`, wrap the loop that inserts `students` and `studentGuardians` in `this.db.transaction(async (tx) => { ... })`.

Requirements:

- Use `tx` for every database read/write inside the confirmation transaction where possible.
- Delete the preview token only after the transaction succeeds. If the transaction throws, leave the preview token available so the user can retry after a transient failure.
- Preserve the return shape `{ imported, skipped }`.
- Continue skipping rows that already have `row.errors.length > 0`.
- Do not silently catch insert errors; let them propagate so the request fails rather than reporting a partial success.

**Verify**: `pnpm --filter @tatamiq/api test -- csv` → transaction/atomicity tests pass; no CSV tests fail.

### Step 4: Fix attendance CSV row shape

In `exportAttendances`, remove the extra empty string value from the row array so the five headers match five row cells:

Expected data order:

1. Data
2. Aluno
3. Turma
4. Fonte
5. Invalidada

Do not change the header text unless tests prove it is wrong.

**Verify**: `pnpm --filter @tatamiq/api test -- csv` → attendance export test passes with equal header/data column counts.

### Step 5: Run full API and monorepo verification

Run the normal checks.

**Verify**:

- `pnpm --filter @tatamiq/api test` → exit 0.
- `pnpm typecheck` → exit 0.
- `pnpm lint` → exit 0.
- `pnpm test` → exit 0.

## Test plan

Update `apps/api/src/csv/csv.service.spec.ts` to cover:

- duplicate email against existing students is an error;
- duplicate email within the same CSV file is an error;
- attendance export header/data column counts match;
- confirm import uses a transaction for student + guardian inserts;
- confirm import leaves preview available or at least does not delete it before a failed transaction.

Verification:

- `pnpm --filter @tatamiq/api test -- csv`
- `pnpm --filter @tatamiq/api test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`

## Done criteria

- [ ] Duplicate emails in CSV import preview are errors, not warnings.
- [ ] Duplicate emails inside the same uploaded CSV are detected.
- [ ] `confirmImport` wraps multi-row/multi-table inserts in a transaction.
- [ ] Preview token deletion happens after successful confirmation, not before.
- [ ] Attendance export rows have the same number of columns as the header.
- [ ] Focused and full verification commands exit 0.
- [ ] No files outside the in-scope list are modified except `plans/README.md` status.

## STOP conditions

Stop and report if:

- Plan 003 has not been executed and there is no CSV spec file to update.
- Drizzle transaction typing requires a broader database abstraction change.
- Making duplicate emails errors would contradict a current product spec or contract discovered in docs.
- Fixing atomicity requires schema changes or routing through `StudentsService` with circular dependencies.
- Verification fails twice after reasonable local fixes.

## Maintenance notes

CSV import remains an in-memory preview flow, so it is not safe for very large files or multi-process preview storage. That is intentionally deferred. Reviewers should focus on transaction boundaries, preview-token deletion order, and whether duplicate-email messages are clear for instructors.
