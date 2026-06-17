# Plan 020: Enforce inactive Aluno read-only behavior without extending access windows accidentally

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa3aa3..HEAD -- apps/api/src/student-access/student-portal.controller.ts apps/api/src/student-access/student-portal.service.ts apps/api/src/student-access/student-access-rules.ts apps/api/src/student-access/student-access-rules.spec.ts apps/api/src/students/students.service.ts apps/api/src/students/student-rules.ts apps/api/src/students/student-rules.spec.ts CONTEXT.md`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `4fa3aa3`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/186

## Why this matters

The domain model says an inactive **Aluno** keeps read-only access for 12 months: they can consult visible history, but cannot confirm presence, send Pix receipts, or change contact/photo. The API already blocks QR attendance and receipt submission through read-only checks, but profile updates still go through. Instructor-side edits can also reset `inactiveAt` for an already-inactive student, extending the 12-month read-only window unintentionally.

## Current state

Relevant files:

- `CONTEXT.md` — domain rule for **Aluno Inativo**.
- `apps/api/src/student-access/student-access-rules.ts` — calculates read-only/blocked state from `status` and `inactiveAt`.
- `apps/api/src/student-access/student-portal.controller.ts` — blocks receipt submission when read-only, but not profile update.
- `apps/api/src/student-access/student-portal.service.ts` — updates student phone/email and writes audit rows.
- `apps/api/src/students/students.service.ts` — updates/inactivates/reactivates students and sets `inactiveAt`.

Current excerpts:

```md
<!-- CONTEXT.md:107-108 -->
**Aluno Inativo**:
**Aluno** mantido no histórico, removido de chamadas e da geração de mensalidades futuras, preservando mensalidades já existentes e acesso somente leitura por 12 meses; nesse período pode consultar histórico e dados visíveis, mas não confirma presença por QR, não envia comprovante Pix, não altera contato/foto e não executa ações operacionais de aluno; ao ser reativado, preserva o histórico e retoma a geração de mensalidades futuras.
```

```ts
// apps/api/src/student-access/student-portal.controller.ts:87 and 107
assertStudentCanSubmitReceipts(meData.student.readOnly);
```

```ts
// apps/api/src/student-access/student-portal.controller.ts:157-162
async updateStudentProfile(
  @ActorId() actorId: string,
  @ZodBody(UpdateStudentProfileDto) body: UpdateStudentProfileDto,
): Promise<void> {
  const meData = await this.studentAccessService.me(actorId);
  return this.portalService.updateProfile(meData.student.id, actorId, body);
}
```

```ts
// apps/api/src/students/students.service.ts:151
inactiveAt: status === "inactive" ? now : status === "active" ? null : undefined,
```

```ts
// apps/api/src/students/students.service.ts:171
.set({ status: "inactive", inactiveAt: new Date(), updatedAt: new Date() })
```

Existing convention to match: pure domain rules are tested in small `*.spec.ts` files (`apps/api/src/student-access/student-access-rules.spec.ts`, `apps/api/src/students/student-rules.ts`). Service/controller errors use Portuguese `ForbiddenException` or `BadRequestException` messages.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Targeted API tests | `pnpm --filter @tatamiq/api test -- src/student-access/student-access-rules.spec.ts src/students/student-rules.spec.ts` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0; existing warnings may remain |
| Full tests | `pnpm test` | exit 0 |

## Scope

**In scope**:

- `apps/api/src/student-access/student-portal.controller.ts`
- `apps/api/src/student-access/student-portal.service.ts` only if service-level guard is preferred
- `apps/api/src/student-access/student-access-rules.ts`
- `apps/api/src/student-access/student-access-rules.spec.ts`
- `apps/api/src/students/students.service.ts`
- `apps/api/src/students/student-rules.ts`
- `apps/api/src/students/student-rules.spec.ts` (create if absent)

**Out of scope**:

- Do not change the 12-month read-only duration.
- Do not revoke student access automatically on inactivation.
- Do not add photo upload behavior.
- Do not change instructor ability to edit inactive student records, except preserving the original `inactiveAt` when the student is already inactive.

## Git workflow

- Branch: `advisor/020-inactive-student-read-only`
- Commit message style: Conventional Commits, e.g. `fix(api): enforce inactive student read-only access`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add a reusable student operation guard

In `apps/api/src/student-access/student-access-rules.ts`, add a small exported helper that describes whether a student portal write is allowed. Suggested shape:

```ts
export function assertStudentPortalWriteAllowed(readOnly: boolean, message: string): void
```

or a pure boolean helper such as:

```ts
export function canStudentPortalWrite(readOnly: boolean): boolean {
  return !readOnly;
}
```

If you use an exception-throwing helper, keep HTTP exceptions in controller/service code rather than pure domain rules if that better matches existing style.

Add tests proving:

- active student state is not read-only;
- inactive student within 12 months is read-only but not blocked;
- inactive student after 12 months is blocked;
- read-only state means profile writes are not allowed.

**Verify**: `pnpm --filter @tatamiq/api test -- src/student-access/student-access-rules.spec.ts` → exits 0.

### Step 2: Block profile updates for read-only students

In `apps/api/src/student-access/student-portal.controller.ts`, update `updateStudentProfile` so it checks `meData.student.readOnly` before calling `portalService.updateProfile`.

Target behavior:

- If `readOnly` is true, throw `ForbiddenException("Aluno inativo não pode alterar contato.")` or similarly clear Portuguese message.
- Active students keep existing behavior.

You may reuse/rename the existing `assertStudentCanSubmitReceipts` helper into a generic `assertStudentCanWrite` helper if that avoids duplication. Keep receipt-specific error messages where appropriate.

**Verify**: `pnpm typecheck` → exits 0.

### Step 3: Preserve `inactiveAt` when editing an already inactive student

In `apps/api/src/students/students.service.ts`, the generic `update` path currently sets `inactiveAt` to `now` whenever `input.status === "inactive"`. That resets the 12-month read-only window on every edit of an inactive student.

Change the update logic so:

- active → inactive sets `inactiveAt` to `now`;
- inactive → inactive preserves the existing `inactiveAt` value;
- inactive → active clears `inactiveAt`;
- active → active keeps it `null`.

A clean way is to add a pure helper in `apps/api/src/students/student-rules.ts`:

```ts
export function nextInactiveAt(input: {
  currentStatus: string;
  currentInactiveAt: Date | null;
  nextStatus: string;
  now: Date;
}): Date | null
```

Then test it in a new `apps/api/src/students/student-rules.spec.ts` or an existing spec file.

**Verify**: `pnpm --filter @tatamiq/api test -- src/students/student-rules.spec.ts` → exits 0.

### Step 4: Make inactivate idempotent

In `StudentsService.inactivate`, preserve `inactiveAt` if the student is already inactive. Today it always sets a fresh date. Load the student first (already done via `findStudent`) and use the same helper from Step 3.

Target behavior:

- If current status is active, set `inactiveAt = now`.
- If current status is inactive, keep existing `inactiveAt`.

**Verify**: targeted tests from Step 3 pass.

### Step 5: Run full verification

Run:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`

