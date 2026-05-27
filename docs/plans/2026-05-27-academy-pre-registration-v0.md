# Academy pre-registration V0 plan

**Status:** Planned

## Goal

Let an **Academia** share a stable public pre-registration link, for example in a WhatsApp group, so interested people can request registration. The instructor reviews requests inside **Alunos**, approves or rejects them, and approval creates the student record plus first access flow.

This is distinct from **Convite do Aluno**. A student invite gives portal access to an existing student record. Pre-registration collects requests from people who are not approved students yet.

## Domain decisions resolved

- Use **Link de Pré-Cadastro da Academia** for the public academy link.
- Use **Solicitação de Pré-Cadastro** for the interested person's request.
- The link belongs to one **Academia**.
- There is one active link per academy.
- The link does not expire automatically.
- Instructor can copy, pause, reactivate, and regenerate the link.
- Link management lives at the top of the **Pré-cadastros** tab inside **Alunos**.
- The public page shows only public academy data: name, logo, address, phone/WhatsApp, Instagram if configured.
- The public page does not show Pix, internal classes, students, fees, or private instructor data.
- The request form collects:
  - full name;
  - birth date;
  - phone/WhatsApp;
  - mandatory email;
  - guardian name and phone when minor;
  - optional note.
- V0 does not confirm email before creating the request.
- V0 does not require login to submit a request.
- The request includes **Consentimento de Pré-Cadastro**.
- Request states: `pending_review`, `approved`, `rejected`.
- Pending requests are read-only for the interested person.
- Rejection has optional internal reason visible only to instructor.
- Rejected requests may be submitted again as a new attempt.
- There cannot be another pending or approved request with the same email in the same academy.
- Same email may be used in different academies.
- Name + birth date matching an existing student in the same academy signals possible duplicate.
- Duplicate approval requires explicit choice:
  - link to existing student;
  - create a new student anyway;
  - reject as duplicate.
- Linking to an existing student is allowed only when that student has no active **Acesso do Aluno**.
- If the request email belongs to an existing Tatamiq account, reuse that account.
- If the request email belongs to an instructor account, allow approval but show a warning.
- If no account exists, approval creates an account reserved for that email.
- The auto-created account cannot log in with password until first access defines one.
- Approval creates an **Aluno Ativo** with:
  - enrollment date equal to approval date;
  - white belt;
  - degree 0;
  - no linked class group;
  - no monthly fee settings.
- Approval also creates **Acesso do Aluno**.
- First portal use still requires **Aceite do Aluno** (`student-access-v1`).
- Approval generates a **Link de Primeiro Acesso**.
- The first access link expires in 7 days.
- Instructor copies the first access link and sends it externally, usually WhatsApp.
- Email through Resend is optional/manual, not automatic on approval.
- After approval, show **Copiar link de primeiro acesso** and secondary **Enviar por email**.
- Resend has dev fallback to console logging when `RESEND_API_KEY` is not configured.
- V0 has minimal anti-spam: rate limit by IP/email; no required CAPTCHA.

See also:

- `CONTEXT.md`
- `docs/adr/0004-single-academy-solo-instructor-v0.md`
- `docs/adr/0005-academy-tenant-isolation.md`
- `docs/adr/0007-better-auth-organization-academy.md`

## Proposed milestones

### Milestone 1 — Pre-registration intake and review

Implement the public link, public form, request storage, instructor queue, duplicate indicators, and reject/approve shell.

Acceptance:

- [x] Instructor can copy pre-registration link from **Alunos > Pré-cadastros**.
- [x] Instructor can pause/reactivate/regenerate the link.
- [x] Public link loads academy public data.
- [x] Paused link blocks new submissions with friendly message.
- [x] Interested person submits request without login.
- [x] Minor requires guardian name and phone.
- [x] Email is mandatory.
- [x] Consent is mandatory.
- [x] Duplicate pending/approved email in same academy is blocked.
- [x] Possible duplicate by name + birth date is shown in instructor queue.
- [x] Instructor can reject with optional internal reason.
- [x] Rejected request can be resubmitted as a new attempt.

### Milestone 2 — Approval, student creation, and first access

Implement approval decisions, student creation defaults, access creation, account reuse/reservation, and first access link.

Acceptance:

