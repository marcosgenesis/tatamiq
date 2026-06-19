# Plan 018: Run Playwright E2E coverage in CI

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa3aa3..HEAD -- .github/workflows/ci.yml package.json playwright.config.ts tests/e2e/global-setup.ts tests/e2e/support/database.ts docker-compose.yml`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `4fa3aa3`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/184

## Why this matters

The repo has meaningful Playwright E2E coverage for auth, students, attendance, monthly fees, platform admin, and student portal flows, but CI only runs unit tests. Recent git history shows high churn in E2E specs and fixtures, so browser-level regressions can be merged without automated protection. This plan adds a CI E2E job with a local Postgres service and artifact upload for debugging failures.

## Current state

Relevant files:

- `.github/workflows/ci.yml` — current CI checks.
- `package.json` — declares `test:e2e`.
- `playwright.config.ts` — starts API and web dev servers and uses E2E env values.
- `tests/e2e/global-setup.ts` — migrates/seeds the E2E database.
- `tests/e2e/support/database.ts` — refuses non-local databases by default.
- `docker-compose.yml` — documents the local Postgres defaults.

Current excerpts:

```yaml
# .github/workflows/ci.yml:36-37
- name: Test
  run: pnpm test
```

```json
// package.json:15
"test:e2e": "playwright test"
```

```ts
// playwright.config.ts:3-8
const webUrl = process.env.E2E_WEB_URL ?? "http://localhost:5173";
const apiUrl = process.env.E2E_API_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
```

```ts
// tests/e2e/global-setup.ts:3-6
export default async function globalSetup() {
  assertE2eDatabaseIsLocal();
  runDatabaseScript("db:migrate");
  runDatabaseScript("db:seed");
  runDatabaseScript("db:seed:e2e");
}
```

```yaml
# docker-compose.yml:2-12
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_DB: tatamiq
    POSTGRES_USER: tatamiq
    POSTGRES_PASSWORD: tatamiq
  ports:
    - "5432:5432"
```

Existing convention to match: GitHub Actions uses Node 22 and pnpm 10.12.1 in `.github/workflows/ci.yml` and deployment workflows.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Unit/test baseline | `pnpm test` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0; existing warnings may remain |
| Build | `pnpm build` | exit 0 |
| E2E local smoke | `pnpm test:e2e -- --project=chromium --grep @smoke` if a smoke tag exists, otherwise `pnpm test:e2e -- --list` | exits 0; do not invent a tag if absent |

Full `pnpm test:e2e` requires local Postgres. If the executor environment lacks Docker/Postgres, do not fake a passing E2E run; document that only workflow syntax and non-E2E commands were verified.

## Scope

**In scope**:

- `.github/workflows/ci.yml`
- `playwright.config.ts` only if needed for CI stability/artifacts
- `tests/e2e/global-setup.ts` only if needed for CI env handling
- `tests/e2e/support/database.ts` only if the local-database guard needs a CI-safe tweak

**Out of scope**:

- Do not rewrite E2E specs.
- Do not change product behavior to make tests pass.
- Do not add external paid services to CI.
- Do not remove the existing `pnpm test` job.

## Git workflow

- Branch: `advisor/018-playwright-e2e-ci`
- Commit message style: Conventional Commits, e.g. `ci: run playwright e2e tests`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add a separate E2E job to CI

In `.github/workflows/ci.yml`, add a new job named `e2e` or `playwright` alongside the existing `checks` job. Keep the current `checks` job unchanged so unit feedback remains fast and clear.

The E2E job should:

1. Run on `ubuntu-latest`.
2. Start a Postgres 16 service with database/user/password matching local defaults: `tatamiq` / `tatamiq` / `tatamiq`.
3. Check out the repo.
4. Setup Node 22 and pnpm 10.12.1.
5. Run `pnpm install --frozen-lockfile`.
6. Install Playwright browser dependencies for Chromium: `pnpm exec playwright install --with-deps chromium`.
7. Run `pnpm test:e2e` with env values:
   - `DATABASE_URL=postgres://tatamiq:tatamiq@localhost:5432/tatamiq`
   - `BETTER_AUTH_SECRET` set to a non-secret CI test string of sufficient length
   - `QR_TOKEN_SECRET` set to a non-secret CI test string of sufficient length, or rely on `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL=http://localhost:3100`
   - `E2E_API_URL=http://localhost:3100`
   - `E2E_WEB_URL=http://localhost:5173`
   - `WEB_APP_URL=http://localhost:5173`
   - `CORS_ORIGIN=http://localhost:5173`
   - `E2E=true`
   - any platform admin env var required by seeds/tests, using a deterministic test value if the seed expects it.

Use GitHub Actions `services.postgres.options` health checks so tests wait for Postgres readiness.

**Verify**: `python - <<'PY'
import yaml, pathlib
print(yaml.safe_load(pathlib.Path('.github/workflows/ci.yml').read_text())['jobs'].keys())
PY` if PyYAML is available. If PyYAML is not available, run `ruby -e 'require "yaml"; p YAML.load_file(".github/workflows/ci.yml")["jobs"].keys'` or manually inspect. Expected: workflow parses and includes the new E2E job.

### Step 2: Upload Playwright artifacts on failure

In the E2E job, add `actions/upload-artifact@v4` steps guarded with `if: failure()` or `if: always()` for:

- `playwright-report/`
- `test-results/`

Use short retention, e.g. 7 days, to avoid excessive storage.

**Verify**: workflow YAML still parses.

### Step 3: Keep local-database guard intact

Review `tests/e2e/support/database.ts`. The current guard accepts `localhost`, `127.0.0.1`, and `::1`, which is compatible with the CI service URL if you use `localhost`. Do not weaken this guard unless CI genuinely requires it.

If you must change it, preserve the default refusal for non-local database URLs.

**Verify**: `pnpm typecheck` → exits 0.

### Step 4: Run available verification locally

Run the normal non-E2E checks:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

If local Postgres is available, run `pnpm test:e2e`. If not, run `pnpm test:e2e -- --list` to verify Playwright can discover tests, and state clearly that full E2E execution requires CI/local Postgres.

**Verify**: commands above exit 0, except full E2E may be skipped only if Postgres/browser dependencies are unavailable.

## Test plan

- No product tests need to be added.
- CI itself is the test: the new job must run the existing Playwright suite against a local Postgres service.
- Local verification should include workflow syntax inspection and the normal repo gates.

## Done criteria

All must hold:

- [ ] `.github/workflows/ci.yml` has a separate E2E/Playwright job.
- [ ] The E2E job provisions local Postgres and runs `pnpm test:e2e` with safe CI env values.
- [ ] Playwright reports/test-results are uploaded as artifacts on failure or always.
- [ ] The non-local database safety guard remains intact.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` exit 0.
- [ ] Either full `pnpm test:e2e` is run successfully, or the executor explicitly documents why it could not be run locally and verifies discovery/config instead.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for Plan 018 is updated.

## STOP conditions

Stop and report if:

- E2E tests require secrets that cannot be represented by safe CI test values.
- The existing E2E suite is flaky/failing for product reasons unrelated to CI wiring.
- GitHub Actions cannot run service containers for this repo.
- Fixing E2E failures requires changing application behavior outside this plan’s scope.

## Maintenance notes

Keep E2E as a separate job so maintainers can distinguish product/test failures from unit/build failures. If runtime becomes too slow, optimize with sharding or a smoke/regression split in a later plan; do not silently remove E2E from CI.
