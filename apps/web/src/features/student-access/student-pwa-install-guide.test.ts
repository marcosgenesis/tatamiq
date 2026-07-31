import { describe, expect, it } from "vitest";
import { detectInstallBrowser } from "./student-pwa-install-guide";

describe("detectInstallBrowser", () => {
  it("recognizes Safari on iPhone and iPad", () => {
    expect(
      detectInstallBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("ios");

    expect(
      detectInstallBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 5),
    ).toBe("ios");
  });

  it("recognizes the main Android browsers", () => {
    expect(
      detectInstallBrowser(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe("android-chrome");
    expect(
      detectInstallBrowser(
        "Mozilla/5.0 (Linux; Android 14) SamsungBrowser/27.0 Chrome/126.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe("android-samsung");
  });

  it("falls back to generic instructions for other browsers", () => {
    expect(detectInstallBrowser("Mozilla/5.0 (Linux; Android 14) Firefox/128.0 Mobile")).toBe(
      "android-other",
    );
    expect(detectInstallBrowser("Mozilla/5.0 (X11; Linux x86_64) Firefox/128.0")).toBe("other");
  });
});