- [ ] Approving non-duplicate creates active student with defaults.
- [ ] White belt and degree 0 are applied.
- [ ] Enrollment date is approval date.
- [ ] No class group or monthly settings are configured by default.
- [ ] Approval creates student access.
- [ ] Existing account by email is reused.
- [ ] New account by email is reserved without password login.
- [ ] Existing instructor account by email shows warning but can be approved.
- [ ] Approval produces first access link.
- [ ] First access link expires after 7 days.
- [ ] New account can define password through first access link.
- [ ] Existing account is routed to login/student area through first access link.
- [ ] First student portal access requires `student-access-v1` acceptance.
- [ ] Linking request to existing student is blocked if that student already has active access.

### Milestone 3 — Optional Resend email

Add email infrastructure and optional sending of first access link by email.

Acceptance:

- [ ] API has reusable email service backed by Resend.
- [ ] Env vars documented: `RESEND_API_KEY`, `EMAIL_FROM`, `WEB_APP_URL`.
- [ ] Missing `RESEND_API_KEY` in dev logs email payload instead of failing.
- [ ] After approval, instructor can click **Enviar por email**.
- [ ] Email contains academy name and first access link.
- [ ] Email does not expose internal rejection reasons.
- [ ] Sending email is manual and does not consume quota automatically on every approval.

## Data model sketch

### `academy_pre_registration_links`

- `id`
- `organization_id` unique
- `token_hash` or token slug
- `status`: `active | paused`
- `regenerated_at`
- `created_at`
- `updated_at`

### `pre_registration_requests`

- `id`
- `organization_id`
- `link_id`
- `status`: `pending_review | approved | rejected`
- `name`
- `birth_date`
- `phone`
- `email`
- `guardian_name`
- `guardian_phone`
- `note`
- `consent_accepted_at`
- `reviewed_by_user_id`
- `reviewed_at`
- `rejection_reason`
- `approved_student_id`
- `approved_student_access_id`
- `duplicate_student_id` nullable suggested match
- timestamps

### First access token

Prefer reusing or generalizing the existing student access invite token infrastructure if it can support:

- token expiration of 7 days;
- account password setup for auto-created account;
- routing existing account to login/student area;
- acceptance of student terms before portal access.

If reuse makes terminology confusing in code, create a separate `student_first_access_tokens` table while keeping domain terms distinct.

## API sketch

Public:

- `GET /pre-register/:token`
  - returns public academy profile and link status.
- `POST /pre-register/:token/requests`
  - validates link active;
  - validates required fields;
  - validates guardian for minor;
  - validates consent;
  - blocks duplicate pending/approved email in same academy;
  - creates pending request.

Instructor:

- `GET /students/pre-registration-link`
- `POST /students/pre-registration-link/pause`
- `POST /students/pre-registration-link/reactivate`
- `POST /students/pre-registration-link/regenerate`
- `GET /students/pre-registrations`
- `POST /students/pre-registrations/:id/reject`
- `POST /students/pre-registrations/:id/approve`
  - body includes duplicate decision when applicable.
- `POST /students/pre-registrations/:id/send-first-access-email`

First access:

- `GET /student/first-access/:token`
- `POST /student/first-access/:token/complete`
  - sets password when needed;
  - routes to student acceptance / student area.

## Web UI sketch

### Public pre-registration page

- Academy header with logo/name/public contact.
- Form with required fields.
- Guardian section appears/required for minors.
- Consent checkbox.
- Success state: “Solicitação enviada para análise.”

### Students page

Add tabs:

- **Alunos** — current student list.
- **Pré-cadastros** — link management + request queue.

Request queue shows:

- name, age/birth date, phone, email;
- note;
- duplicate warning if any;
- actions approve/reject.

Approval result shows:

- copied first access link;
- optional send by email action.

## Testing plan

Backend tests:

- public link active/paused behavior;
- request validation;
- minor guardian validation;
- duplicate email block per academy;
- same email allowed in another academy;
- duplicate student suggestion by name + birth date;
- rejection stores internal reason;
- approval creates active student defaults;
- approval creates/reuses account and student access;
- existing active access blocks link-to-existing-student approval;
- first access token expiry;
- Resend fallback logs in dev;
- email send action calls Resend when configured.

Web/manual tests:

- submit public form;
- pause link and verify blocked submit;
- approve simple request;
- approve duplicate with explicit decision;
- reject request;
- copy first access link;
- send email manually;
- first access sets password and requires student terms.

## Open implementation questions

- Exact Better Auth-compatible way to create a reserved account without password login.
- Whether first access token can reuse `student_access_invites` safely or needs separate table.
- Exact white belt lookup rule when academy belt seed is missing or customized.
- Rate-limit storage strategy for V0.
