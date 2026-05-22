# Class groups V0 plan

**Status:** Planned

## Goal

Implement the V0 **Turmas** slice for the instructor area. This turns `/class-groups` into a real operational screen backed by tenant-scoped API endpoints and database tables.

This slice covers recurring class groups, weekly schedules, free-form tags, and student enrollment in one or more class groups. Weekly agenda, ad hoc classes, cancellations, class sessions, QR, and attendance remain later slices.

## Scope

### Included

- Tenant-scoped `class_groups` table.
- Tenant-scoped `class_group_schedules` table.
- Tenant-scoped `class_group_tags` table.
- Tenant-scoped `student_class_groups` table.
- Protected API endpoints for owner/instructor users.
- OpenAPI contracts for class group operations.
- Web `/class-groups` page replacing the placeholder.
- Create, edit, list, archive, and reactivate class groups.
- Add/remove weekly schedule entries.
- Add/remove free-form tags.
- Link active students to one or more class groups.

### Deferred

- Weekly agenda view.
- Concrete class sessions.
- Ad hoc classes.
- Cancellations.
- Starting class attendance.
- QR code and attendance records.

## Domain decisions

- **Turma** belongs to exactly one **Academia**.
- Backend derives the academy from `session.session.activeOrganizationId`; clients never send `organizationId`/`academyId`.
- **Turma Ativa** appears as an option for future agendas and calls.
- **Turma Arquivada** is preserved for history and excluded from future new calls.
- Archiving sets `archived_at`.
- Reactivation clears `archived_at`.
- A **Aluno** can belong to multiple **Turmas**.
- Student-group links preserve history with `active_from` and nullable `active_until`.
- Removing a student from a class group closes the active link instead of deleting it.
- Schedule changes in this slice replace the current weekly schedule set. Future agenda history will require effective-period refinement.

## Data model

### `class_groups`

- `id` text primary key.
- `organization_id` text not null references `organization.id`.
- `name` text not null.
- `default_duration_minutes` integer not null.
- `status` text not null: `active | archived`.
- `archived_at` timestamp nullable.
- `created_at` timestamp not null.
- `updated_at` timestamp not null.

### `class_group_schedules`

- `id` text primary key.
- `organization_id` text not null references `organization.id`.
- `class_group_id` text not null references `class_groups.id`.
- `weekday` integer not null, 0-6.
- `start_time` text not null in `HH:mm` format.
- `created_at` timestamp not null.

### `class_group_tags`

- `id` text primary key.
- `organization_id` text not null references `organization.id`.
- `class_group_id` text not null references `class_groups.id`.
- `label` text not null.

### `student_class_groups`

- `id` text primary key.
- `organization_id` text not null references `organization.id`.
- `student_id` text not null references `students.id`.
- `class_group_id` text not null references `class_groups.id`.
- `active_from` date not null.
- `active_until` date nullable.
- `created_at` timestamp not null.

## API

All endpoints require an authenticated session with active organization and owner role.

- `GET /class-groups`
  - Returns class groups for the active academy.
  - Supports optional `status=active|archived|all`.
- `POST /class-groups`
  - Creates a class group with schedules, tags, and student links.
- `GET /class-groups/:id`
  - Returns one class group from the active academy.
- `PATCH /class-groups/:id`
  - Updates core data, schedules, tags, and active student links.
- `POST /class-groups/:id/archive`
  - Sets status to archived and `archived_at`.
- `POST /class-groups/:id/reactivate`
  - Sets status to active and clears `archived_at`.

## Web UI

`/class-groups` should provide:

- Header with page title and create button.
- Filter cards/counts for active, archived, and total class groups.
- Empty state for no class groups.
- Card list with name, status, duration, weekly schedule summary, tags, and active student count.
- Create/edit form.
- Weekly schedule editor with weekday + start time rows.
- Tags input as comma-separated text.
- Student multi-select from active students.
- Archive/reactivate actions.

## Testing

Use TDD for focused domain validation and API-facing behavior where practical.

Priority behavior tests:

- Rejects a class group without schedule entries.
- Rejects invalid schedule time format.
- Creates class group input with normalized unique tags.
- Archive/reactivate preserves the group.
- Updating student links closes removed active links instead of deleting history.

Run validation:

- `pnpm openapi:generate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`
- Browser validation with `agent-browser` for create/edit/archive/reactivate.

## Acceptance checklist

- [ ] Database schema and migration exist.
- [ ] Contracts expose class group DTOs and endpoints.
- [ ] API endpoints are protected with organization owner role.
- [ ] API derives tenant from active organization session.
- [ ] Class group requires at least one schedule entry.
- [ ] Class group can have free-form tags.
- [ ] Active students can be linked to class groups.
- [ ] Removed student links preserve history.
- [ ] Class group can be edited.
- [ ] Class group can be archived.
- [ ] Class group can be reactivated.
- [ ] `/class-groups` page replaces placeholder.
- [ ] UI shows active academy class groups only.
- [ ] Validation messages are in Portuguese.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] Flow validated with `agent-browser`.
