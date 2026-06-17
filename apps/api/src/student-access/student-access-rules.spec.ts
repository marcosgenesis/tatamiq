import { describe, expect, it } from "vitest";
import {
  canStudentPortalWrite,
  hashToken,
  invitePreviewStatus,
  studentReadState,
} from "./student-access-rules";

describe("student access rules", () => {
  it("hashes tokens with SHA-256 hex", () => {
    expect(hashToken("token")).toBe(
      "3c469e9d6c5875d37a43f353d4f88e61fcf812c66eee3457465a40b0da4153e0",
    );
  });

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

  it("keeps active student access writable", () => {
    const state = studentReadState({
      status: "active",
      inactiveAt: null,
      now: new Date("2026-01-01T00:00:00Z"),
    });

    expect(state).toEqual({ readOnly: false, blocked: false });
    expect(canStudentPortalWrite(state.readOnly)).toBe(true);
  });

  it("keeps inactive student access read-only for twelve months", () => {
    expect(
      studentReadState({
        status: "inactive",
        inactiveAt: new Date("2026-01-01T00:00:00Z"),
        now: new Date("2026-12-31T00:00:00Z"),
      }),
    ).toEqual({ readOnly: true, blocked: false });
    expect(canStudentPortalWrite(true)).toBe(false);
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
