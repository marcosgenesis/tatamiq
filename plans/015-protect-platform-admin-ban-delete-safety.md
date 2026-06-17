# Plan 015: Protect platform administrators from unsafe ban and delete paths

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa3aa3..HEAD -- apps/api/src/platform/platform-admin.service.ts apps/api/src/platform/platform-admin.service.spec.ts apps/api/src/platform/platform-user.service.ts apps/api/src/platform/user-deletion.service.ts apps/api/src/platform/platform.controller.spec.ts apps/web/src/features/platform/platform-user-detail-page.tsx`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `4fa3aa3`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/181

## Why this matters

The administrator removal flow protects Tatamiq from removing the last active **Administrador da Plataforma**, but the generic user management paths can still ban or delete the same account. That can lock maintainers out of the **Administração da Plataforma** or remove configured administrators in a way the dedicated admin UI forbids. This plan makes the user ban/delete paths respect the same safety invariant as administrator removal.

## Current state

Relevant files:

- `apps/api/src/platform/platform-admin.service.ts` — contains `isPlatformAdminUser` and the safe `removeAdministrator` flow.
- `apps/api/src/platform/platform-user.service.ts` — generic user ban/unban/session revocation paths.
- `apps/api/src/platform/user-deletion.service.ts` — generic destructive user deletion path.
- `apps/web/src/features/platform/platform-user-detail-page.tsx` — exposes ban/delete controls on every platform user detail page.

Current excerpts:

```ts
// apps/api/src/platform/platform-admin.service.ts:152-181
async removeAdministrator(id: string) {
  const db = this.dbRequired;
  const [target] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  if (!target || !isPlatformAdminUser(target, platformAdminUserIds())) {
    throw new BadRequestException("Administrador da Plataforma não encontrado.");
  }
  // ... counts activeAdminCount and rejects last/configured admin ...
  await db.update(user).set({ role: null, updatedAt: new Date() }).where(eq(user.id, id));
  await db.delete(session).where(eq(session.userId, id));
}
```

```ts
// apps/api/src/platform/user-deletion.service.ts:79-91
if (input.mode === "definitive") {
  await this.db.delete(user).where(eq(user.id, id));
  return { success: true };
}

