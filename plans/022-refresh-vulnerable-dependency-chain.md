# Plan 022: Refresh vulnerable production dependency chain until pnpm audit passes

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa3aa3..HEAD -- package.json pnpm-lock.yaml apps/web/package.json apps/api/package.json packages/database/package.json packages/contracts/package.json apps/web/src/index.css`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `4fa3aa3`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/188

## Why this matters

`pnpm audit --prod` currently fails with high-severity advisories in the production dependency graph. A prior dependency plan is marked DONE, so this is a regression/new vulnerability set that should be handled as a fresh dependency refresh. The goal is not to chase every low-priority advisory manually; it is to remove high/moderate production vulnerabilities without breaking build/test flows.

## Current state

Relevant files:

- `package.json` — root overrides already exist for vulnerable chains.
- `apps/web/package.json` — currently depends on `vite` and `shadcn`.
- `apps/api/package.json` — includes `@nestjs/swagger` and `better-auth` chains found by audit.
- `packages/database/package.json` — includes `better-auth` chain found by audit.
- `apps/web/src/index.css` — imports `shadcn/tailwind.css`, so `shadcn` may be a runtime/build dependency rather than a removable CLI-only dependency.
- `pnpm-lock.yaml` — lockfile must be updated with any dependency changes.

Current excerpts:

```json
// apps/web/package.json
"shadcn": "^4.8.0",
"vite": "^6.4.2"
```

```json
// apps/api/package.json
"@nestjs/swagger": "latest",
"better-auth": "^1.6.18"
```

```json
// packages/database/package.json
"better-auth": "^1.6.18"
```

```json
// package.json
"pnpm": {
  "overrides": {
    "esbuild": "0.28.1",
    "postcss": "8.5.10"
  }
}
```

The advisor ran `pnpm audit --prod` at commit `4fa3aa3`; it reported 13 vulnerabilities, including high advisories for `vite <=6.4.2` and `hono <4.12.25`, plus moderate advisories involving `js-yaml` and `launch-editor`.

Existing convention to match: this repo uses pnpm workspaces and keeps lockfile changes in `pnpm-lock.yaml`; verification commands are root `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Inspect why a package exists | `pnpm why <package> --recursive` | exits 0 and shows dependency paths |
| Update lockfile/deps | `pnpm update <packages...> --recursive` or targeted `pnpm add` commands | exits 0; package files/lockfile updated |
| Audit | `pnpm audit --prod` | exits 0 or no high/moderate production vulnerabilities remain |
| Typecheck | `pnpm typecheck` | exit 0 |
| Tests | `pnpm test` | exit 0 |
| Build | `pnpm build` | exit 0 |
| Lint | `pnpm lint` | exit 0; existing warnings may remain |

## Scope

**In scope**:

- `package.json`
- `pnpm-lock.yaml`
- `apps/web/package.json`
- `apps/api/package.json`
- `packages/database/package.json`
- `packages/contracts/package.json` only if a vulnerable package is resolved there
- `apps/web/src/index.css` only if you intentionally remove/replace the `shadcn/tailwind.css` import because `shadcn` cannot be kept safely

**Out of scope**:

- Do not migrate Vite major versions.
- Do not migrate React, NestJS, Better Auth, or Drizzle major versions unless required by a patch with a clear compatibility path.
- Do not remove UI styling imports unless you verify visual/build impact.
- Do not change application code unrelated to dependency compatibility.

## Git workflow

- Branch: `advisor/022-refresh-vulnerable-dependencies`
- Commit message style: Conventional Commits, e.g. `chore(deps): refresh vulnerable production packages`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Reproduce and capture current vulnerable paths

Run:

```bash
pnpm audit --prod
```

Expected before the fix: audit fails and includes the vulnerable paths noted above. Then inspect the highest-impact packages:

```bash
pnpm why vite --recursive
pnpm why hono --recursive
pnpm why js-yaml --recursive
pnpm why @babel/core --recursive
```

