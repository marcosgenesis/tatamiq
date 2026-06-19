import type { PreRegistrationLink } from "@tatamiq/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  preRegistrationLinkQueryKey,
  writePreRegistrationLinkCache,
} from "./pre-registrations-workflow";

describe("pre-registration link cache", () => {
  it("uses the academy-scoped cache key", () => {
    expect(preRegistrationLinkQueryKey("academy-1")).toEqual([
      "academy",
      "academy-1",
      "students",
      "pre-registration-link",
    ]);
    expect(preRegistrationLinkQueryKey("academy-1")).not.toEqual(
      preRegistrationLinkQueryKey("academy-2"),
    );
  });

  it("writes the regenerated link response directly to cache", () => {
    const setQueryData = vi.fn();
    const link = {
      id: "link-1",
      status: "active",
      url: "https://app.tatamiq.com.br/pre-register/new-token",
      regeneratedAt: "2026-06-18T00:01:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z",
    } satisfies PreRegistrationLink;

    writePreRegistrationLinkCache({ setQueryData }, "academy-1", link);

    expect(setQueryData).toHaveBeenCalledWith(preRegistrationLinkQueryKey("academy-1"), link);
  });
});
