# Plan 002: Update the vulnerable dependency chain reported by pnpm audit

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat b113c3a..HEAD -- package.json apps/api/package.json apps/web/package.json pnpm-lock.yaml`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `b113c3a`, 2026-06-13

## Why this matters

`pnpm audit --prod` currently reports critical/high advisories through packages in the API and web dependency graph, including Vitest, esbuild, and PostCSS paths. Some advisories are development-server or registry-supply-chain risks, but the repository is preparing deployable API/web apps and should keep the lockfile out of known vulnerable ranges. This plan updates only the smallest needed dependency set and verifies the monorepo still builds and tests.

## Current state

Relevant files:

- `package.json` — root scripts and shared dev dependencies.
- `apps/api/package.json` — API dependencies, including `better-auth`, `tsx`, and `vitest`.
- `apps/web/package.json` — web dependencies, including `better-auth` and `vitest`.
- `pnpm-lock.yaml` — lockfile that records transitive vulnerable versions.

Current excerpts:

```json
// package.json:19-29
"devDependencies": {
  "@biomejs/biome": "latest",
  "@commitlint/cli": "latest",
  "@commitlint/config-conventional": "latest",
  "@playwright/test": "^1.60.0",
  "husky": "latest",
  "lint-staged": "latest",
  "turbo": "latest",
  "typescript": "^5.9.3",
  "vitest": "^3.2.4",
  "wrangler": "^4.94.0"
}
```

```json
// apps/api/package.json:26,33,44
"better-auth": "^1.6.11",
"tsx": "latest",
"vitest": "^3.2.4"
```

```json
// apps/web/package.json:36,68
"better-auth": "^1.6.11",
"vitest": "^3.2.4"
```

Audit evidence from the advisor run:

- `pnpm audit --prod` reported Vitest `<3.2.6` as critical in paths through `apps__web>better-auth>vitest` and `apps__api>better-auth>vitest`.
- It reported esbuild vulnerable ranges, including `>=0.17.0 <0.28.1`, through `apps__api>tsx>esbuild` and `apps__api>better-auth>drizzle-kit>...>esbuild`.
- It reported PostCSS `<8.5.10` through `apps__api>better-auth>next>postcss`.

Repo conventions to match:

- Package manager is pinned as `pnpm@10.12.1` in root `package.json`.
- CI runs `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Commit messages use Conventional Commits, e.g. `chore: complete mensalidade projection prd`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install/update lockfile | `pnpm install` | exit 0; updates `pnpm-lock.yaml` if needed |
| Audit | `pnpm audit --prod` | no high/critical vulnerabilities, or only documented non-fixable transitive advisories |
| Typecheck | `pnpm typecheck` | exit 0 |
| Tests | `pnpm test` | exit 0 |
| Build | `pnpm build` | exit 0 |
| Lint | `pnpm lint` | exit 0 |

## Scope

**In scope**:

- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `pnpm-lock.yaml`

**Out of scope**:

- Do not refactor application code unless a dependency update causes a small compile-time API incompatibility; if that happens, STOP unless the fix is trivial and contained to a test or import.
- Do not change package manager, workspace layout, CI workflow, TypeScript config, or build tooling strategy.
- Do not add broad `pnpm.overrides` unless direct dependency upgrades cannot eliminate the high/critical advisories.

## Git workflow

- Branch: `advisor/002-update-vulnerable-dependency-chain`
- Commit message: `chore: update vulnerable dependency chain`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Reproduce the audit baseline

Run `pnpm install --frozen-lockfile` first if dependencies are not installed. Then run `pnpm audit --prod` and save the list of high/critical advisories in your local notes. Do not paste secret values; audit output should not contain secrets.

**Verify**: `pnpm audit --prod` → currently expected to fail before fixes with high/critical advisories similar to the current state above.

### Step 2: Update the smallest direct dependency set

Prefer normal upgrades over overrides. Try these changes first:

- Raise all direct `vitest` specs from `^3.2.4` to a version satisfying the advisory (`^3.2.6` or newer compatible 3.x) in root, API, and web package manifests.
- Ensure `tsx` resolves to a version whose `esbuild` dependency is patched for the reported advisories. If `latest` already resolves vulnerable in this lockfile, pin to a known patched current version rather than leaving it floating.
- Update `better-auth` and `@better-auth/drizzle-adapter` to the latest compatible release that no longer pulls vulnerable transitive `vitest`, `drizzle-kit`, `next`, `postcss`, or `esbuild` versions, if available.

Then run `pnpm install` to update `pnpm-lock.yaml`.

**Verify**: `git diff -- package.json apps/api/package.json apps/web/package.json pnpm-lock.yaml` → only dependency spec/lockfile changes should be present.

### Step 3: Re-run audit and decide if overrides are needed

Run `pnpm audit --prod` again.

- If no high/critical advisories remain, continue.
- If only moderate/low advisories remain, continue and document them in the final handoff.
- If high/critical advisories remain only because a direct dependency has not yet released a fix, add the narrowest possible `pnpm.overrides` entry in root `package.json` for the vulnerable package and patched version. Re-run `pnpm install` after adding an override.

**Verify**: `pnpm audit --prod` → exits 0 or reports no high/critical vulnerabilities. If it still exits nonzero only for moderate/low issues, record that exact remaining severity in your final response.

### Step 4: Run full monorepo verification

Run the same gates as CI.

**Verify**:

- `pnpm lint` → exit 0.
- `pnpm typecheck` → exit 0.
- `pnpm test` → exit 0.
- `pnpm build` → exit 0.

## Test plan

No new tests are required for a dependency-only update. The test plan is to run the full existing suite and build:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm audit --prod`

## Done criteria

- [ ] High/critical `pnpm audit --prod` findings from the current state are gone, or any remaining high/critical finding is documented as non-fixable with the direct dependency that blocks it.
- [ ] `pnpm-lock.yaml` is updated consistently with package manifests.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` exit 0.
- [ ] No application source files are modified unless a trivial compile fix was unavoidable and documented.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Updating `better-auth` requires an auth/database migration or behavior change beyond dependency metadata.
- A package update forces broad application code changes.
- `pnpm audit --prod` still reports a high/critical advisory after latest compatible direct dependencies and there is no safe narrow override.
- Install or verification fails twice after reasonable local fixes.

## Maintenance notes

Reviewers should scrutinize the lockfile for broad or surprising upgrades. If an override is introduced, add a follow-up reminder to remove it once the direct dependency resolves the transitive issue.
