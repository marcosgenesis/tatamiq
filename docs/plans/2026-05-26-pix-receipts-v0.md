# Pix receipts and payment verification V0 plan

**Status:** Implemented

## Goal

Complete the V0 Pix payment verification flow end-to-end. A student can submit or replace a Pix receipt for a specific monthly fee, and an instructor can review the active pending receipt, approve it, or reject it with a visible reason.

This slice turns the existing backend foundation into an operable product flow for pilot use.

## Current state

Already exists:

- Academy Pix configuration in settings.
- `monthly_fees`, `payment_receipts`, and `monthly_fee_events` tables.
- Instructor-side monthly fee list and manual actions.
- Backend methods for upload URL generation, receipt confirmation, approval, and rejection.
- Student monthly fee listing.
- R2 upload helper.

Known gaps:

- Student portal does not yet expose receipt upload/substitution UI.
- Student-safe endpoints are needed for receipt upload/substitution and receipt file access.
- Current upload flow blocks a second pending receipt; V0 now allows replacement.
- Receipt files should move from public URLs to private file keys + signed view/download URLs.
- Instructor UI needs a review detail flow before approve/reject.
- Dashboard needs a lightweight card/shortcut for payments under review.

## Domain decisions resolved

- A **Comprovante Pix** always belongs to one **Mensalidade**.
- A student sends a receipt from the monthly fee entry in the student portal.
- Receipt upload is allowed even if **Pix da Academia** is not configured, because the instructor may have provided payment instructions outside the app.
- A receipt can include an optional student note for the instructor.
- The note belongs to the receipt, not to the monthly fee.
- A student can replace a pending receipt before instructor review.
- Replaced receipts are preserved in history, marked as replaced.
- Replacing a pending receipt keeps the monthly fee in `under_review`.
- Only the active pending receipt can be approved or rejected.
- Approval marks the full monthly fee as paid immediately, with `paidAt` equal to approval time.
- Rejection requires a free-text reason and returns the monthly fee to `open`; visual overdue remains derived.
- Student can send receipt for `open`/derived `overdue`, replace for `under_review`, and cannot send for `paid` or `waived`.
- Student portal shows only the last relevant receipt.
- Instructor detail can show complete receipt history, with substituted/rejected/approved receipts collapsed or secondary.
- No external notifications in V0.
- Student receives an internal financial indicator for receipt approval/rejection.
- Financial indicator clears when the student opens the monthly fees section.
- Receipt files are private: store file keys and serve short-lived signed URLs.
- Signed receipt view/download URLs expire after 5 minutes.
- No audit event for viewing/downloading a receipt in V0.
- Receipt replacement creates a `receipt_replaced` monthly fee event authored by the student user.

See also:

- `CONTEXT.md`
- `docs/adr/0002-manual-pix-verification.md`
- `docs/adr/0009-overdue-status-calculated-not-persisted.md`
- `docs/adr/0010-private-payment-receipt-files.md`

## Prototype

The throwaway logic prototype was absorbed into the implementation and removed.

## Data model changes

### `payment_receipts`

Add/adjust fields:

- `file_key` text not null — private R2 key used for signed URLs.
- `file_url` should become unused/deprecated or removed in a migration if safe.
- `note` text nullable — optional student note for the instructor.
- `status` supports: `pending | approved | rejected | replaced`.
- `replaced_at` timestamp nullable, optional if useful for history display.

### `monthly_fee_events`

Add event type:

- `receipt_replaced`

Metadata should include:

- `previousReceiptId`
- `newReceiptId`

## Backend/API plan

### Student-scoped endpoints

Add endpoints under `/student/monthly-fees/:id/...`, scoped through active student access:

- `POST /student/monthly-fees/:id/upload-url?contentType=...`
  - validates fee belongs to current student;
  - allows `open` and `under_review`;
  - rejects `paid` and `waived`;
  - allows image/PDF content types only;
  - returns presigned upload URL and `fileKey`.

- `POST /student/monthly-fees/:id/receipts`
  - validates fee belongs to current student;
  - validates file size <= 10 MB;
  - if an active pending receipt exists, mark it `replaced`;
  - creates new `pending` receipt with optional note;
  - sets monthly fee to `under_review`;
  - creates `receipt_replaced` event when replacing;
  - preserves existing rejected/approved/replaced receipts.

- `GET /student/monthly-fees/:id/receipts/:receiptId/view-url`
  - validates receipt belongs to current student's fee;
  - returns a signed URL valid for 5 minutes;
  - intended for the last relevant receipt visible to the student.

### Instructor endpoints

Adjust existing instructor endpoints:

- Receipt confirmation/submission can remain for instructor if needed, but student flow should not depend on `@OrgRoles(["owner"])` endpoints.
- Approval/rejection must only operate on the active pending receipt.
- Add `GET /monthly-fees/:id/receipts/:receiptId/view-url` for instructor-signed access.
- List/detail responses should include receipt note, status, and enough metadata to distinguish active pending from history.

