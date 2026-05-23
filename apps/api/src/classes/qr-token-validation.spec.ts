import { describe, expect, it } from "vitest";
import { generateQrToken, verifyQrToken } from "./qr-token";

const secret = "test-secret-with-enough-length";

describe("QR token validation", () => {
  it("accepts the current QR token window", () => {
    const now = new Date("2026-05-23T10:00:15.000Z");
    const { token } = generateQrToken("class-1", "academy-1", secret, now);

    expect(verifyQrToken(token, secret, now)).toEqual({
      classSessionId: "class-1",
      organizationId: "academy-1",
    });
  });

  it("accepts the previous QR token window as short tolerance", () => {
    const previous = new Date("2026-05-23T10:00:15.000Z");
    const now = new Date("2026-05-23T10:00:31.000Z");
    const { token } = generateQrToken("class-1", "academy-1", secret, previous);

    expect(verifyQrToken(token, secret, now)).toEqual({
      classSessionId: "class-1",
      organizationId: "academy-1",
    });
  });

  it("rejects older QR token windows", () => {
    const old = new Date("2026-05-23T10:00:15.000Z");
    const now = new Date("2026-05-23T10:01:01.000Z");
    const { token } = generateQrToken("class-1", "academy-1", secret, old);

    expect(verifyQrToken(token, secret, now)).toBeNull();
  });

  it("rejects tampered tokens", () => {
    const now = new Date("2026-05-23T10:00:15.000Z");
    const { token } = generateQrToken("class-1", "academy-1", secret, now);

    expect(verifyQrToken(`${token}x`, secret, now)).toBeNull();
  });
});
