# Student access V0 plan

**Status:** Implemented

## Goal

Implement the first **Acesso do Aluno** slice for V0. This lets an instructor generate a secure invite link for an existing active student, lets the invited person create or use an existing account, accept the student access terms, and land in a minimal student area.

This slice proves the account-to-student link and the student-facing authorization model. QR attendance confirmation remains the next slice.

## Scope

### Included

- Instructor-generated **Convite do Aluno** as a full link.
- Invite token stored hash-only.
- Invite expiry after 7 days.
- Reenviar convite creates a new link and invalidates any previous pending invite for the same student.
- Invite acceptance by creating a new account or using an existing Better Auth account.
- Explicit **Aceite do Aluno** after authentication and before access activation.
- Initial terms version: `student-access-v1`.
- `StudentAccess` as a separate active/revoked link between Better Auth user and Student.
- One active student access per user and one active student access per student in V0.
- A user may have both instructor access and student access, with explicit area selection.
- Minimal student area showing own student data, academy, status, linked class groups, and upcoming classes for the next 7 days.
- Student routes authorized from active `StudentAccess`, not from Better Auth active organization.
- Instructor access actions embedded in `/students`.

### Deferred

- Student QR scan and QR attendance creation.
- Student attendance history.
- Student monthly fees.
- Student graduation history.
- Student contact/photo editing.
- Photo upload/storage.
- Full student profile page.
- Short typed invite code.
- Email/WhatsApp invite sending integration.

## Domain decisions

- Public sign-up without invite remains the **Dono/Instrutor Solo** flow.
- **Acesso do Aluno** can only be born from a **Convite do Aluno** for an existing student record.
- A Better Auth user is not added as an organization member when accepting a student invite.
- A student invite is a full link, not a short code in V0.
- The raw token is shown only immediately after invite creation/reenviar. If the instructor loses the link, they must generate a new one.
- Existing pending invite for the same student is invalidated when a new invite is generated.
- If a student already has active access, the instructor must revoke it before creating a new invite.
- Revoking student access does not delete or block the Better Auth account.
- An inactive student cannot receive or accept a new invite.
- If a student becomes inactive after access activation, the student area is read-only for 12 months; after that, access is blocked by authorization rules.
- `students.email` is not synchronized with the Better Auth account email during invite acceptance.
- A logged-in user with existing active student access cannot accept another student invite in V0.
- A user with both instructor and student access chooses between **Área do instrutor** and **Área do aluno** after login and can switch areas.

## Data model

### `student_access_invites`

Suggested fields:

- `id` text primary key
- `organization_id` text not null
- `student_id` text not null
- `token_hash` text not null unique
- `status` text not null: `pending | accepted | revoked`
- `expires_at` timestamp not null
- `accepted_at` timestamp nullable
- `revoked_at` timestamp nullable
- `created_by_user_id` text not null
- `accepted_by_user_id` text nullable
- `created_at` timestamp not null
- `updated_at` timestamp not null

Rules:

- `pending` + `expires_at < now` is treated as expired dynamically.
- At most one pending invite per student via partial unique index.
- Expiration does not require a scheduled job in this slice.

### `student_access`

Suggested fields:

- `id` text primary key
- `organization_id` text not null
- `student_id` text not null
- `auth_user_id` text not null
- `status` text not null: `active | revoked`
- `revoked_at` timestamp nullable
- `revoked_by_user_id` text nullable
- `created_at` timestamp not null
- `updated_at` timestamp not null

Rules:

- At most one active access per student via partial unique index.
- At most one active access per auth user via partial unique index.
- Revoked records remain for history.

### `student_acceptances`

Suggested fields:

- `id` text primary key
- `organization_id` text not null
- `student_access_id` text not null
- `student_id` text not null
- `auth_user_id` text not null
- `terms_version` text not null
- `accepted_at` timestamp not null

Rules:

- Acceptance is created in the same transaction that creates `student_access` and marks invite accepted.
- Revoking access does not delete acceptance history.

## API

### Instructor routes

All instructor routes require authenticated owner access and active organization.

- `POST /students/:id/access-invites`
  - Generates a new invite link.
  - Revokes any previous pending invite for that student.
  - Rejects inactive students.
  - Rejects students with active access.
  - Returns the raw invite link once.

- `POST /students/:id/access-invites/:inviteId/revoke`
  - Revokes a pending invite.

