import { createHmac, timingSafeEqual } from "node:crypto";

const WINDOW_SECONDS = 30;

export function generateQrToken(
  classSessionId: string,
  organizationId: string,
  secret: string,
  now: Date = new Date(),
): { token: string; previousToken: string; issuedAt: string; expiresAt: string } {
  const currentWindow = windowIndex(now);
  const previousWindow = currentWindow - 1;

  return {
    token: signPayload(classSessionId, organizationId, currentWindow, secret),
    previousToken: signPayload(classSessionId, organizationId, previousWindow, secret),
    issuedAt: windowStartTime(currentWindow).toISOString(),
    expiresAt: windowStartTime(currentWindow + 1).toISOString(),
  };
}

export function verifyQrToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): { classSessionId: string; organizationId: string } | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const [classSessionId, organizationId, windowValue] = payload.split(":");
  const tokenWindow = Number(windowValue);
  if (!classSessionId || !organizationId || !Number.isInteger(tokenWindow)) return null;

  const currentWindow = windowIndex(now);
  if (tokenWindow !== currentWindow && tokenWindow !== currentWindow - 1) return null;

  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) return null;

  return { classSessionId, organizationId };
}

export const QR_WINDOW_SECONDS = WINDOW_SECONDS;

function windowIndex(date: Date): number {
  return Math.floor(date.getTime() / (WINDOW_SECONDS * 1000));
}

function windowStartTime(window: number): Date {
  return new Date(window * WINDOW_SECONDS * 1000);
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function signPayload(
  classSessionId: string,
  organizationId: string,
  window: number,
  secret: string,
): string {
  const payload = `${classSessionId}:${organizationId}:${window}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}
