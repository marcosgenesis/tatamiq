import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearPendingPlatformSupportActivation,
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
});
