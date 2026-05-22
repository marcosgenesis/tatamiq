import { describe, expect, it } from "vitest";
import { canAddAttendance, canInvalidateAttendance } from "./attendance-rules";

describe("canAddAttendance", () => {
  it("allows adding to an active class", () => {
    expect(canAddAttendance("active")).toEqual({ allowed: true });
  });

  it("allows adding to an ended class", () => {
    expect(canAddAttendance("ended")).toEqual({ allowed: true });
  });

  it("rejects adding to a scheduled class", () => {
    const result = canAddAttendance("scheduled");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBeDefined();
  });

  it("rejects adding to a cancelled class", () => {
    const result = canAddAttendance("cancelled");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBeDefined();
  });
});

describe("canInvalidateAttendance", () => {
  it("allows invalidating a valid attendance", () => {
    expect(canInvalidateAttendance(null)).toEqual({ allowed: true });
  });

  it("rejects invalidating an already-invalidated attendance", () => {
    const result = canInvalidateAttendance(new Date().toISOString());
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBeDefined();
  });
});