await this.db.delete(account).where(eq(account.userId, id));
await this.db
  .update(user)
  .set({
    name: "Usuário excluído",
    email: `deleted+${id}@tatamiq.local`,
    image: null,
    role: null,
```

```ts
// apps/api/src/platform/platform-user.service.ts:94-102
async banUser(id: string, reason?: string) {
  const [row] = await this.db.select().from(user).where(eq(user.id, id)).limit(1);
  if (!row) throw new NotFoundException("Usuário não encontrado.");

  await this.db
    .update(user)
    .set({ banned: true, banReason: reason ?? null })
    .where(eq(user.id, id));
```

```md
<!-- CONTEXT.md:248 -->
- Remover o papel de **Administrador da Plataforma** não exclui a conta nem remove acessos de academia ou aluno, mas deve revogar sessões por segurança e nunca pode remover o último administrador ativo
```

Existing convention to match: platform service tests use Vitest with mock Drizzle chains (`apps/api/src/platform/platform-admin.service.spec.ts`, `apps/api/src/platform/platform.controller.spec.ts`). Keep errors as `BadRequestException`/`NotFoundException` with Portuguese messages.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Targeted API tests | `pnpm --filter @tatamiq/api test -- src/platform/platform-admin.service.spec.ts src/platform/platform.controller.spec.ts` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0; existing warnings may remain |
| Full tests | `pnpm test` | exit 0 |

## Scope

**In scope**:

- `apps/api/src/platform/platform-admin.service.ts`
- `apps/api/src/platform/platform-admin.service.spec.ts`
- `apps/api/src/platform/platform-user.service.ts`
- `apps/api/src/platform/user-deletion.service.ts`
- `apps/api/src/platform/platform.controller.spec.ts` if controller mocks need updates
- `apps/web/src/features/platform/platform-user-detail-page.tsx` for defensive UI disabling/warnings only

**Out of scope**:

- Do not change Better Auth admin plugin configuration.
- Do not change the meaning of `user.role = "admin"` or configured admin IDs.
- Do not implement new administrator roles or operator roles.
- Do not remove user deletion as a feature for non-admin users.

## Git workflow

- Branch: `advisor/015-protect-platform-admin-safety`
- Commit message style: Conventional Commits, e.g. `fix(api): protect platform admins from unsafe deletion`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Centralize the safety check

In `apps/api/src/platform/platform-admin.service.ts`, add a method that can be reused by generic user actions before disabling a user account. Suggested name:

```ts
async assertCanDisablePlatformUser(id: string): Promise<void>
```

The method must:

1. Load the target user; throw `NotFoundException("Usuário não encontrado.")` if absent.
2. If the target is not a platform admin (`isPlatformAdminUser(target, platformAdminUserIds())` is false), return normally.
3. If the target is a configured admin from `platformAdminUserIds()`, throw `BadRequestException` explaining configured admins cannot be disabled/deleted from generic user actions.
4. Count remaining active platform administrators after excluding this user. Treat `user.role = "admin"` and configured admin IDs as admin sources. At minimum, do not count users that are already `banned = true` as active role-based admins.
5. If the action would leave zero active platform administrators, throw `BadRequestException("Não é possível desativar o último Administrador da Plataforma.")` or a similarly clear Portuguese message.

You may factor helper functions inside the same file if that keeps `removeAdministrator` and the new method consistent. Do not silently weaken `removeAdministrator`.

**Verify**: `pnpm --filter @tatamiq/api test -- src/platform/platform-admin.service.spec.ts` → exits 0 after adding tests in Step 2.

### Step 2: Add API tests for admin safety

In `apps/api/src/platform/platform-admin.service.spec.ts`, add focused tests for the new method:

- Non-admin user: returns normally.
- Last role-based admin: rejects.
- Configured admin ID: rejects even if more role-based admins exist.
- Non-last role-based admin: returns normally if at least one other active admin remains.

If existing mock utilities make this awkward, add a small local mock DB in the spec rather than changing production code for test convenience.

**Verify**: `pnpm --filter @tatamiq/api test -- src/platform/platform-admin.service.spec.ts` → exits 0.

### Step 3: Call the safety check from ban and delete paths

Inject `PlatformAdminService` into:

- `apps/api/src/platform/platform-user.service.ts`
- `apps/api/src/platform/user-deletion.service.ts`

Before mutating the target user in these methods, call the new guard:

- `PlatformUserService.banUser`
- `UserDeletionService.delete`

Do not block `revokeUserSessions`; revoking sessions is a legitimate safety action and does not remove admin capability. Do not block `unbanUser`.

If dependency injection creates a circular provider issue, STOP and report; do not move services between modules without review.

**Verify**: `pnpm typecheck` → exits 0.

### Step 4: Update controller/service tests for the new dependency

If existing platform service/controller specs instantiate `PlatformUserService` or `UserDeletionService` directly, update mocks so the new `PlatformAdminService` dependency is supplied. Add regression tests where practical:

- Banning the last admin rejects before `user.banned` is updated.
- Deleting the last admin rejects before sessions/accounts/users are deleted.

Prefer service-level tests over broad controller tests.

**Verify**: `pnpm --filter @tatamiq/api test -- src/platform/platform-admin.service.spec.ts src/platform/platform.controller.spec.ts` → exits 0.

### Step 5: Add defensive UI messaging

In `apps/web/src/features/platform/platform-user-detail-page.tsx`, use the existing `detail.role === "admin"` / deletion impact data to make the UI less misleading:

- Show a warning when the viewed user is an **Administrador da Plataforma**.
- Disable or clearly warn on ban/delete buttons for platform admins if the API will reject them.
- Keep API enforcement as the source of truth; UI changes are only defensive.

Do not add a full administrator-management redesign here.

**Verify**: `pnpm --filter @tatamiq/web test` → exits 0 (it may report no affected tests but should exit 0), then `pnpm typecheck` → exits 0.

## Test plan

- Add `PlatformAdminService` unit coverage for the reusable guard.
- Add or update service tests for `PlatformUserService.banUser` and `UserDeletionService.delete` if test scaffolding exists or is cheap to create.
- Run:
  - `pnpm --filter @tatamiq/api test -- src/platform/platform-admin.service.spec.ts src/platform/platform.controller.spec.ts`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`

## Done criteria

All must hold:

- [ ] Generic ban/delete paths cannot disable/delete a configured platform admin.
- [ ] Generic ban/delete paths cannot disable/delete the last active **Administrador da Plataforma**.
- [ ] Non-admin user ban/delete behavior remains unchanged.
- [ ] `removeAdministrator` still rejects removing the last/configured admin.
- [ ] Targeted platform tests pass.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` exit 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for Plan 015 is updated.

## STOP conditions

Stop and report if:

- The platform admin model has changed away from `user.role = "admin"` plus configured IDs.
- Injecting `PlatformAdminService` creates a Nest circular dependency that cannot be fixed by normal module exports/imports already present in `PlatformModule`.
- The desired behavior appears to require a product decision about whether non-last admins may be deleted at all.
- Tests reveal that Better Auth treats banned configured admins differently than expected and the active-admin definition needs maintainer input.

## Maintenance notes

Future destructive user actions must call the same safety helper before disabling platform administrators. Reviewers should check both role-based admins and configured admin IDs, because configured IDs are not removable through the database alone.
