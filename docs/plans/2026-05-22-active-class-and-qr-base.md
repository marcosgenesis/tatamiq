# Active class and QR base plan

**Status:** Complete

## Goal

Implement the first **Aula ativa + QR base** slice. This lets the instructor start a scheduled recurring or ad hoc class, see an active class screen, generate a rotating signed QR payload, and end the class.

This slice does not register attendance yet. Student QR scanning and attendance confirmation remain the next slice.

## Scope

### Included

- Start a recurring schedule occurrence from `/schedule`.
- Start an ad hoc scheduled class from `/schedule`.
- Create a persisted `class_sessions` row for recurring occurrences when starting class.
- Reuse the ad hoc `class_sessions` row when starting an ad hoc class.
- `class_sessions.status` expands to `scheduled | active | ended | cancelled`.
- Store `actual_start_at` when class starts.
- Store `ended_at` when class ends.
- Active class screen for instructor.
- Signed QR payload for active class.
- Rotating QR token endpoint based on 30-second windows.
- QR token includes class session id, academy/organization id, issued window, and expiry context.
- QR token is stateless and not persisted.
- End active class manually.

### Deferred

- Student login/access.
- Student QR scanning route.
- Attendance creation.
- Manual attendance.
- Attendance invalidation.
- Presence outside class group.
- QR visual QR-code image dependency if avoidable; payload text may be enough for base validation.

## Domain decisions

- **Aula** is a concrete `class_sessions` row.
- A recurring occurrence becomes a concrete **Aula** only when the instructor starts it.
- An ad hoc scheduled class is already a `class_sessions` row and transitions to active.
- Cancelled classes cannot be started.
- Ended classes cannot be restarted in V0.
- QR token is signed with server secret.
- QR token rotates every 30 seconds.
- QR base endpoint returns current token, previous-token grace metadata, and expiry metadata, but attendance validation happens later.
- QR remains valid until 15 minutes after the calculated class end based on `actual_start_at + duration_minutes`, unless the class is ended manually.
- For this slice, UI shows the QR payload/token and timer; rendering an actual QR image can be added later if needed.

## Data model

Update `class_sessions.status` allowed values:

- `scheduled`
- `active`
- `ended`
- `cancelled`

Use existing fields:

- `actual_start_at`
- `ended_at`
- `duration_minutes`
- `status`
- `class_group_id`
- `scheduled_start_at`

Recurring session creation uses:

- `kind = recurring`
- `scheduled_start_at` from computed occurrence
- `duration_minutes` from class group default duration
- `created_by_user_id` as current instructor
- `actual_start_at` as current server time
- `status = active`

## API

All endpoints require authenticated session with active organization and owner role.

- `POST /classes/start-recurring`
  - Body: `classGroupId`, `scheduleId`, `scheduledDate`.
  - Creates active recurring class session.
  - Rejects cancelled recurring occurrence.
- `POST /classes/:id/start-ad-hoc`
  - Starts an existing scheduled ad hoc class session.
  - Rejects cancelled/ended/active invalid transitions.
- `GET /classes/active`
  - Returns current active class for academy, if any.
- `GET /classes/:id`
  - Returns one class session context for instructor.
- `GET /classes/:id/qr-token`
  - Returns current signed QR token for active class.
- `POST /classes/:id/end`
  - Ends active class manually.

## Web UI

Schedule page:

- Show **Iniciar aula** on scheduled occurrences.
- Hide/disable start action for cancelled occurrences.
- For recurring occurrences, call `start-recurring`.
- For ad hoc occurrences, call `start-ad-hoc`.
- Navigate to active class screen after start.

Active class route:

- `/classes/:id`
- Shows class group name, start time, duration, calculated end, and status.
- Shows current QR token/payload and refresh countdown.
- Button **Encerrar aula**.
- After ending, shows ended state and CTA back to agenda.

Dashboard:

- If there is an active class, show CTA to resume it.

## Testing

Use TDD for QR token claims and class state transitions.

Priority behavior tests:

- QR token payload includes class session id and organization id.
- QR token changes across 30-second windows.
- Starting a recurring occurrence creates an active class session.
- Cancelled occurrence cannot be started.
- Ending active class sets `ended_at` and status `ended`.

Run validation:

- `pnpm openapi:generate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`
- Browser validation with `agent-browser` for start recurring/ad hoc, QR token refresh, end class.

## Acceptance checklist

- [ ] Database migration updates class session status constraints and `kind` constraints.
- [ ] Contracts expose class session and QR DTOs.
- [ ] API endpoints are protected with organization owner role.
- [ ] API derives tenant from active organization session.
- [ ] Recurring occurrence can be started.
- [ ] Ad hoc class can be started.
- [ ] Cancelled class/occurrence cannot be started.
- [ ] Active class can be fetched.
- [ ] QR token endpoint works for active class.
- [ ] QR token rotates by 30-second window.
- [ ] Active class can be ended.
- [ ] Schedule UI can start class.
- [ ] Active class UI shows QR token.
- [ ] Dashboard can link to active class.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] Flow validated with `agent-browser`.
