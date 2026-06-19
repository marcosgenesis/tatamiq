# Plan 025: Code-split web route components to reduce the initial JavaScript chunk

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa3aa3..HEAD -- apps/web/src/App.tsx apps/web/vite.config.ts apps/web/package.json apps/web/src/features apps/web/src/components/dashboard.tsx`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `4fa3aa3`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/191

## Why this matters

The production web build currently emits a single large JavaScript bundle: about 2.04 MB raw / 612 KB gzip at advisor recon time. `App.tsx` statically imports every route page, so public auth pages, instructor dashboard, platform admin, student portal, charts, calendar, and tables are all paid for on first load. This plan lazy-loads route components so each user area downloads only what it needs initially.

## Current state

Relevant files:

- `apps/web/src/App.tsx` — builds the router and statically imports all route pages.
- `apps/web/vite.config.ts` — Vite build config; currently no manual chunking or chunk-size policy.
- `apps/web/src/components/dashboard.tsx` — dashboard imports chart-heavy components and is statically included through `DashboardPage`.

Current excerpts:

```ts
// apps/web/src/App.tsx:17-55
import { AcademyOnboardingPage } from "./features/auth/academy-onboarding-page";
import {
  ForgotPasswordPage,
  ResetPasswordPage,
  SignInPage,
  SignUpPage,
} from "./features/auth/auth-pages";
import { ClassGroupsPage } from "./features/class-groups/class-groups-page";
import { ActiveClassPage } from "./features/classes/active-class-page";
import { DashboardPage } from "./features/dashboard/dashboard-page";
// ... platform, schedule, student portal, students, settings imports ...
```

```ts
// apps/web/src/App.tsx:353
const router = createRouter({ routeTree });
```

```ts
// apps/web/vite.config.ts:16-18
build: {
  target: "es2022",
},
```

Advisor build output at commit `4fa3aa3`:

```txt
dist/assets/index-BEeUR6mw.js   2,042.19 kB │ gzip: 612.38 kB
(!) Some chunks are larger than 500 kB after minification.
```

Existing convention to match: React 19 + TanStack Router; route components are declared in `App.tsx`. Keep route paths and auth layout behavior unchanged.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Web tests | `pnpm --filter @tatamiq/web test` | exit 0 |
| Web build | `pnpm --filter @tatamiq/web build` | exit 0; initial chunk substantially smaller |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0; existing warnings may remain |
| Full tests | `pnpm test` | exit 0 |

## Suggested executor toolkit

If available, use the `vercel-react-best-practices` skill for React lazy-loading and bundle-splitting choices.

## Scope

**In scope**:

- `apps/web/src/App.tsx`
- `apps/web/vite.config.ts` only if needed for chunk naming/manual chunks after route lazy-loading
- Route page files under `apps/web/src/features/**` only if they need default exports or tiny wrapper exports for lazy imports

**Out of scope**:

- Do not redesign routing or auth guards.
- Do not remove chart/calendar/table dependencies.
- Do not change API calls or product behavior.
- Do not implement service-worker caching changes in this plan.

## Git workflow

- Branch: `advisor/025-web-route-code-splitting`
- Commit message style: Conventional Commits, e.g. `perf(web): lazy load route bundles`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Measure the current build baseline

Run:

```bash
pnpm --filter @tatamiq/web build
```

Record the largest JS chunks from the output in your notes. The advisor observed a single `index-*.js` around 2.04 MB raw / 612 KB gzip; exact hash may differ.

**Verify**: command exits 0 before changes.

### Step 2: Add a small lazy route helper in App.tsx

In `apps/web/src/App.tsx`, import React lazy/Suspense support:

```ts
import { lazy, Suspense, useEffect } from "react";
```

Keep `LoadingScreen` available as the fallback.

Add a helper near the route declarations:

```tsx
function lazyRoute<T extends Record<string, unknown>, K extends keyof T>(
  loader: () => Promise<T>,
  exportName: K,
) {
  const Component = lazy(async () => ({ default: (await loader())[exportName] as React.ComponentType }));
  return function LazyRouteComponent(props: Record<string, never>) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Component {...props} />
      </Suspense>
    );
  };
}
```

Adjust typing as needed; avoid `any` unless there is no practical alternative. If typing gets too complex, use explicit lazy declarations per page instead of a generic helper.

**Verify**: `pnpm --filter @tatamiq/web typecheck` → exits 0 after Step 3.

### Step 3: Convert route page imports to lazy imports

Replace static route page imports with lazy-loaded route components. Prioritize heavy/auth-separated areas:

- public auth pages (`auth-pages`, onboarding)
- instructor pages (`DashboardPage`, `StudentsPage`, `ClassGroupsPage`, `SchedulePage`, `ActiveClassPage`, `GraduationPage`, `MonthlyFeesPage`, `SettingsPage`)
- platform pages (`PlatformPage`, academies, users, audit, administrators, first-access)
- student pages (`ChooseAreaPage`, `StudentDashboardPage`, drilldowns, check-in, invite acceptance, pre-registration, first-access)

For routes with params, keep the wrapper route component but render the lazy component inside it:

```tsx
const PlatformAcademyPageLazy = lazy(...);

component: function PlatformAcademyRoute() {
  const { academyId } = platformAcademyRoute.useParams();
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PlatformAcademyPageLazy academyId={academyId} />
    </Suspense>
  );
}
```

Do not lazy-load small shared layout components (`RootLayout`, `InstructorLayout`, `AppShell`, `SupportBanner`) unless the change is trivial. Keep `PlaceholderPage` static if that avoids complexity.

**Verify**: `pnpm --filter @tatamiq/web typecheck` → exits 0.

### Step 4: Preserve auth/layout behavior

Manually inspect these flows in code after lazy-loading:

- Unauthenticated users still redirect to `/sign-in` for auth-required routes.
- Logged-in users hitting public auth routes still redirect through `AuthenticatedRedirect`.
- Instructor layout still fetches organizations and active organization before rendering instructor pages.
- Platform support banner still renders inside instructor layout.

Do not move these guards into lazy page chunks.

**Verify**: `pnpm --filter @tatamiq/web test` → exits 0.

### Step 5: Rebuild and compare chunk output

Run:

```bash
pnpm --filter @tatamiq/web build
```

Expected result:

- Build exits 0.
- The initial `index-*.js` chunk is substantially smaller than the baseline. Target: less than 1 MB raw and less than 350 KB gzip for the entry chunk.
- Route chunks may exist and may individually be large; that is acceptable if the entry chunk is reduced.

If Vite still reports a chunk warning because a lazy route chunk is large, do not chase it in this plan unless the entry chunk remains large. Manual chunking for chart/calendar/vendor libraries can be a follow-up.

**Verify**: build output confirms the entry chunk reduction.

### Step 6: Optional manualChunks only if entry chunk remains too large

If route lazy-loading alone does not reduce the entry chunk enough, add conservative `build.rollupOptions.output.manualChunks` in `apps/web/vite.config.ts` for obvious vendor groups:

- React/TanStack core
- charting (`recharts`)
- calendar (`@fullcalendar/*`)

Do not overfit chunk names. Re-run build after any config change.

**Verify**: `pnpm --filter @tatamiq/web build` → exits 0.

## Test plan

- Existing web Vitest suite must pass.
- Typecheck catches route/lazy typing mistakes.
- Production build output is the key performance verification.
- Optional: if a local browser is available, smoke-test `/sign-in`, `/`, `/student`, and `/platform` manually. Do not add E2E tests in this plan.

## Done criteria

All must hold:

- [ ] `App.tsx` no longer statically imports all route page components.
- [ ] Route paths and auth/layout behavior remain unchanged.
- [ ] `pnpm --filter @tatamiq/web build` exits 0.
- [ ] The initial entry JS chunk is substantially smaller than the 2.04 MB / 612 KB gzip baseline; target less than 1 MB raw and less than 350 KB gzip.
- [ ] `pnpm --filter @tatamiq/web test`, `pnpm typecheck`, `pnpm lint`, and `pnpm test` exit 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for Plan 025 is updated.

## STOP conditions

Stop and report if:

- TanStack Router route component typing requires a broad router rewrite.
- Lazy-loading breaks auth guards or route params in a way that requires redesign.
- The entry chunk remains above target after route lazy-loading and obvious manual chunks.
- Build output becomes smaller only by removing features/dependencies rather than splitting them.

## Maintenance notes

Future routes should be added as lazy route chunks by default. If a route imports heavy chart/calendar/table libraries, keep those imports inside the lazy route path rather than in `App.tsx` or shared layout components.
