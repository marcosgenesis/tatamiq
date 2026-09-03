# Expo native-first for the student mobile experience with PWA fallback

## Context

The student portal started as an online-first PWA and remains the web fallback for the Tatamiq student experience. The product decision for the MVP is now to make an Expo/React Native app the primary mobile surface for the complete **Acesso do Aluno**, including public pre-registration and activation flows, while keeping the PWA available when the app cannot be installed or opened.

The migration must work with links shared outside the product, such as pre-registration links, student invitations, first-access links and class QR flows. It must also avoid forcing the Academy operational panel into the native app.

## Decision

- Expo is the mandatory default mobile surface for the **Acesso do Aluno** after publication, for all Academias.
- Shared links continue to use canonical HTTPS URLs. When the app is installed, the operating system opens the corresponding native route; otherwise the PWA handles the same URL.
- Mobile web shows an install/open-app gate before the student portal. **Continuar no navegador** remains an explicit temporary fallback and is not persisted as a permanent opt-out.
- Desktop web remains available for student access, and the Academy operational panel remains web-only.
- The PWA stays supported as a fallback; it is not treated as an equal long-term mobile choice in the rollout experience.
- The rollout is global after the app is available in the relevant distribution channels, rather than a per-Academia opt-in migration.

## Alternatives considered

- **PWA remains the primary mobile surface** — rejected because the MVP now prioritizes the installed Expo experience for the student.
- **Gradual opt-in by Academy or student** — rejected for the rollout contract; the mobile gate applies globally after publication.
- **Remove the PWA** — rejected because app installation, platform support and store availability are not universal.
- **Permanent browser bypass** — rejected because it would make the two mobile surfaces equal choices and undermine the migration; browser fallback remains available only when needed or explicitly chosen for the current flow.

## Consequences

- Requires universal/app links, store distribution and a reliable native-to-web fallback for every student-facing route.
- Existing HTTPS links remain shareable and do not need separate `tatamiq://` URLs.
- The native app and PWA must keep functional parity for the student journeys defined in the Acesso do Aluno contract.
- Mobile web needs an install/open-app gate and a clear fallback state, including unsupported devices and unavailable store installations.
- This supersedes the native-app alternative recorded in ADR 0011 for the student mobile experience; the earlier PWA decision remains historical context for why the fallback exists.
