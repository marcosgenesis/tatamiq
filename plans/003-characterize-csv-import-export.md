# Plan 003: Add characterization tests for CSV import and export behavior

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat b113c3a..HEAD -- apps/api/src/csv/csv.service.ts apps/api/src/csv/import-preview-store.ts apps/api/src/csv/*.spec.ts apps/api/src/students/students.service.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `b113c3a`, 2026-06-13

## Why this matters

CSV import/export moves production academy data: Alunos, Responsáveis, Presenças, and Mensalidades. The service currently has no direct unit tests, yet the audit found concrete risks in this area. This plan adds characterization tests first, so later behavior changes can be made safely and reviewers can distinguish intentional fixes from accidental CSV format drift.

## Current state

Relevant files:

- `apps/api/src/csv/csv.service.ts` — parses student CSV, stores preview tokens, confirms imports, exports CSVs.
- `apps/api/src/csv/import-preview-store.ts` — in-memory preview store with TTL.
- `apps/api/src/students/students.service.ts` — normal student creation path rejects duplicate emails; CSV import currently does not use it.

Current excerpts:

```ts
// apps/api/src/csv/csv.service.ts:36-41
async previewImport(
  organizationId: string,
  csvContent: string,
): Promise<CsvImportPreviewResponse> {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new BadRequestException("CSV vazio ou sem dados.");
```

```ts
// apps/api/src/csv/csv.service.ts:123-125
if (email && emailSet.has(email.toLowerCase())) {
  warnings.push("Email já cadastrado em outro aluno.");
}
```

```ts
// apps/api/src/csv/csv.service.ts:198-224
const studentId = crypto.randomUUID();
await this.db.insert(students).values({
  id: studentId,
  organizationId,
  name: row.name,
  birthDate: row.birthDate,
  enrollmentDate: row.enrollmentDate,
  status: "active",
  email: row.email || null,
  phone: row.phone || null,
  currentBeltId: belt.id,
  currentDegree: row.degree,
  monthlyAmountInCents: row.monthlyAmount,
  monthlyDueDay: row.monthlyDueDay,
});
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

Repo conventions to match:

- API tests use Vitest and direct service tests with mocked dependencies; see `apps/api/src/monthly-fees/monthly-fees.service.spec.ts` and `apps/api/src/platform/platform.controller.spec.ts`.
- The repo prefers extracting pure projection/rules logic where useful, but this plan should only add tests.
- TypeScript style: double quotes, no semicolons, Biome formatting.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Focused CSV tests | `pnpm --filter @tatamiq/api test -- csv` | exit 0, new CSV tests pass |
| API tests | `pnpm --filter @tatamiq/api test` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |

## Scope

**In scope**:

- `apps/api/src/csv/csv.service.spec.ts` (create)
- `apps/api/src/csv/csv.service.ts` only if absolutely needed to export a pure helper for tests; otherwise do not modify it in this plan.

**Out of scope**:

- Do not fix CSV import/export behavior in this plan. That is Plan 004.
- Do not change API routes or DTO/contracts.
- Do not change database schema.
- Do not add e2e tests.

## Git workflow

- Branch: `advisor/003-characterize-csv-import-export`
- Commit message: `test(api): characterize csv import and export`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Create a lightweight CsvService test harness

Create `apps/api/src/csv/csv.service.spec.ts`. Instantiate `CsvService` directly with:

- a mocked Drizzle-like `db` object supporting the chained calls used by the methods under test;
- a real `ImportPreviewStore` for preview/confirm tests where useful.

Keep the mock narrow. It only needs to support the calls in the specific tests below. If mocking Drizzle chains becomes too brittle, extract pure CSV parsing/formatting helpers from `csv.service.ts` only if the extraction is minimal and behavior-preserving.

**Verify**: `pnpm --filter @tatamiq/api test -- csv` → exits 0 or fails only because no tests are implemented yet; it must not fail to compile.

### Step 2: Characterize student import preview behavior

Add tests for `previewImport` covering current behavior:

1. valid row with required columns returns one valid line and a preview token;
2. minor student without guardian name/phone is an error;
3. unknown belt name is an error when belts do not include that name;
4. duplicate email currently appears as a warning, not an error.

Use seeded mock data for `belts` and existing students. Do not assert exact UUID values; assert token is a non-empty string.

**Verify**: `pnpm --filter @tatamiq/api test -- csv` → all CSV tests pass.

### Step 3: Characterize current attendance export shape

Add a test for `exportAttendances` that exposes the current column mismatch: parse the returned CSV into lines, split header and first data row on commas for simple values without commas, and assert:

- header has 5 columns: `Data`, `Aluno`, `Turma`, `Fonte`, `Invalidada`;
- current data row has 6 columns because of the empty extra value.

Name the test clearly as a characterization of current buggy behavior, e.g. `characterizes current attendance export extra empty column before invalidation flag`.

**Verify**: `pnpm --filter @tatamiq/api test -- csv` → all CSV tests pass.

### Step 4: Characterize confirmImport direct insert behavior

Add a test for `confirmImport` that:

- saves a preview with one valid row in `ImportPreviewStore`;
- mocks available belts including default adult position 0;
- verifies the service calls `db.insert(students).values(...)` and, when guardian fields exist, `db.insert(studentGuardians).values(...)`.

Do not assert every generated UUID. Assert important persisted fields: `organizationId`, `name`, `email`, `currentBeltId`, guardian `name`, guardian `phone`.

**Verify**: `pnpm --filter @tatamiq/api test -- csv` → all CSV tests pass.

## Test plan

New tests in `apps/api/src/csv/csv.service.spec.ts`:

- preview happy path;
- minor guardian validation;
- unknown belt validation;
- duplicate email warning behavior;
- attendance export current extra-column behavior;
- confirm import direct insert behavior.

Final verification:

- `pnpm --filter @tatamiq/api test -- csv`
- `pnpm --filter @tatamiq/api test`
- `pnpm typecheck`
- `pnpm lint`

## Done criteria

- [ ] `apps/api/src/csv/csv.service.spec.ts` exists with the tests listed above.
- [ ] No intentional CSV behavior changes are included in this plan.
- [ ] `pnpm --filter @tatamiq/api test -- csv` exits 0.
- [ ] `pnpm --filter @tatamiq/api test`, `pnpm typecheck`, and `pnpm lint` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Testing `CsvService` requires a real database or major test infrastructure changes.
- The live CSV code has already been fixed, so the characterization expectations no longer match.
- You need to touch contracts, controllers, or schema to write these tests.
- Verification fails twice after reasonable local fixes.

## Maintenance notes

These tests intentionally lock in some bad behavior so Plan 004 can change it with a clear red/green diff. Reviewers should accept the extra-column characterization only as a temporary guard, not as desired long-term behavior.