Record in your notes which direct dependency needs to move for each vulnerable transitive dependency. Do not paste advisory exploit details into code comments.

**Verify**: commands exit 0 except `pnpm audit --prod`, which is expected to exit non-zero before the fix.

### Step 2: Fix direct vulnerable packages first

Update direct dependencies with safe patch/minor upgrades:

- `apps/web` `vite` must move above the patched version reported by audit (`>=6.4.3` at audit time).
- If `shadcn` pulls vulnerable `hono`, update `shadcn` to a version whose dependency tree uses `hono >=4.12.25`. If no such version exists, consider a root `pnpm.overrides.hono` entry pinned to a patched version.
- If `better-auth` or its transitive chain pulls vulnerable `vite` through test/dev packages that audit treats as production, update `better-auth` / `@better-auth/drizzle-adapter` to compatible patch/minor versions first.
- If `@nestjs/swagger` pulls vulnerable `js-yaml`, update `@nestjs/swagger` to a compatible patch/minor version. If the only fix is a transitive override, use a root `pnpm.overrides` entry and verify build.

Prefer normal dependency updates over overrides. Use overrides only when an upstream direct dependency does not yet publish a safe transitive range.

**Verify**: `pnpm install --frozen-lockfile` should pass after lockfile updates are complete. During editing, `pnpm install` without frozen lockfile is acceptable to update `pnpm-lock.yaml`.

### Step 3: Be careful with `shadcn`

Before moving or removing `shadcn`, note that `apps/web/src/index.css` imports:

```css
@import "shadcn/tailwind.css";
```

Therefore, do not simply move `shadcn` to `devDependencies` or remove it unless `pnpm --filter @tatamiq/web build` still resolves that CSS import. If the safe fix is a `hono` override, prefer that over breaking the CSS import.

**Verify**: `pnpm --filter @tatamiq/web build` → exits 0 after any `shadcn` change.

### Step 4: Run audit until production vulnerabilities are gone or explicitly bounded

Run:

```bash
pnpm audit --prod
```

Target: exit 0. If low-severity vulnerabilities remain and no safe upgrade is available, document them in the PR notes, but high/moderate production vulnerabilities should be cleared.

If a vulnerability remains only in a package that is genuinely dev-only but is listed under `dependencies`, move that package to `devDependencies` only if application build/runtime still works.

**Verify**: `pnpm audit --prod` → exits 0. If it cannot exit 0 because no fixed upstream exists, STOP and report rather than merging a partial dependency change.

### Step 5: Run full verification

Run:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

All must exit 0. Build may still warn about chunk size; that is handled by Plan 025, not this plan.

## Test plan

- No new source tests should be needed unless a dependency update requires compatibility changes.
- The test plan is dependency verification:
  - `pnpm audit --prod`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

## Done criteria

All must hold:

- [ ] `pnpm audit --prod` exits 0, or the executor stops and reports an unfixable upstream blocker.
- [ ] Direct dependencies/overrides are updated minimally and explainably.
- [ ] `pnpm-lock.yaml` is updated consistently with package changes.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` exit 0.
- [ ] `apps/web` still builds successfully if `shadcn` or Vite changed.
- [ ] No application source files are modified except `apps/web/src/index.css` if absolutely required for a safe `shadcn` change.
- [ ] `plans/README.md` status row for Plan 022 is updated.

## STOP conditions

Stop and report if:

- Clearing the audit requires a major framework/runtime migration.
- No patched version or safe override exists for a high/moderate production vulnerability.
- A dependency update breaks Better Auth, Vite, NestJS Swagger, or Tailwind/shadcn build behavior in a way that requires source refactors outside this plan.
- `pnpm audit --prod` still fails after reasonable targeted updates.

## Maintenance notes

Dependency audit will regress over time. If this plan succeeds, consider adding `pnpm audit --prod` to CI in a later, separate plan with an explicit policy for moderate/low advisories to avoid blocking deploys on noise.
