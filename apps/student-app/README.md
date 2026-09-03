# Tatamiq Student App

Native-first Expo app for the student access journey. The PWA in `apps/web` remains the fallback surface;
it is not a source of components or navigation for this package.

## Boundaries

- Routes live in `src/app` and are grouped as `public`, `auth`, and `student`.
- Domain contracts and pure rules come through `@tatamiq/contracts`.
- Neutral visual primitives come through `@tatamiq/design-tokens`.
- Components, hooks, and UI implementation from `apps/web` are intentionally not imported.
- Native/web API differences belong in `.native.ts` and `.web.ts` platform modules.

## Local commands

```sh
pnpm --filter @tatamiq/student-app start
pnpm --filter @tatamiq/student-app dev
pnpm --filter @tatamiq/student-app typecheck
pnpm --filter @tatamiq/student-app lint
```

`start` is the Expo Go smoke path. `dev` is the canonical development-build path.
