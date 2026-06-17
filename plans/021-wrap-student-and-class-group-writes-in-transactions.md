# Plan 021: Wrap student and class-group multi-write flows in transactions

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa3aa3..HEAD -- apps/api/src/students/students.service.ts apps/api/src/students/students-validation.spec.ts apps/api/src/class-groups/class-groups.service.ts apps/api/src/class-groups/class-group-rules.spec.ts apps/api/src/monthly-fees/monthly-fee-lifecycle.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/020-enforce-inactive-student-read-only-lifecycle.md
- **Category**: tech-debt
- **Planned at**: commit `4fa3aa3`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/187

## Why this matters

Student creation/update and class-group creation/update each perform several related writes. If a later write fails, the current code can leave partial data: a student without the intended guardian, or a class group without schedules/tags/student links. Monthly fee lifecycle code already uses transactions for comparable multi-write state changes. This plan brings those critical write flows up to the same reliability standard.

## Current state

Relevant files:

- `apps/api/src/students/students.service.ts` — creates/updates students and guardians with separate writes.
- `apps/api/src/class-groups/class-groups.service.ts` — creates/updates class group rows plus schedules/tags/student links with separate writes.
- `apps/api/src/monthly-fees/monthly-fee-lifecycle.ts` — exemplar transaction style already used in the repo.

Current excerpts:

```ts
// apps/api/src/students/students.service.ts:99-118
await this.db.insert(students).values({
  id: studentId,
  organizationId,
  name: input.name.trim(),
  // ...
});

if (input.guardian) {
  await this.insertGuardian(studentId, input.guardian);
}
```

```ts
// apps/api/src/class-groups/class-groups.service.ts:55-68
await this.db.insert(classGroups).values({
  id,
  organizationId,
  name: normalized.name.trim(),
  // ...
});

await this.replaceSchedules(organizationId, id, normalized.schedules);
await this.replaceTags(organizationId, id, normalized.tags);
await this.replaceStudentLinks(organizationId, id, normalized.studentIds ?? []);
```

```ts
// apps/api/src/class-groups/class-groups.service.ts:102-104
await this.replaceSchedules(organizationId, id, normalized.schedules);
await this.replaceTags(organizationId, id, normalized.tags);
await this.replaceStudentLinks(organizationId, id, normalized.studentIds ?? []);
```

```ts
// apps/api/src/monthly-fees/monthly-fee-lifecycle.ts:38
await this.db.transaction(async (tx) => {
  const student = await this.findStudent(tx, organizationId, input.studentId);
  validateCanCreateFee(student);
  // related writes happen through tx
});
```

Existing convention to match: transaction type aliases are derived from Drizzle in `monthly-fee-lifecycle.ts`:

```ts
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Targeted API tests | `pnpm --filter @tatamiq/api test -- src/students src/class-groups` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0; existing warnings may remain |
| Full tests | `pnpm test` | exit 0 |

## Scope

**In scope**:

- `apps/api/src/students/students.service.ts`
- `apps/api/src/students/students-validation.spec.ts` or a new `apps/api/src/students/students.service.spec.ts`
- `apps/api/src/class-groups/class-groups.service.ts`
- `apps/api/src/class-groups/class-group-rules.spec.ts` or a new `apps/api/src/class-groups/class-groups.service.spec.ts`

**Out of scope**:

- Do not change public API request/response shapes.
- Do not change validation rules for students/class groups.
- Do not change CSV import transaction behavior; it already uses a transaction.
- Do not change monthly fee lifecycle code except as an exemplar.

## Git workflow

- Branch: `advisor/021-student-classgroup-transactions`
- Commit message style: Conventional Commits, e.g. `fix(api): wrap student and class group writes in transactions`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Prepare transaction-friendly helper types

In both service files, add local type aliases similar to `MonthlyFeeLifecycle`:

```ts
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type ServiceDb = Database | Transaction;
```

Update private helper signatures that perform reads/writes to accept an optional `db: ServiceDb = this.db` parameter where needed.

For `StudentsService`, helpers likely needing `db`:

- `insertGuardian`
- `replaceGuardian`
- possibly `findGuardian`/`guardiansFor` only if called inside a transaction; avoid changing read helpers unnecessarily.

For `ClassGroupsService`, helpers likely needing `db`:

- `replaceSchedules`
- `replaceTags`
- `replaceStudentLinks`
- any helper those call that writes.

**Verify**: `pnpm typecheck` → exits 0 after each service compiles.

### Step 2: Wrap student create/update in transactions

In `StudentsService.create`:

- Keep validation and `assertUniqueEmail` before the transaction if they only read and should fail fast.
- Insert the student and optional guardian inside a single `this.db.transaction(async (tx) => { ... })`.
- Return `this.get(organizationId, studentId)` after the transaction, as today.

In `StudentsService.update`:

- Preserve current behavior but perform the student update and `replaceGuardian` inside one transaction.
- Keep the read/validation before the transaction unless you need the current student row for Plan 020 inactive logic; if so, read once and pass through.

**Verify**: `pnpm --filter @tatamiq/api test -- src/students` → exits 0.

### Step 3: Wrap class-group create/update in transactions

In `ClassGroupsService.create`:

- Insert the `class_groups` row, schedules, tags, and student links through the same transaction object.

In `ClassGroupsService.update`:

- Update the `class_groups` row and replace schedules/tags/student links in one transaction.

Keep `archive` and `reactivate` unchanged unless you discover they already need multi-write behavior; they are single-row updates today.

**Verify**: `pnpm --filter @tatamiq/api test -- src/class-groups` → exits 0.

### Step 4: Add regression tests for rollback behavior where practical

If service-level tests do not already exist, create focused tests with mocked `db.transaction` that prove helpers use `tx` rather than `this.db` for writes.

Minimum acceptable tests:

- Student create with guardian: `db.transaction` is called and guardian insert uses `tx.insert`, not `db.insert`.
- Class group create: `db.transaction` is called and schedules/tags/student links use `tx` writes.

Better tests, if cheap:

- Simulate a failure in guardian/schedule insert and assert outer service rejects. A real DB rollback is best covered by integration/E2E later; do not build a large fake database just for this.

Use existing mock style from monthly fee specs as a pattern.

**Verify**: targeted tests from Steps 2 and 3 pass.

### Step 5: Run full verification

Run:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`

All must exit 0.

## Test plan

- Add service-level tests if no existing service tests cover transaction use.
- Validate no public API response changes by relying on existing API/unit tests.
- Full unit suite must pass.

## Done criteria

All must hold:

- [ ] Student create inserts student and guardian in one transaction.
- [ ] Student update updates student and replaces guardian in one transaction.
- [ ] Class-group create inserts group, schedules, tags, and student links in one transaction.
- [ ] Class-group update updates group and replaces schedules/tags/student links in one transaction.
- [ ] Existing public response shapes remain unchanged.
- [ ] Targeted students/class-groups tests pass.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` exit 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for Plan 021 is updated.

## STOP conditions

Stop and report if:

- Drizzle transaction typing becomes too broad and requires unsafe `any` casts across the services.
- Existing code has been refactored so these flows are already transactional.
- Adding meaningful rollback tests would require a real database integration harness not present in unit tests.
- Transaction wrapping changes visible behavior in a way not covered by this plan.

## Maintenance notes

Reviewers should look for writes that accidentally still call `this.db` inside transaction callbacks. Future multi-write operations should follow the same transaction pattern used here and in `MonthlyFeeLifecycle`.
