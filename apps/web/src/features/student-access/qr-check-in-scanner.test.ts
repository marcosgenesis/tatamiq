import { describe, expect, it } from "vitest";
import { extractCheckInToken } from "./qr-check-in-scanner";

describe("extractCheckInToken", () => {
  it("extracts the token from a check-in URL", () => {
    expect(extractCheckInToken("https://app.tatamiq.com/student/check-in?token=abc123")).toBe(
      "abc123",
    );
  });

  it("ignores the origin so cross-site QRs still work", () => {
    expect(extractCheckInToken("https://staging.tatamiq.dev/student/check-in?token=xyz")).toBe(
      "xyz",
    );
    expect(extractCheckInToken("http://localhost:5173/student/check-in?token=local")).toBe("local");
  });

  it("returns null for a URL without a token", () => {
    expect(extractCheckInToken("https://app.tatamiq.com/student/check-in")).toBeNull();
    expect(extractCheckInToken("https://app.tatamiq.com/student/check-in?token=")).toBeNull();
  });

  it("returns null for non-URL payloads", () => {
    expect(extractCheckInToken("just some text")).toBeNull();
    expect(extractCheckInToken("")).toBeNull();
    expect(extractCheckInToken("   ")).toBeNull();
  });

  it("trims surrounding whitespace before parsing", () => {
    expect(extractCheckInToken("  https://app.tatamiq.com/student/check-in?token=abc  ")).toBe(
      "abc",
    );
  });
});
