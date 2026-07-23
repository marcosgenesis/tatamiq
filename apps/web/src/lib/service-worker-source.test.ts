import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const serviceWorkerSource = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");

describe("service worker cache strategy", () => {
  it("does not precache SPA routes that can point at stale bundles", () => {
    expect(serviceWorkerSource).not.toContain('  "/",');
    expect(serviceWorkerSource).not.toContain('  "/student",');
  });

  it("uses network-first fetches for non-navigation assets", () => {
    const fetchAndCacheIndex = serviceWorkerSource.indexOf("async function fetchAndCache");
    const fetchIndex = serviceWorkerSource.indexOf("await fetch(request)", fetchAndCacheIndex);
    const cachedFallbackIndex = serviceWorkerSource.indexOf(
      "if (cached) return cached",
      fetchIndex,
    );

    expect(fetchAndCacheIndex).toBeGreaterThanOrEqual(0);
    expect(fetchIndex).toBeGreaterThan(fetchAndCacheIndex);
    expect(cachedFallbackIndex).toBeGreaterThan(fetchIndex);
  });
});
