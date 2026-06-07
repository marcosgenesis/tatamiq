import { describe, expect, it } from "vitest";
import { beltKeyFromName, beltProgress, monthsBetween, timeSpanLabel } from "./belt-progress";

const NOW = "2026-06-06T12:00:00.000Z";

describe("beltKeyFromName", () => {
  it.each([
    ["Faixa Roxa", "roxa"],
    ["Roxa", "roxa"],
    ["Azul", "azul"],
    ["Faixa Marrom", "marrom"],
    ["BJJ Brown belt", "marrom"],
    ["Preta", "preta"],
    ["Black", "preta"],
    ["Branca", "branca"],
    ["", "branca"],
    [null, "branca"],
  ])("maps %s to %s", (name, key) => {
    expect(beltKeyFromName(name as string)).toBe(key);
  });
});

describe("timeSpanLabel", () => {
  it("returns 'hoje' for less than a month", () => {
    expect(timeSpanLabel("2026-06-01T00:00:00Z", NOW)).toBe("hoje");
  });
  it("uses singular and plural months", () => {
    expect(timeSpanLabel("2026-05-01T00:00:00Z", NOW)).toBe("há 1 mês");
    expect(timeSpanLabel("2026-01-01T00:00:00Z", NOW)).toBe("há 5 meses");
  });
  it("uses singular and plural years", () => {
    expect(timeSpanLabel("2025-05-01T00:00:00Z", NOW)).toBe("há 1 ano");
    expect(timeSpanLabel("2024-05-01T00:00:00Z", NOW)).toBe("há 2 anos");
  });
});

describe("monthsBetween", () => {
  it("is zero for invalid or future dates", () => {
    expect(monthsBetween("not-a-date", NOW)).toBe(0);
    expect(monthsBetween("2027-01-01T00:00:00Z", NOW)).toBe(0);
  });
  it("approximates whole months", () => {
    expect(Math.round(monthsBetween("2026-03-06T12:00:00Z", NOW))).toBe(3);
  });
});

describe("beltProgress", () => {
  it("computes a purple belt with two degrees", () => {
    const p = beltProgress(
      {
        currentBelt: { name: "Faixa Roxa", position: 2 },
        currentDegree: 2,
        promotions: [
          { beltName: "Roxa", degree: 2, promotedAt: "2026-05-12T00:00:00Z", notes: "Evolução" },
          { beltName: "Roxa", degree: 1, promotedAt: "2025-11-03T00:00:00Z", notes: null },
          { beltName: "Roxa", degree: 0, promotedAt: "2024-05-20T00:00:00Z", notes: "Exame" },
        ],
      },
      NOW,
    );
    expect(p.beltKey).toBe("roxa");
    expect(p.journeyIndex).toBe(2);
    expect(p.degree).toBe(2);
    expect(p.isWhiteBelt).toBe(false);
    expect(p.atMaxDegree).toBe(false);
    expect(p.nextLabel).toBe("3º grau");
    expect(p.nextCopy).toContain("3º grau");
    expect(p.progress).toBeGreaterThan(0);
    expect(p.progress).toBeLessThan(1);
    expect(p.timeOnBelt).toBe("há 2 anos");
  });

  it("handles a fresh white belt with no promotions", () => {
    const p = beltProgress(
      { currentBelt: { name: "Branca" }, currentDegree: 0, promotions: [] },
      NOW,
    );
    expect(p.beltKey).toBe("branca");
    expect(p.isWhiteBelt).toBe(true);
    expect(p.journeyIndex).toBe(0);
    expect(p.degree).toBe(0);
    expect(p.nextLabel).toBe("1º grau");
    expect(p.progress).toBe(0);
    expect(p.monthsRemaining).toBe(6);
    expect(p.timeOnBelt).toBeNull();
  });

  it("treats a null current belt as a white belt", () => {
    const p = beltProgress({ currentBelt: null, currentDegree: 0, promotions: [] }, NOW);
    expect(p.beltKey).toBe("branca");
    expect(p.isWhiteBelt).toBe(true);
  });

  it("points a max-degree belt to the next belt", () => {
    const p = beltProgress(
      {
        currentBelt: { name: "Marrom" },
        currentDegree: 4,
        promotions: [{ beltName: "Marrom", degree: 0, promotedAt: "2023-01-01T00:00:00Z" }],
      },
      NOW,
    );
    expect(p.atMaxDegree).toBe(true);
    expect(p.nextLabel).toBe("Faixa Preta");
    expect(p.progress).toBe(1);
    expect(p.monthsRemaining).toBe(0);
  });
});
