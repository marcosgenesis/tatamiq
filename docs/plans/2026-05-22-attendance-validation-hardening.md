# Attendance validation hardening plan

**Status:** Complete

## Goal

Close the implemented **Aula + QR + Presença** slice with deterministic data, browser-facing regression coverage, and a clearer attendance summary when visitors are present.

## Scope

### Included

- Deterministic E2E fixture for the local dev academy.
- Selective reset of fixture data before recreating it.
- Separate `db:seed:e2e` database script.
- Playwright global setup that runs the base dev seed and E2E fixture.
- Playwright coverage for recurring class start, QR UI, manual attendance, invalidation, re-registration, out-of-group attendance, and ending class.
- Playwright coverage for starting/ending an ad hoc class.
- Playwright coverage that a cancelled recurring occurrence cannot be started.
- Attendance summary copy changed from `N/M presença(s)` to `N presentes · M da turma`.

### Deferred

- Student QR scanning and QR attendance creation.
- Full attendance audit timeline in the instructor UI.
- Waiting for real 30-second QR rotation in browser tests; rotation remains covered by unit tests.

## Fixture

The fixture belongs to **Academia de Teste** and uses explicit E2E-prefixed records:

- `E2E No-Gi 19h` recurring class group with one linked student.
- `E2E Ana Presente` linked to the recurring class group.
- `E2E Bruno Visitante` active student outside the recurring class group.
- `E2E Open Mat Avulsa` ad hoc scheduled class.
- `E2E Aula Cancelada` recurring occurrence cancelled for today.

The fixture deletes only E2E-owned operational records before recreating them. Reset and recreation run in one transaction so a failed seed does not leave a partial scenario.

## Acceptance checklist

- [x] `db:seed:e2e` creates repeatable operational test data.
- [x] `pnpm test:e2e` prepares seed data automatically with a local-database safety guard.
- [x] Recurring class E2E covers QR UI, attendance correction, visitor attendance, summary, and end class.
- [x] Ad hoc class E2E covers start and end.
- [x] Cancelled occurrence E2E verifies no start action is available.
- [x] Attendance summary reads `N presentes · M da turma`.
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.
- [x] `pnpm build` passes.
- [x] `pnpm test:e2e` passes.