### R2 storage

- Store `fileKey`, not public URL.
- Add method for signed read URL, 5-minute expiry.
- Keep presigned upload URL for direct browser upload.

## Web UI state machine

Use a lightweight UI state machine without adding a dependency like XState.

Suggested file:

- `apps/web/src/features/monthly-fees/receipt-state.ts`

Responsibilities:

- derive student CTA;
- derive instructor actions;
- identify active pending receipt;
- identify last relevant receipt;
- expose upload states;
- expose display messages.

Suggested states/actions:

```ts
type ReceiptUiStatus =
  | "can_send"
  | "uploading"
  | "can_replace"
  | "under_review"
  | "paid"
  | "waived"
  | "error";
```

Student CTA matrix:

- `open` / derived `overdue`: `Enviar comprovante`
- `under_review`: `Substituir comprovante`
- `paid`: no CTA, show `Pago`
- `waived`: no CTA, show `Dispensado`

Backend remains the source of truth and must revalidate every transition.

## Student portal UI

In the monthly fees section:

- show Pix da Academia when configured;
- if Pix is not configured, show: “Confirme os dados de pagamento com o instrutor.”;
- still allow receipt upload without Pix configured;
- show accepted file types and 10 MB limit;
- allow optional note;
- show last relevant receipt status:
  - pending: “Em verificação”;
  - rejected: show rejection reason and allow resend;
  - approved: show paid status;
  - replaced: not shown as primary state.
- allow “Abrir comprovante” for the last relevant receipt via signed URL.
- clear financial indicator when entering/opening monthly fees section.

## Instructor monthly fees UI

In `/monthly-fees`:

- ensure `under_review` filter/fila is usable.
- add detail drawer for a monthly fee.
- for `under_review`, show:
  - active pending receipt;
  - student note summary/full note;
  - button “Abrir comprovante” using signed URL;
  - actions “Aprovar” and “Rejeitar”.
- reject action requires free-text reason.
- approve/reject are not available directly in the table row.
- history section shows older receipts collapsed or secondary:
  - replaced;
  - rejected;
  - approved.
- substituted receipts are not actionable.

## Dashboard UI

Add a lightweight instructor dashboard card:

- label: “Pagamentos em verificação”;
- count monthly fees with `under_review`;
- link to `/monthly-fees?status=under_review` or equivalent route state.

No duplicated review UI in dashboard.

## Testing plan

Backend behavior tests:

- student can upload receipt for own open fee.
- student cannot upload for another student's fee.
- student can upload without academy Pix configured.
- upload rejects unsupported file types.
- confirm rejects files over 10 MB.
- submitting first receipt sets fee to `under_review`.
- replacing pending receipt marks old receipt `replaced`, creates new `pending`, keeps fee `under_review`.
- replacement creates `receipt_replaced` event with student author.
- instructor can approve only pending active receipt.
- instructor cannot approve replaced receipt.
- approval sets fee `paid` and `paidAt`.
- rejection requires reason and returns fee to `open`.
- rejected overdue fee appears overdue by calculation.
- signed view URL is scoped by student/instructor ownership.

Web tests/manual validation:

- student sees send/replace CTA matrix.
- student can upload and add note.
- student sees rejection reason.
- student financial indicator clears on opening fees.
- instructor opens review drawer, views signed URL, approves.
- instructor rejects with reason.
- history shows replaced receipt as non-actionable.

Validation commands:

```bash
pnpm --filter @tatamiq/api typecheck
pnpm --filter @tatamiq/web typecheck
pnpm test
```

Run focused browser validation after UI work.

## Acceptance checklist

- [ ] Domain docs reflect replacement, optional note, and private receipt files.
- [ ] ADR for private receipt files exists.
- [x] Database supports receipt `fileKey`, optional note, and `replaced` status.
- [x] Monthly fee events support `receipt_replaced`.
- [x] Student endpoints are scoped to the authenticated student.
- [x] Student can send receipt for open/overdue fee.
- [x] Student can send receipt even without configured Pix.
- [x] Student can replace pending receipt.
- [x] Replaced receipt is preserved and not actionable.
- [x] Fee remains `under_review` after replacement.
- [x] Instructor can review active pending receipt from monthly fee detail.
- [x] Instructor can open receipt via signed URL expiring in 5 minutes.
- [x] Instructor can approve active pending receipt.
- [x] Instructor can reject active pending receipt with reason.
- [x] Student sees approval/rejection indicator.
- [x] Student indicator clears when monthly fees section is opened.
- [x] Dashboard links to payments under review.
- [x] API typecheck passes.
- [x] Web typecheck passes.
- [x] Relevant tests pass.
- [x] Prototype is deleted or decisions are absorbed after implementation.
