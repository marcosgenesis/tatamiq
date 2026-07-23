import { describe, expect, it } from "vitest";
import { classGroupsKeys } from "./class-groups-queries";

describe("classGroupsKeys", () => {
  it("scopes class group lists by active academy", () => {
    expect(classGroupsKeys.list("academy-1", "active")).toEqual([
      "academy",
      "academy-1",
      "class-groups",
      "active",
    ]);
    expect(classGroupsKeys.list("academy-1", "active")).not.toEqual(
      classGroupsKeys.list("academy-2", "active"),
    );
  });

  it("scopes class group student pickers by active academy", () => {
    expect(classGroupsKeys.students("academy-1")).toEqual([
      "academy",
      "academy-1",
      "students",
      "active",
      "for-class-groups",
    ]);
    expect(classGroupsKeys.students("academy-1")).not.toEqual(
      classGroupsKeys.students("academy-2"),
    );
  });
});
