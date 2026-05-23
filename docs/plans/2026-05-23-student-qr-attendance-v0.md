# Student QR attendance V0 plan

**Status:** Implemented

## Goal

Complete the student-facing QR attendance slice. An instructor starts an active class and displays a QR Code that opens a student web route. A logged-in student with active **Acesso do Aluno** confirms presence through the QR Code, creating an attendance record with `source = qr`.

## Scope

### Included

- QR Code value points to `/student/check-in?token=...` instead of exposing only the raw token.
- Student check-in web route handles logged-out, loading, success, and error states.
- Authenticated endpoint `POST /student/attendances/qr` validates the signed QR token.
- QR validation accepts current and previous 30-second windows only.
- Confirmation requires active `student_access`.
- Inactive students cannot confirm presence.
- QR must belong to the same academy as the student access.
- Class must still be active and within calculated duration + 15 minutes.
- Duplicate valid attendance for the same student/class is rejected.
- Presence outside the student's linked class group is allowed and marked as out-of-group.

### Deferred

- Student attendance history page.
- Camera/scanner integration inside the app.
- Rich audit timeline for QR confirmations.
- Browser E2E for the full two-account instructor/student flow.

## API

- `POST /student/attendances/qr`
  - Body: `{ token }`
  - Requires authenticated session and active `student_access`.
  - Returns created attendance plus class session summary.

## Web UI

- Instructor active class page renders a QR Code with a web check-in URL.
- `/student/check-in?token=...`:
  - redirects logged-out users to sign-in with return URL;
  - auto-submits for logged-in users;
  - shows success with class and student name;
  - shows clear error state for expired/closed/invalid QR.

## Testing

- Unit tests cover QR validation for current window, previous window, older windows, and tampered tokens.
- Standard validation passed:
  - `pnpm openapi:generate`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `expect-cli` smoke/adversarial browser validation