- `POST /students/:id/access/revoke`
  - Revokes active student access without deleting the Better Auth user.

- `GET /students` / `GET /students/:id`
  - Include `accessState` for UI: none, pending, expired, active, revoked as needed.
  - Do not include raw invite token.

### Invite routes

- `GET /student-invites/:token`
  - Public preview endpoint.
  - Returns non-sensitive preview: academy name, student full name, status of invite acceptability.

- `POST /student-invites/:token/accept`
  - Requires authenticated session.
  - Body includes acceptance of `student-access-v1`.
  - Runs transaction:
    1. hash token and find pending invite;
    2. validate expiry;
    3. validate student active;
    4. ensure student has no active access;
    5. ensure user has no active student access;
    6. create `student_access`;
    7. create `student_acceptance`;
    8. mark invite accepted.

### Student routes

Student routes require authenticated session and active `student_access`; they do not require Better Auth organization membership.

- `GET /student/me`
  - Returns minimal dashboard:
    - student id/name/status;
    - academy name;
    - linked class groups;
    - upcoming classes for next 7 days;
    - read-only/blocking state when applicable.

## Web UI

### Instructor `/students`

Add access controls to student row/card:

- No access and no valid invite: **Gerar convite**.
- Pending invite: show “Convite pendente até DD/MM”, actions **Gerar novo link** and **Revogar convite**.
- Expired invite: show “Convite expirado”, action **Gerar novo link**.
- Active access: show “Acesso ativo”, action **Revogar acesso**.
- Inactive student: no new invite action.

After generating a link:

- Show the full link with **Copiar link**.
- Show warning: “Guarde este link agora. Por segurança, ele não será mostrado novamente.”

### Invite acceptance

Route suggestion: `/accept-student-invite/:token`.

Flow:

1. Show preview with academy name and student full name.
2. If not logged in, offer **Entrar** and **Criar conta**.
3. Sign-up name is prefilled with the student name and editable.
4. After authentication, show confirmation and terms acceptance.
5. Accept terms and activate access.
6. Redirect to `/student` or `/choose-area` if the user also has instructor access.

### Area selection

Route suggestion: `/choose-area`.

Rules:

- Instructor only: redirect to instructor dashboard.
- Student only: redirect to `/student`.
- Both: show **Área do instrutor** and **Área do aluno**.
- User menu shows **Trocar área** when both contexts exist.

### Student area

Route suggestion: `/student`.

Show:

- student name;
- academy name;
- student status;
- read-only notice if inactive but still within 12 months;
- linked class groups;
- upcoming classes for next 7 days from linked class groups only;
- cancelled classes visible as cancelled.

## Testing

Priority tests:

- Instructor can generate an invite for an active student.
- Invite token is stored hash-only and raw token is returned only once.
- Reenviar invalidates previous pending invite and returns a new link.
- Cannot invite inactive student.
- Cannot invite student with active access.
- Public preview shows academy and student name for valid invite.
- Expired invite cannot be accepted.
- Invite cannot be accepted if student became inactive.
- Authenticated user accepts invite and creates student access + acceptance transactionally.
- User with active student access cannot accept another student invite.
- Instructor user can also accept a student invite and then sees area choice.
- Student route is authorized by `student_access`, not organization membership.
- Student dashboard includes only linked class group upcoming classes for next 7 days.
- Inactive student access is read-only for 12 months and blocked after that.

Run validation:

- `pnpm openapi:generate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Browser validation with invite creation, accept flow, area selection, and minimal student dashboard.

## Acceptance checklist

- [x] Data model and migration exist.
- [x] Partial unique indexes enforce one pending invite per student, one active access per student, and one active access per user.
- [x] Contracts expose instructor invite DTOs and student dashboard DTOs.
- [x] Instructor APIs are protected by owner organization role.
- [x] Student APIs are protected by active `student_access`.
- [x] Invite token is hash-only in storage.
- [x] Instructor can generate, regenerate, and revoke invite.
- [x] Instructor can revoke active access.
- [x] Student can accept invite with new account.
- [x] Student can accept invite with existing account.
- [x] Terms version `student-access-v1` is recorded.
- [x] User with instructor and student access can choose area.
- [x] Minimal student dashboard works.
- [x] Inactive student read-only/blocking rules are enforced.
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.
- [x] `pnpm build` passes.
- [x] Flow validated in browser.