All must exit 0.

## Test plan

- Add/extend pure tests in `student-access-rules.spec.ts` for read-only/blocked behavior.
- Add `student-rules.spec.ts` coverage for inactive timestamp transitions.
- If service tests exist for `StudentsService`, add direct tests there too. If not, pure helper tests are acceptable for this bounded lifecycle bug.

## Done criteria

All must hold:

- [ ] Student portal profile update rejects read-only inactive students.
- [ ] Active students can still update phone/email.
- [ ] Editing an already inactive student does not reset `inactiveAt`.
- [ ] Calling inactivate on an already inactive student does not reset `inactiveAt`.
- [ ] Reactivating a student still clears `inactiveAt`.
- [ ] Targeted student access/rules tests pass.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` exit 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for Plan 020 is updated.

## STOP conditions

Stop and report if:

- Product/domain docs have changed and inactive students are no longer read-only.
- The student portal profile update has moved to a different controller/service and cannot be found.
- Fixing `inactiveAt` requires a database migration or backfill for already-reset values.
- Existing tests assert that inactive edit resets `inactiveAt`; that would be a product decision conflict.

## Maintenance notes

The domain distinction is important: inactive students keep read-only access for 12 months, but they cannot perform write actions. Future student portal write endpoints should explicitly check read-only state before mutating data.
