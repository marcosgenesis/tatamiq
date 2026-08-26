import { describe, expect, it } from "vitest";
import { resolveWebOrigins } from "./web-origins";

describe("resolveWebOrigins", () => {
  it("falls back to local web and totem Vite origins when nothing is configured", () => {
    expect(resolveWebOrigins({})).toEqual(["http://localhost:5173", "http://localhost:5174"]);
  });

  it("includes the totem app origin", () => {
    expect(
      resolveWebOrigins({
        WEB_APP_URL: "https://app.tatamiq.com.br",
        TOTEM_APP_URL: "https://totem.tatamiq.com.br",
      }),
    ).toEqual(["https://app.tatamiq.com.br", "https://totem.tatamiq.com.br"]);
  });

  it("combines WEB_APP_URL with additional CORS origins", () => {
    expect(
      resolveWebOrigins({
        WEB_APP_URL: "https://stg.tatamiq.com.br",
        CORS_ORIGIN: "http://localhost:5173,http://127.0.0.1:5173",
      }),
    ).toEqual(["https://stg.tatamiq.com.br", "http://localhost:5173", "http://127.0.0.1:5173"]);
  });

  it("trims whitespace and removes duplicate origins", () => {
    expect(
      resolveWebOrigins({
        WEB_APP_URL: " https://stg.tatamiq.com.br ",
        CORS_ORIGIN: "https://stg.tatamiq.com.br, http://localhost:5173 ",
      }),
    ).toEqual(["https://stg.tatamiq.com.br", "http://localhost:5173"]);
  });
});
