import { describe, expect, it } from "vitest";
import { normalizeOrganizationName, normalizeUserName } from "./auth";

describe("normalizeUserName", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeUserName("  Maria   Silva  ")).toBe("Maria Silva");
  });

  it("rejects empty or whitespace-only names", () => {
    expect(() => normalizeUserName("")).toThrow();
    expect(() => normalizeUserName("   ")).toThrow();
    expect(() => normalizeUserName(undefined)).toThrow();
    expect(() => normalizeUserName(null)).toThrow();
  });

  it("rejects single-character names", () => {
    expect(() => normalizeUserName("a")).toThrow();
  });

  it("rejects names longer than 120 characters", () => {
    expect(() => normalizeUserName("a".repeat(121))).toThrow();
  });

  it("accepts a name exactly at the maximum length", () => {
    const name = "a".repeat(120);
    expect(normalizeUserName(name)).toBe(name);
  });
});

describe("normalizeOrganizationName", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeOrganizationName("  Arte   Suave  ")).toBe("Arte Suave");
  });

  it("rejects empty, whitespace-only or single-character names", () => {
    expect(() => normalizeOrganizationName("")).toThrow();
    expect(() => normalizeOrganizationName("   ")).toThrow();
    expect(() => normalizeOrganizationName("x")).toThrow();
  });

  it("rejects names longer than 120 characters", () => {
    expect(() => normalizeOrganizationName("a".repeat(121))).toThrow();
    expect(() => normalizeOrganizationName("Academia ".concat("A".repeat(5000)))).toThrow();
  });
});
