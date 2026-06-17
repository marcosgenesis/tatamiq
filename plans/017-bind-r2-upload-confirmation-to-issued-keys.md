# Plan 017: Bind R2 upload confirmations to server-issued file keys

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4fa3aa3..HEAD -- packages/contracts/src/schemas.ts packages/contracts/openapi.json packages/contracts/src/generated/openapi.ts apps/api/src/monthly-fees/monthly-fees.service.ts apps/api/src/monthly-fees/monthly-fee-lifecycle.ts apps/api/src/monthly-fees/monthly-fees.service.spec.ts apps/api/src/academy/academy.service.ts apps/api/src/academy/academy.dto.ts apps/web/src/features/student-portal/student-monthly-fees-section.tsx apps/web/src/features/settings/settings-page.tsx apps/web/src/features/auth/academy-onboarding-page.tsx`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `4fa3aa3`, 2026-06-16
- **Issue**: https://github.com/marcosgenesis/tatamiq/issues/183

## Why this matters

Comprovante Pix and academy logo uploads use presigned R2 URLs, but the subsequent confirmation accepts any non-empty `fileKey` from the client. A malicious or buggy client can attach a different key than the one the server just issued, and later signed-read endpoints will generate read URLs for that stored key. This plan cryptographically binds confirmation to the server-issued file key and expected upload purpose without adding a database table.

## Current state

Relevant files:

- `apps/api/src/monthly-fees/monthly-fees.service.ts` — issues receipt upload URLs, confirms receipts, and later signs receipt read URLs.
- `apps/api/src/monthly-fees/monthly-fee-lifecycle.ts` — persists `input.fileKey` into `payment_receipts`.
- `apps/api/src/academy/academy.service.ts` — issues logo upload URLs and stores `fileKey` as academy logo URL.
- `packages/contracts/src/schemas.ts` — API schemas for upload URL and confirmation payloads.
- Web files listed in scope — call upload-url then confirm with only `fileKey` today.

Current excerpts:

```ts
// apps/api/src/monthly-fees/monthly-fees.service.ts:270-273
const fileKey = `receipts/${organizationId}/${feeId}/${crypto.randomUUID()}`;
const uploadUrl = await this.r2.generatePresignedUrl(fileKey, contentType);

return { uploadUrl, fileKey };
```

```ts
// apps/api/src/monthly-fees/monthly-fees.service.ts:276-289
async confirmReceipt(
  organizationId: string,
  feeId: string,
  userId: string,
  input: ConfirmReceiptInput,
  studentId?: string,
): Promise<MonthlyFeeDetail> {
  this.validateReceiptFileType(input.fileType);
  // size check only; no proof that input.fileKey was issued for this fee/student
  await this.lifecycle.submitReceipt(organizationId, feeId, userId, input, studentId);
```

```ts
// apps/api/src/monthly-fees/monthly-fee-lifecycle.ts:208-211
fileKey: input.fileKey,
fileUrl: null,
fileType: input.fileType,
fileSizeBytes: input.fileSizeBytes,
```

```ts
// apps/api/src/monthly-fees/monthly-fees.service.ts:335
viewUrl: await this.r2.generateReadUrl(receipt.fileKey, 5 * 60),
```

```ts
// apps/api/src/academy/academy.service.ts:59-67
const fileKey = `logos/${organizationId}/${crypto.randomUUID()}`;
const uploadUrl = await this.r2.generatePresignedUrl(fileKey, "image/*");
return { uploadUrl, fileKey };
// ...
const logoUrl = this.r2.getPublicUrl(fileKey);
```

```ts
// packages/contracts/src/schemas.ts:646-655
export const uploadUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  fileKey: z.string(),
});

