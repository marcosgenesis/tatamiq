import { describe, expect, it } from "vitest";
import { hasDifferentDocumentEntryScript } from "./app-update";

describe("hasDifferentDocumentEntryScript", () => {
  it("does not request a reload when the current entry script is still in the latest document", () => {
    expect(
      hasDifferentDocumentEntryScript(
        ["https://app.tatamiq.com/assets/index-current.js"],
        '<script type="module" src="/assets/index-current.js"></script>',
      ),
    ).toBe(false);
  });

  it("requests a reload when a deployed document points at a different entry script", () => {
    expect(
      hasDifferentDocumentEntryScript(
        ["https://app.tatamiq.com/assets/index-old.js"],
        '<script type="module" src="/assets/index-new.js"></script>',
      ),
    ).toBe(true);
  });

  it("ignores pages without a bundled script entry", () => {
    expect(
      hasDifferentDocumentEntryScript([], '<script src="/assets/index-new.js"></script>'),
    ).toBe(false);
  });
});
