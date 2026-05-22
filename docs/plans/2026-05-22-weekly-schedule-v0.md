# Weekly schedule V0 plan

**Status:** Completed

**Completed on:** 2026-05-22

**Implementation commits:**

- `88ca392 feat(schedule): add weekly schedule view`

## Goal

Implement the first V0 **Agenda Semanal** slice for the instructor area. This turns `/schedule` into a real weekly calendar based on active class groups and their weekly schedules, and updates the dashboard to show today's upcoming recurring classes.

This slice is read-only for agenda occurrences. Ad hoc classes, cancellations, class sessions, start attendance, QR code, and attendance records remain later slices.

## Scope

### Included

- Weekly schedule API endpoint derived from active `class_groups` and `class_group_schedules`.
- Dashboard API endpoint for today's recurring classes.
- Web `/schedule` page replacing the placeholder.
- Weekly navigation between previous/current/next weeks.
- Day columns with scheduled recurring class occurrences.
- Dashboard card/list showing today's upcoming classes.
- Tenant isolation via Better Auth active organization.

### Deferred

- Persisted `class_sessions` for recurring occurrences.
- Ad hoc classes.
- Cancellations and reactivation.
- Starting class attendance.
- QR code.
- Attendance records.

## Domain decisions

- Weekly recurring agenda occurrences are calculated from active **Turma** schedules.
- **Turma Arquivada** does not appear in the weekly agenda.
- Occurrences are not persisted in this slice.
- The API accepts a `weekStart` date in `YYYY-MM-DD` format.
- Week starts on Monday for the instructor UI.
- The API returns seven days, Monday through Sunday.
- `scheduledStartAt` is returned as an ISO datetime composed from local date and `HH:mm` schedule time.
- `durationMinutes` comes from the class group's `default_duration_minutes`.
- Dashboard today's classes use the server's current date for V0.

## API

All endpoints require an authenticated session with active organization and owner role.

- `GET /schedule/week?weekStart=YYYY-MM-DD`
  - Returns seven day buckets for the requested week.
  - Includes recurring occurrences from active class groups.
- `GET /schedule/today`
  - Returns today's recurring occurrences.
  - Used by the dashboard.

## Response model

### Schedule occurrence

- `id`: stable computed id using class group id, schedule id, and date.
- `classGroupId`
- `classGroupName`
- `scheduledDate`
- `scheduledStartAt`
- `startTime`
- `durationMinutes`
- `studentCount`
- `tags`

### Schedule day

- `date`
- `weekday`
- `occurrences`

## Web UI

`/schedule` should provide:

- Header with title and week navigation.
- Buttons for previous week, current week, and next week.
- Seven day columns/cards.
- Each occurrence card shows class group name, time, duration, student count, and tags.
- Empty state when there are no active class groups or schedules in the week.

Dashboard should provide:

- Card for today's recurring classes.
- Empty state when there are no classes today.
- Link/CTA to `/schedule`.

## Testing

Use TDD for date/week calculations.

Priority behavior tests:

- Calculates Monday week start for any date.
- Builds seven days Monday through Sunday.
- Maps active class group schedules into occurrences for matching weekdays.
- Excludes archived class groups.

Run validation:

- `pnpm openapi:generate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`
- Browser validation with `agent-browser` for schedule page and dashboard today card.

## Acceptance checklist

- [x] Schedule API module exists.
- [x] Contracts expose weekly schedule DTOs and endpoints.
- [x] API endpoints are protected with organization owner role.
- [x] API derives tenant from active organization session.
- [x] Weekly occurrences are derived from active class groups.
- [x] Archived class groups are excluded.
- [x] `/schedule` page replaces placeholder.
- [x] Weekly navigation works.
- [x] Dashboard shows today's recurring classes.
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.
- [x] `pnpm build` passes.
- [x] Flow validated with `agent-browser`.
