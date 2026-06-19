import { createHmac, timingSafeEqual } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { resolveBetterAuthSecret } from "../auth";

const UPLOAD_KEY_SIGNATURE_TTL_SECONDS = 10 * 60;

type UploadKeyPurpose = "receipt" | "academy-logo";

type UploadKeyPayload = {
  purpose: UploadKeyPurpose;
  organizationId: string;
  subjectId: string;
  fileKey: string;
  expiresAt: string;
  studentId?: string;
};

type UploadKeyContext = Omit<UploadKeyPayload, "expiresAt">;

export function issueUploadKeySignature(
  context: UploadKeyContext,
  now: Date = new Date(),
): { fileKeySignature: string; expiresAt: string } {
  const expiresAt = new Date(now.getTime() + UPLOAD_KEY_SIGNATURE_TTL_SECONDS * 1000).toISOString();
  const payload: UploadKeyPayload = { ...context, expiresAt };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const digest = sign(encodedPayload);

  return {
    fileKeySignature: `${encodedPayload}.${digest}`,
    expiresAt,
  };
}

export function assertValidUploadKeySignature(
  context: UploadKeyContext,
  fileKeySignature: string,
  now: Date = new Date(),
): void {
  const [encodedPayload, digest, ...extra] = fileKeySignature.split(".");
  if (!encodedPayload || !digest || extra.length > 0) throw invalidUpload();

  const expectedDigest = sign(encodedPayload);
  if (!safeEqual(digest, expectedDigest)) throw invalidUpload();

  const payload = parsePayload(encodedPayload);
  if (!payload) throw invalidUpload();

  if (Date.parse(payload.expiresAt) <= now.getTime()) throw invalidUpload();
  if (payload.purpose !== context.purpose) throw invalidUpload();
  if (payload.organizationId !== context.organizationId) throw invalidUpload();
  if (payload.subjectId !== context.subjectId) throw invalidUpload();
  if (payload.fileKey !== context.fileKey) throw invalidUpload();
  if ((payload.studentId ?? null) !== (context.studentId ?? null)) throw invalidUpload();
}

function parsePayload(encodedPayload: string): UploadKeyPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (
      parsed &&
      (parsed.purpose === "receipt" || parsed.purpose === "academy-logo") &&
      typeof parsed.organizationId === "string" &&
      typeof parsed.subjectId === "string" &&
      typeof parsed.fileKey === "string" &&
      typeof parsed.expiresAt === "string" &&
      (parsed.studentId === undefined || typeof parsed.studentId === "string")
    ) {
      return parsed;
    }
  } catch {
    // handled by returning null
  }
  return null;
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", resolveBetterAuthSecret()).update(encodedPayload).digest("base64url");
}

function safeEqual(value: string, expected: string): boolean {
  const valueBuffer = Buffer.from(value, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");
  return (
    valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer)
  );
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function invalidUpload(): BadRequestException {
  return new BadRequestException("Upload inválido ou expirado.");
}
