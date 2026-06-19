import { describe, expect, it } from "vitest";
import { sessionQueryKey, studentQueryKey } from "./session-query-keys";

describe("sessionQueryKey", () => {
  it("scopes cache keys by authenticated user", () => {
    expect(sessionQueryKey("user-1", "platform", "dashboard")).toEqual([
      "session",
      "user-1",
      "platform",
      "dashboard",
    ]);
    expect(sessionQueryKey("user-1", "student", "me")).not.toEqual(
      sessionQueryKey("user-2", "student", "me"),
    );
  });
});

describe("studentQueryKey", () => {
  it("keeps student portal data isolated per user", () => {
    expect(studentQueryKey("student-user", "monthly-fees")).toEqual([
      "session",
      "student-user",
      "student",
      "monthly-fees",
    ]);
  });
});
