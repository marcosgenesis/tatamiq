import { describe, expect, it } from "vitest";
import { invitePreviewStatus, studentReadState } from "./student-access-rules";

describe("student access rules", () => {
  it("treats pending invites past expiresAt as expired without changing stored status", () => {
    expect(
      invitePreviewStatus({
        inviteStatus: "pending",
        studentStatus: "active",
        expiresAt: new Date("2026-05-23T10:00:00Z"),
        now: new Date("2026-05-23T10:00:01Z"),
      }),
    ).toBe("expired");
  });

  it("blocks inactive students from accepting otherwise valid invites", () => {
    expect(
      invitePreviewStatus({
        inviteStatus: "pending",
        studentStatus: "inactive",
        expiresAt: new Date("2026-05-30T10:00:00Z"),
        now: new Date("2026-05-23T10:00:00Z"),
      }),
    ).toBe("unavailable");
  });

  it("keeps inactive student access read-only for twelve months", () => {
    expect(
      studentReadState({
        status: "inactive",
        inactiveAt: new Date("2026-01-01T00:00:00Z"),
        now: new Date("2026-12-31T00:00:00Z"),
      }),
    ).toEqual({ readOnly: true, blocked: false });
  });

  it("blocks inactive student access after twelve months", () => {
    expect(
      studentReadState({
        status: "inactive",
        inactiveAt: new Date("2026-01-01T00:00:00Z"),
        now: new Date("2027-01-02T00:00:00Z"),
      }),
    ).toEqual({ readOnly: true, blocked: true });
  });
});
