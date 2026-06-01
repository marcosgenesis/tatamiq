import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { createLinkToken, parseLinkStatus } from "./pre-registration-link-rules";

describe("parseLinkStatus", () => {
  it("accepts active status", () => {
    expect(parseLinkStatus("active")).toBe("active");
  });

  it("accepts paused status", () => {
    expect(parseLinkStatus("paused")).toBe("paused");
  });

  it("rejects invalid status", () => {
    expect(() => parseLinkStatus("invalid")).toThrow(BadRequestException);
  });
});

describe("createLinkToken", () => {
  it("returns a non-empty base64url string", () => {
    const token = createLinkToken();
    expect(token.length).toBeGreaterThan(0);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns unique tokens on consecutive calls", () => {
    const a = createLinkToken();
    const b = createLinkToken();
    expect(a).not.toBe(b);
  });
});
