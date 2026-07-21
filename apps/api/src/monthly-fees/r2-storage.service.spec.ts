import { describe, expect, it, vi } from "vitest";
import { RealR2StorageService } from "./r2-storage.service";

describe("RealR2StorageService deletion", () => {
  it("throws when R2 reports per-object delete errors", async () => {
    const client = {
      send: vi
        .fn()
        .mockResolvedValue({ Errors: [{ Key: "receipts/1/file", Code: "AccessDenied" }] }),
    };
    const service = new RealR2StorageService(client as never);

    await expect(service.deleteObjects(["receipts/1/file"])).rejects.toThrow(
      "Failed to delete 1 storage object(s).",
    );
  });

  it("extracts configured public URLs back to storage keys", () => {
    process.env.R2_PUBLIC_URL = "https://cdn.example";
    const service = new RealR2StorageService();

    expect(service.extractFileKey("https://cdn.example/logos/org-1/file.png")).toBe(
      "logos/org-1/file.png",
    );
    expect(service.extractFileKey("logos/org-1/file.png")).toBe("logos/org-1/file.png");
    expect(service.extractFileKey("https://other.example/logos/org-1/file.png")).toBeNull();
  });
});
