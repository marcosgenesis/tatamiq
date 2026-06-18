import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingPlatformSupportActivation,
  impersonateWithPendingPlatformSupportActivation,
  queuePlatformSupportActivation,
  readPendingPlatformSupportActivation,
} from "./platform-queries";

const storage = new Map<string, string>();

describe("pending platform support activation", () => {
  beforeEach(() => {
    storage.clear();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        sessionStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
          removeItem: (key: string) => storage.delete(key),
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("persists support activation until the impersonated page load consumes it", () => {
    queuePlatformSupportActivation("support-1");

    expect(readPendingPlatformSupportActivation()).toBe("support-1");

    clearPendingPlatformSupportActivation();
    expect(readPendingPlatformSupportActivation()).toBeNull();
  });

  it("queues support activation before switching to the impersonated session", async () => {
    const impersonateUser = vi.fn(async () => {
      expect(readPendingPlatformSupportActivation()).toBe("support-1");
      return { error: null };
    });

    await impersonateWithPendingPlatformSupportActivation({
      supportSessionId: "support-1",
      userId: "target-user",
      impersonateUser,
    });

    expect(impersonateUser).toHaveBeenCalledWith({ userId: "target-user" });
    expect(readPendingPlatformSupportActivation()).toBe("support-1");
  });

  it("clears pending support activation when impersonation fails", async () => {
    await expect(
      impersonateWithPendingPlatformSupportActivation({
        supportSessionId: "support-1",
        userId: "target-user",
        impersonateUser: async () => ({ error: { message: "denied" } }),
      }),
    ).rejects.toThrow("denied");

    expect(readPendingPlatformSupportActivation()).toBeNull();
  });
});
