# UI foundation plan

**Status:** Planned

## Goal

Create the first real instructor-facing UI foundation for Tatamiq. This should replace the scaffold status dashboard with a product-shaped app shell, navigation, theme tokens, and placeholder dashboard sections aligned with the V0 scope.

## Decisions

- The UI foundation should create a real layout, not only install libraries.
- The first layout is for the **Dono/Instrutor Solo** area.
- The app uses dark mode by default.
- Light mode is supported technically, but no theme toggle is included yet.
- Theme tokens use the shadcn/Tailwind v4 style: `:root` for light and `.dark` for dark.
- ReUI is the primary component library.
- shadcn/ui is the fallback when ReUI does not provide a needed component.
- Tailwind remains the styling foundation.
- Huge Icons is the icon set, using `hugeicons-react`.
- No Data Grid is needed in this step.
- No ADR is needed for this UI choice; the decision is documented here.

## Theme tokens

Use the provided light/dark OKLCH tokens as the V0 theme foundation.

Dark mode should be applied by default to the app root/document.

The visual direction is premium dark with warm orange accents, using black/cream/orange as the core palette.

## Navigation

The instructor navigation should include:

- Painel
- Alunos
- Turmas
- Agenda
- Presenças
- Graduação
- Mensalidades
- Configurações

Paths use English technical names while UI labels stay in Portuguese:

| Path | Label |
| --- | --- |
| `/` | Painel |
| `/students` | Alunos |
| `/class-groups` | Turmas |
| `/schedule` | Agenda |
| `/attendances` | Presenças |
| `/graduation` | Graduação |
| `/monthly-fees` | Mensalidades |
| `/settings` | Configurações |

## Responsive layout

- Desktop: fixed sidebar plus main content area.
- Mobile: basic bottom navigation and/or drawer/sheet navigation.
- Mobile navigation should exist in this step because PWA usage on the tatame is central to the product.

## Component structure

Organize web components as:

```txt
apps/web/src/components/ui/       # ReUI/shadcn-style primitives and wrappers
apps/web/src/components/layout/   # AppShell, Sidebar, MobileNav, Topbar
apps/web/src/features/dashboard/  # instructor dashboard placeholder
```

## Initial UI components

Use or create wrappers for:

- Button
- Card
- Badge
- Separator
- Sheet/Drawer for mobile navigation
- Sidebar/Nav if available in ReUI

## Dashboard placeholder

Remove scaffold technical cards from the main UI. The dashboard should look like a product dashboard, even before real data exists.

Placeholder cards:

- Aulas de hoje
- Pagamentos em verificação
- Mensalidades atrasadas
- Elegíveis para graduação
- Convites pendentes

The sidebar/topbar should show:

- Tatamiq brand;
- temporary context: `Academia Demo`.

## E2E adjustment

The Playwright smoke test should continue validating API endpoints separately:

- `GET /health`
- `GET /academies/demo`

The web UI smoke assertion should change to validate the product layout/dashboard instead of `ok` and `Academia Demo` status cards.

Expected web assertions:

- dashboard heading `Painel` is visible;
- navigation labels are visible;
- placeholder cards are visible;
- `Tatamiq` and `Academia Demo` context are visible.

## Acceptance criteria

- [ ] ReUI is installed/configured as the primary UI library.
- [ ] shadcn/ui fallback setup is available or documented if deferred.
- [ ] `hugeicons-react` is installed and used in navigation.
- [ ] Theme tokens are added using `:root` and `.dark`.
- [ ] App starts in dark mode by default.
- [ ] `AppShell` exists.
- [ ] Desktop sidebar navigation exists.
- [ ] Mobile navigation exists.
- [ ] Routes exist for all V0 instructor navigation items.
- [ ] Dashboard technical scaffold cards are removed.
- [ ] Dashboard product placeholder cards are visible.
- [ ] Playwright smoke test is updated for the new UI.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm test:e2e` passes.
- [ ] `pnpm build` passes.

## Follow-up after UI foundation

Next likely plan: Better Auth with email/password, httpOnly cookie sessions, and instructor/student roles.
