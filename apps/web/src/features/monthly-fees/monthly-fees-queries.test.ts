import { describe, expect, it } from "vitest";
import { monthlyFeesKeys } from "./monthly-fees-queries";

describe("monthlyFeesKeys", () => {
  it("scopes monthly fee lists and details by academy", () => {
    expect(monthlyFeesKeys.list("academy-1", "all")).toEqual([
      "academy",
      "academy-1",
      "monthly-fees",
      "all",
    ]);
    expect(monthlyFeesKeys.detail("academy-1", "fee-1")).not.toEqual(
      monthlyFeesKeys.detail("academy-2", "fee-1"),
    );
  });
});
