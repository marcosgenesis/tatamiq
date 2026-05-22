import { describe, expect, it } from "vitest";
import { canTransition } from "./class-rules";

describe("class state transitions", () => {
  it("allows scheduled → active", () => {
    expect(canTransition("scheduled", "active")).toBe(true);
  });

  it("allows scheduled → cancelled", () => {
    expect(canTransition("scheduled", "cancelled")).toBe(true);
  });

  it("allows active → ended", () => {
    expect(canTransition("active", "ended")).toBe(true);
  });

  it("rejects cancelled → active", () => {
    expect(canTransition("cancelled", "active")).toBe(false);
  });

  it("rejects ended → active", () => {
    expect(canTransition("ended", "active")).toBe(false);
  });

  it("rejects active → scheduled", () => {
    expect(canTransition("active", "scheduled")).toBe(false);
  });

  it("rejects ended → ended", () => {
    expect(canTransition("ended", "ended")).toBe(false);
  });
});
