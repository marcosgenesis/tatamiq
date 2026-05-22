# Ad hoc classes and cancellations V0 plan

**Status:** Planned

## Goal

Complete Epic 2.2 by adding **Aula Avulsa** and cancellation support to the weekly schedule. This keeps agenda management separate from starting attendance/QR.

An ad hoc class created "for now" is scheduled at the current time in V0; it does not become an active attendance session yet.

## Scope

### Included

- `class_sessions` table for ad hoc classes only in this slice.
- `class_cancellations` table for cancelling computed recurring occurrences.
- API endpoints to create ad hoc class, cancel/reactivate ad hoc class, cancel/revert recurring occurrence.
- Weekly schedule API includes ad hoc classes and cancellation state.
- Web `/schedule` supports creating ad hoc classes.
- Web `/schedule` supports cancelling/reactivating ad hoc classes.
- Web `/schedule` supports cancelling/reverting recurring occurrences.

### Deferred

- Starting class attendance.
- Active class sessions for recurring occurrences.
- QR code.
- Attendance records.
- Manual attendance.
- Session ending.

## Domain decisions

- Recurring occurrences remain computed from active **Turma** schedules.
- Cancelling a recurring occurrence creates a `class_cancellations` record keyed by class group, schedule, and occurrence date.
- Reverting cancellation sets `reverted_at` and keeps history.
- Cancelled recurring occurrences still appear in the agenda as cancelled.
- An **Aula Avulsa** is persisted as a `class_sessions` row with `kind = ad_hoc`.
- Ad hoc class status in this slice is `scheduled | cancelled` only.
- Creating an ad hoc class "now" schedules it at the current server time.
- A cancelled ad hoc class still appears in the agenda as cancelled.
- Reactivating an ad hoc class sets status back to `scheduled` and clears cancellation fields.
- Ad hoc class belongs to a **Turma** in V0.

## Data model

### `class_sessions`

- `id` text primary key.
- `organization_id` text not null references `organization.id`.
- `class_group_id` text not null references `class_groups.id`.
- `kind` text not null: `ad_hoc` in this slice.
- `scheduled_start_at` timestamp not null.
- `actual_start_at` timestamp nullable.
- `duration_minutes` integer not null.
- `ended_at` timestamp nullable.
- `status` text not null: `scheduled | cancelled` in this slice.
- `cancelled_at` timestamp nullable.
- `cancelled_by_user_id` text nullable references `user.id`.
- `created_by_user_id` text not null references `user.id`.
- `created_at` timestamp not null.
- `updated_at` timestamp not null.

### `class_cancellations`

- `id` text primary key.
- `organization_id` text not null references `organization.id`.
- `class_group_id` text not null references `class_groups.id`.
- `class_group_schedule_id` text not null references `class_group_schedules.id`.
- `occurrence_date` date not null.
- `created_by_user_id` text not null references `user.id`.
- `cancelled_at` timestamp not null.
- `reverted_at` timestamp nullable.
- `reverted_by_user_id` text nullable references `user.id`.

## API

All endpoints require an authenticated session with active organization and owner role.

- `POST /schedule/ad-hoc-classes`
  - Creates an ad hoc class.
  - Accepts `classGroupId`, `scheduledStartAt`, `durationMinutes`.
  - If `scheduledStartAt` is omitted, uses current server time.
- `POST /schedule/ad-hoc-classes/:id/cancel`
  - Cancels an ad hoc class.
- `POST /schedule/ad-hoc-classes/:id/reactivate`
  - Reactivates a cancelled ad hoc class.
- `POST /schedule/recurring-cancellations`
  - Cancels one computed recurring occurrence.
  - Accepts `classGroupId`, `scheduleId`, `occurrenceDate`.
- `POST /schedule/recurring-cancellations/:id/revert`
  - Reverts a recurring occurrence cancellation.

Existing endpoints update:

- `GET /schedule/week`
  - Returns recurring and ad hoc occurrences.
  - Cancelled occurrences remain visible with `status = cancelled`.
- `GET /schedule/today`
  - Same behavior for today's occurrences.

## Response model additions

Schedule occurrence adds:

- `source`: `recurring | ad_hoc`.
- `status`: `scheduled | cancelled`.
- `scheduleId` nullable.
- `classSessionId` nullable.
- `cancellationId` nullable.

## Web UI

`/schedule` should provide:

- Button to create **Aula avulsa**.
- Form with turma, date/time, duration.
- Shortcut to use current date/time.
- Ad hoc classes shown in the week grid.
- Cancel action on scheduled ad hoc class.
- Reactivate action on cancelled ad hoc class.
- Cancel action on scheduled recurring occurrence.
- Revert cancellation action on cancelled recurring occurrence.
- Cancelled visual state that does not hide the occurrence.

## Testing

Use TDD for cancellation matching and occurrence merging.

Priority behavior tests:

- Cancelling recurring occurrence marks only that date/schedule as cancelled.
- Reverted recurring cancellation no longer marks occurrence as cancelled.
- Ad hoc classes appear in the correct week/day.
- Cancelled ad hoc classes remain visible as cancelled.

Run validation:

- `pnpm openapi:generate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`
- Browser validation with `agent-browser` for ad hoc create/cancel/reactivate and recurring cancel/revert.

## Acceptance checklist

- [ ] Database schema and migration exist.
- [ ] Contracts expose updated schedule occurrence model and mutation DTOs.
- [ ] API endpoints are protected with organization owner role.
- [ ] API derives tenant from active organization session.
- [ ] Ad hoc class can be created for now.
- [ ] Ad hoc class can be created for a future time.
- [ ] Ad hoc class appears in weekly schedule.
- [ ] Ad hoc class can be cancelled.
- [ ] Cancelled ad hoc class remains visible.
- [ ] Ad hoc class can be reactivated.
- [ ] Recurring occurrence can be cancelled.
- [ ] Cancelled recurring occurrence remains visible.
- [ ] Recurring cancellation can be reverted.
- [ ] `/schedule` UI supports these flows.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] Flow validated with `agent-browser`.
