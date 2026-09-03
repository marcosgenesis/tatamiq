# App do Sensei Student App

Native-first Expo app for the student access journey. The PWA in `apps/web` remains the fallback surface;
it is not a source of components or navigation for this package.

## Boundaries

- Routes live in `src/app` and are grouped as `public`, `auth`, and `student`.
- Domain contracts and pure rules come through `@appdosensei/contracts`.
- Neutral visual primitives come through `@appdosensei/design-tokens`.
- Components, hooks, and UI implementation from `apps/web` are intentionally not imported.
- Native/web API differences belong in `.native.ts` and `.web.ts` platform modules.

## Local commands

```sh
pnpm --filter @appdosensei/student-app start
pnpm --filter @appdosensei/student-app dev
pnpm --filter @appdosensei/student-app typecheck
pnpm --filter @appdosensei/student-app lint
```

`start` is the Expo Go smoke path. `dev` is the canonical development-build path.