export const confirmReceiptSchema = z.object({
  fileKey: z.string().min(1),
  fileType: z.string().min(1),
```

Existing convention to match: contracts are Zod-first in `packages/contracts/src/schemas.ts`; DTOs wrap schemas with `createZodDto`; generated OpenAPI files are updated by `pnpm openapi:generate`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Generate API contracts | `pnpm openapi:generate` | exit 0; generated files updated if schemas changed |
| Targeted API tests | `pnpm --filter @tatamiq/api test -- src/monthly-fees/monthly-fees.service.spec.ts` | exit 0 |
| Web tests | `pnpm --filter @tatamiq/web test` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0; existing warnings may remain |
| Full tests | `pnpm test` | exit 0 |

## Scope

**In scope**:

- `packages/contracts/src/schemas.ts`
- `packages/contracts/openapi.json`
- `packages/contracts/src/generated/openapi.ts`
- `apps/api/src/monthly-fees/monthly-fees.service.ts`
- `apps/api/src/monthly-fees/monthly-fee-lifecycle.ts` only if type changes require it
- `apps/api/src/monthly-fees/monthly-fees.service.spec.ts`
- `apps/api/src/academy/academy.service.ts`
- `apps/api/src/academy/academy.dto.ts` only if DTO type names need updates
- `apps/web/src/features/student-portal/student-monthly-fees-section.tsx`
- `apps/web/src/features/settings/settings-page.tsx`
- `apps/web/src/features/auth/academy-onboarding-page.tsx`

**Out of scope**:

- Do not change R2 bucket architecture or move uploads through the API server.
- Do not introduce a database table for upload intents unless HMAC binding is impossible.
- Do not change receipt review/approval business rules.
- Do not change platform sensitive-file read auditing.

## Git workflow

- Branch: `advisor/017-bind-r2-upload-keys`
- Commit message style: Conventional Commits, e.g. `fix(api): bind R2 upload confirmations to issued keys`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add signed upload-key proof to contracts

In `packages/contracts/src/schemas.ts`:

1. Extend `uploadUrlResponseSchema` and `academyLogoUploadResponseSchema` with:
   - `fileKeySignature: z.string().min(1)`
   - `expiresAt: z.string().datetime()`
2. Extend `confirmReceiptSchema` and `academyConfirmLogoSchema` with:
   - `fileKeySignature: z.string().min(1)`

Keep existing fields for compatibility inside the codebase, but all web callers must send the new signature after this plan.

**Verify**: `pnpm --filter @tatamiq/contracts typecheck` → exits 0.

### Step 2: Implement upload key signing in the API

Add a small helper in `apps/api/src/monthly-fees/monthly-fees.service.ts` or a new in-scope helper file only if necessary. The helper should:

- Sign a payload containing at least `purpose`, `organizationId`, `subjectId` (fee ID or academy ID), `fileKey`, and `expiresAt`.
- Use an existing server secret resolver (`resolveQrTokenSecret` or `resolveBetterAuthSecret`) rather than adding a new required env var in this plan.
- Use HMAC SHA-256 and `timingSafeEqual` for verification.
- Reject expired signatures.

Suggested conceptual payloads:

- Receipt upload: purpose `receipt`, organization ID, fee ID, optional student ID if present, file key.
- Logo upload: purpose `academy-logo`, organization ID, academy ID, file key.

Do not include raw secret values in tests or logs.

**Verify**: `pnpm typecheck` → exits 0.

### Step 3: Issue and verify signatures for receipt uploads

In `MonthlyFeesService.generateUploadUrl`:

- Keep the existing file key prefix: `receipts/${organizationId}/${feeId}/${uuid}`.
- Return `fileKeySignature` and `expiresAt` along with `uploadUrl` and `fileKey`.
- Use a short expiry aligned with the presigned URL expiry (currently 600 seconds).

In `MonthlyFeesService.confirmReceipt`:

- Verify `input.fileKeySignature` before calling `submitReceipt`.
- Verify the signed payload matches the exact `organizationId`, `feeId`, `studentId` context, and `input.fileKey`.
- Also perform a simple prefix check so only `receipts/${organizationId}/${feeId}/...` keys are accepted.
- On mismatch/expiry, throw `BadRequestException("Upload inválido ou expirado.")` or similar.

Keep existing content type and 10 MB checks.

**Verify**: `pnpm --filter @tatamiq/api test -- src/monthly-fees/monthly-fees.service.spec.ts` → exits 0 after Step 5 tests are added.

### Step 4: Issue and verify signatures for academy logos

In `AcademyService.generateLogoUploadUrl`:

- Return `fileKeySignature` and `expiresAt` with the logo upload URL.
- Sign purpose `academy-logo`, `organizationId`, and `fileKey`.

In `AcademyService.confirmLogo`:

- Require the signature from the DTO/body.
- Verify it matches the exact organization and file key.
- Verify the key prefix is `logos/${organizationId}/...`.

Update `AcademyController.confirmLogo` only if the method signature needs to pass the signature to the service.

**Verify**: `pnpm typecheck` → exits 0.

### Step 5: Add regression tests for rejected forged keys

In `apps/api/src/monthly-fees/monthly-fees.service.spec.ts`, add tests proving:

- A receipt upload URL response includes `fileKeySignature` and `expiresAt`.
- `confirmReceipt` rejects a different `fileKey` even if it has a valid-looking prefix.
- `confirmReceipt` rejects a valid signature used for a different `feeId` or `studentId` context.
- Existing in-scope receipt read behavior still works.

If there is no academy service test scaffold, either create `apps/api/src/academy/academy.service.spec.ts` or include logo-signature coverage through a small helper export. Prefer service tests over controller tests.

**Verify**: `pnpm --filter @tatamiq/api test -- src/monthly-fees/monthly-fees.service.spec.ts` → exits 0.

### Step 6: Update web upload callers

Update all web callers that confirm an upload:

- `apps/web/src/features/student-portal/student-monthly-fees-section.tsx`
- `apps/web/src/features/settings/settings-page.tsx`
- `apps/web/src/features/auth/academy-onboarding-page.tsx`

After `api.POST(.../upload-url)`, include `uploadData.fileKeySignature` in the confirm request body. Keep the existing direct `fetch(uploadData.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } })` flow.

Add a client-side file size guard for receipts and logos if one is missing, but do not rely on it as security enforcement.

**Verify**: `pnpm --filter @tatamiq/web typecheck` → exits 0.

### Step 7: Regenerate OpenAPI/client types

Run the repo’s OpenAPI generation after schema/API changes.

**Verify**: `pnpm openapi:generate` → exits 0 and updates generated files as needed.

### Step 8: Run full verification

Run:

- `pnpm typecheck` → exits 0.
- `pnpm lint` → exits 0; existing warnings may remain.
- `pnpm test` → exits 0.

## Test plan

- Update or add API tests for HMAC signature issuance/verification and forged-key rejection.
- Web typecheck confirms all callers now pass `fileKeySignature`.
- Run `pnpm openapi:generate` so contracts and generated client types stay aligned.

## Done criteria

All must hold:

- [ ] Upload URL responses for receipts and logos include `fileKeySignature` and `expiresAt`.
- [ ] Receipt and logo confirmation require and verify the signature.
- [ ] A signature cannot be replayed for another fee, academy, student context, purpose, or file key.
- [ ] Stored receipt/logo keys are still under the expected per-organization prefixes.
- [ ] Web callers pass the returned signature to confirmation endpoints.
- [ ] `pnpm openapi:generate`, `pnpm typecheck`, `pnpm lint`, and `pnpm test` exit 0.
- [ ] No files outside the in-scope list are modified, except generated OpenAPI files listed above.
- [ ] `plans/README.md` status row for Plan 017 is updated.

## STOP conditions

Stop and report if:

- The API/client contract has already changed away from `fileKey` confirmation.
- HMAC signing cannot be implemented without introducing a new persisted upload-intent table.
- R2/S3 presigned URL behavior requires changing bucket policy or infrastructure.
- OpenAPI generation fails because unrelated generated contracts are stale or broken.

## Maintenance notes

This plan binds the confirmation step to the issued key; it does not prove that R2 actually received the uploaded object or enforce upload size at R2. If later abuse/cost concerns appear, consider a separate upload-intent table plus object metadata verification or R2 lifecycle cleanup.
