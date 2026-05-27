# Student portal mobile-first redesign with PWA

The student portal ("Acesso do Aluno") was built desktop-first with 6 horizontal tabs, a wide centered layout (`max-w-5xl`), and no PWA capabilities. Students use it almost exclusively on mobile phones — the current experience feels like a shrunken desktop app with overflow-scrolling tabs, excessive padding, and no install prompt.

## Decision

Redesign the student portal mobile-first (CSS/layout only, below `md` breakpoint) and add intermediate PWA support. Desktop layout stays unchanged.

**Navigation**: Bottom nav with 4 items (Início, Agenda, Mensalidades, Perfil). Presenças and Graduação become summary cards on Início with drill-down to full-screen views.

**Top bar**: Fixed compact bar with avatar/initials, student name, and status badge — always visible, no scroll.

**QR check-in**: Floating action button (FAB) accessible from any screen, not in the bottom nav.

**PWA level**: Manifest + splash screen + home screen icon + service worker shell cache + friendly offline screen. No push notifications, no data caching — those can come later.

## Alternatives considered

- **PWA with push notifications**: adds backend notification infrastructure (tokens, queues, delivery tracking) for marginal gain — students check the app when they're at the academy, not reactively. Deferred to a future iteration.
- **Native app (React Native/Expo)**: doubles the frontend surface area, requires app store publishing, and the portal is mostly read-only views that work fine in a browser. No feature requires native APIs.
- **5-item bottom nav with QR as center item**: would work but the QR action is contextual (only useful when at the academy during class), not a primary navigation destination. A FAB communicates "action" better than a nav item.
- **Redesign both mobile and desktop**: doubles scope without proportional gain since ~90%+ of student traffic is mobile.
