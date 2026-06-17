# Plan 023: Record failed platform-admin audited action attempts

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa3aa3..HEAD -- apps/api/src/platform/platform-audited-action.service.ts apps/api/src/platform/platform-audited-action.service.spec.ts apps/api/src/platform/audit.service.ts apps/api/src/platform/audit.service.spec.ts apps/api/src/platform/platform.controller.ts packages/database/src/schema.ts CONTEXT.md`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `4fa3aa3`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/189

## Why this matters

The domain defines **Auditoria Administrativa** as recording the result of sensitive platform actions. The database and `AuditService` already support `result: "failure"`, but `PlatformAuditedActionService` only writes after a command succeeds. Failed attempts to ban/delete/provision/transfer/access sensitive files therefore leave no administrative audit trail. This plan records failure audit entries while rethrowing the original error.

## Current state

Relevant files:

- `CONTEXT.md` — defines **Auditoria Administrativa** with a result field.
- `apps/api/src/platform/audit.service.ts` — supports `result?: "success" | "failure"` and defaults to success.
- `apps/api/src/platform/platform-audited-action.service.ts` — wraps sensitive platform commands but writes only successful audits.
- `apps/api/src/platform/platform-audited-action.service.spec.ts` — existing tests for result-derived descriptors.
- `packages/database/src/schema.ts` — `admin_audit_logs.result` exists with default success.

Current excerpts:

```md
<!-- CONTEXT.md:27-28 -->
**Auditoria Administrativa**:
Registro das ações sensíveis executadas por **Administradores da Plataforma** fora do **Suporte Assistido**, incluindo autor, alvo, ação, resultado, timestamp, motivo opcional e acessos a arquivos privados sensíveis, sem persistir payload completo na V1.
```

```ts
// apps/api/src/platform/audit.service.ts:30
result?: "success" | "failure";
```

```ts
// apps/api/src/platform/audit.service.ts:73
result: entry.result ?? "success",
```

```ts
// apps/api/src/platform/platform-audited-action.service.ts:46-60
private async writeSuccessfulAudit<T>(
  adminUserId: string,
  resultPromise: Promise<T>,
  audit: AuditDescriptor<T>,
): Promise<T> {
  const result = await resultPromise;
  await this.auditService.write({
    ...audit,
    adminUserId,
    targetId: typeof audit.targetId === "function" ? audit.targetId(result) : audit.targetId,
```

Existing convention to match: platform audit tests use fake `AuditService.write` mocks and inspect inserted values (`apps/api/src/platform/audit.service.spec.ts`, `apps/api/src/platform/platform-audited-action.service.spec.ts`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Targeted platform tests | `pnpm --filter @tatamiq/api test -- src/platform/platform-audited-action.service.spec.ts src/platform/audit.service.spec.ts` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0; existing warnings may remain |
| Full tests | `pnpm test` | exit 0 |

## Scope

**In scope**:

- `apps/api/src/platform/platform-audited-action.service.ts`
- `apps/api/src/platform/platform-audited-action.service.spec.ts`
- `apps/api/src/platform/audit.service.ts` only if type definitions need a small extension
- `apps/api/src/platform/audit.service.spec.ts` only if expectations need updates

**Out of scope**:

- Do not change database schema; `result` already exists.
- Do not persist full request/response payloads.
- Do not change the public audit list response shape unless unavoidable.
- Do not add failure auditing to non-platform academy owner actions in this plan.

## Git workflow

- Branch: `advisor/023-failed-platform-audit-attempts`
- Commit message style: Conventional Commits, e.g. `fix(api): audit failed platform admin actions`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Refactor the audit wrapper around success and failure

In `apps/api/src/platform/platform-audited-action.service.ts`, replace `writeSuccessfulAudit` with a method that:

1. Awaits the command.
2. On success, writes exactly the same success audit as today.
3. On failure, writes an audit entry with `result: "failure"`, then rethrows the original error.

Failure entries cannot evaluate descriptor functions that require a successful result. For failure:

- If `targetId`, `academyId`, `reason`, or `metadata` is a static value, include it.
- If any descriptor field is a function of the result, omit that field for failure or include only safe static fallback metadata.
- Add safe error metadata such as `{ errorName, errorMessage }` only if it does not include request payloads or secrets. Prefer generic error class/message already thrown by services.

Do not swallow errors. The API response behavior must remain unchanged except for the audit side effect.

**Verify**: `pnpm typecheck` → exits 0.

### Step 2: Ensure failure audit write cannot mask the original command error unnecessarily

If `auditService.write` fails while writing the failure audit, the original command error should remain the primary error when practical. Suggested approach:

```ts
try {
  await this.auditService.write(failureEntry);
} catch {
  // Do not hide the original command failure.
}
throw error;
```

For success audits, keep current behavior: if audit writing fails after a successful sensitive command, surfacing that failure may still be appropriate because the audit trail is part of the command contract.

**Verify**: targeted tests in Step 3 pass.

### Step 3: Add regression tests

In `apps/api/src/platform/platform-audited-action.service.spec.ts`, add tests for:

- `run` writes a failure entry when the command rejects, then rethrows the original error.
- `runForImpersonatedAdmin` writes a failure entry with the real admin user ID when the command rejects.
- Static target/reason/metadata are preserved on failure.
- Result-derived target/academy/metadata functions are not called on failure.
- If writing the failure audit rejects, the original command error is rethrown.

Keep existing success tests unchanged.

**Verify**: `pnpm --filter @tatamiq/api test -- src/platform/platform-audited-action.service.spec.ts` → exits 0.

### Step 4: Run platform audit service tests

Run the audit service tests to confirm explicit `failure` support still behaves as expected.

**Verify**: `pnpm --filter @tatamiq/api test -- src/platform/audit.service.spec.ts` → exits 0.

### Step 5: Run full verification

Run:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`

All must exit 0.

## Test plan

- Add focused unit coverage in `platform-audited-action.service.spec.ts`.
- Re-run `audit.service.spec.ts` to ensure persistence shape remains unchanged.
- Full API/unit suite must pass.

## Done criteria

All must hold:

- [ ] Successful audited actions still write success entries as before.
- [ ] Failed audited actions write `result: "failure"` entries.
- [ ] Failed audited actions rethrow the original error.
- [ ] Result-derived descriptor functions are not called on failure.
- [ ] Failure audit metadata contains no request payloads or secrets.
- [ ] Targeted platform tests pass.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` exit 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for Plan 023 is updated.

## STOP conditions

Stop and report if:

- A platform audited action relies on result-derived target IDs so heavily that failure entries without target IDs are considered unacceptable by maintainers.
- Error messages may contain sensitive values and there is no safe generic metadata strategy.
- Writing failure audits causes recursive audited actions or provider cycles.
- Tests reveal that API error responses change.

## Maintenance notes

Reviewers should check failure audit entries for usefulness and safety. The goal is traceability of failed sensitive attempts, not forensic payload capture; the domain explicitly says not to persist full payloads in V1.
