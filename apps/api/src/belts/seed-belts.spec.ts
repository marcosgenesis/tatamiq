import { describe, expect, it } from "vitest";
import { IBJJF_BELTS } from "./seed-belts";

describe("IBJJF_BELTS", () => {
  it("includes the complete IBJJF child belt hierarchy", () => {
    expect(IBJJF_BELTS.filter((belt) => belt.path === "child")).toMatchObject([
      { name: "Branca", slug: "white", position: 0 },
      { name: "Cinza / Branca", slug: "gray-white", position: 1 },
      { name: "Cinza", slug: "gray", position: 2 },
      { name: "Cinza / Preta", slug: "gray-black", position: 3 },
      { name: "Amarela / Branca", slug: "yellow-white", position: 4 },
      { name: "Amarela", slug: "yellow", position: 5 },
      { name: "Amarela / Preta", slug: "yellow-black", position: 6 },
      { name: "Laranja / Branca", slug: "orange-white", position: 7 },
      { name: "Laranja", slug: "orange", position: 8 },
      { name: "Laranja / Preta", slug: "orange-black", position: 9 },
      { name: "Verde / Branca", slug: "green-white", position: 10 },
      { name: "Verde", slug: "green", position: 11 },
      { name: "Verde / Preta", slug: "green-black", position: 12 },
    ]);
  });
});
