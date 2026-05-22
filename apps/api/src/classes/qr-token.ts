import { createHmac } from "node:crypto";

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

export const QR_WINDOW_SECONDS = WINDOW_SECONDS;

function windowIndex(date: Date): number {
  return Math.floor(date.getTime() / (WINDOW_SECONDS * 1000));
}

function windowStartTime(window: number): Date {
  return new Date(window * WINDOW_SECONDS * 1000);
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
