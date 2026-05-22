import { describe, expect, it } from "vitest";
import { generateQrToken, QR_WINDOW_SECONDS } from "./qr-token";

const SECRET = "test-secret-minimum-32-chars-for-hmac";
const SESSION_ID = "session-1";
const ORG_ID = "org-1";

describe("QR token generation", () => {
  it("includes class session id and organization id in token payload", () => {
    const result = generateQrToken(SESSION_ID, ORG_ID, SECRET);
    const payload = decodePayload(result.token);
    expect(payload).toContain(SESSION_ID);
    expect(payload).toContain(ORG_ID);
  });

  it("produces different tokens across 30-second windows", () => {
    const t1 = new Date("2026-05-22T10:00:00.000Z");
    const t2 = new Date("2026-05-22T10:00:31.000Z");

    const token1 = generateQrToken(SESSION_ID, ORG_ID, SECRET, t1).token;
    const token2 = generateQrToken(SESSION_ID, ORG_ID, SECRET, t2).token;

    expect(token1).not.toBe(token2);
  });

  it("produces the same token within the same 30-second window", () => {
    const t1 = new Date("2026-05-22T10:00:00.000Z");
    const t2 = new Date("2026-05-22T10:00:29.000Z");

    const token1 = generateQrToken(SESSION_ID, ORG_ID, SECRET, t1).token;
    const token2 = generateQrToken(SESSION_ID, ORG_ID, SECRET, t2).token;

    expect(token1).toBe(token2);
  });

  it("returns the previous window token for grace period", () => {
    const t1 = new Date("2026-05-22T10:00:00.000Z");
    const t2 = new Date("2026-05-22T10:00:30.000Z");

    const first = generateQrToken(SESSION_ID, ORG_ID, SECRET, t1);
    const second = generateQrToken(SESSION_ID, ORG_ID, SECRET, t2);

    expect(second.previousToken).toBe(first.token);
  });

  it("returns window metadata with correct timing", () => {
    const now = new Date("2026-05-22T10:00:15.000Z");
    const result = generateQrToken(SESSION_ID, ORG_ID, SECRET, now);

    expect(new Date(result.expiresAt).getTime() - new Date(result.issuedAt).getTime()).toBe(
      QR_WINDOW_SECONDS * 1000,
    );
  });

  it("produces different tokens for different sessions", () => {
    const now = new Date("2026-05-22T10:00:00.000Z");
    const token1 = generateQrToken("session-a", ORG_ID, SECRET, now).token;
    const token2 = generateQrToken("session-b", ORG_ID, SECRET, now).token;

    expect(token1).not.toBe(token2);
  });

  it("produces different tokens with different secrets", () => {
    const now = new Date("2026-05-22T10:00:00.000Z");
    const token1 = generateQrToken(
      SESSION_ID,
      ORG_ID,
      "secret-one-32-chars-long-enough!",
      now,
    ).token;
    const token2 = generateQrToken(
      SESSION_ID,
      ORG_ID,
      "secret-two-32-chars-long-enough!",
      now,
    ).token;

    expect(token1).not.toBe(token2);
  });
});

function decodePayload(token: string): string {
  const [encoded] = token.split(".");
  return Buffer.from(encoded, "base64url").toString("utf-8");
}
