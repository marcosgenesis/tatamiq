import { describe, expect, it } from "vitest";
import { formatAcademyResponsiblesSummary } from "./platform-components";

describe("formatAcademyResponsiblesSummary", () => {
  it("falls back when responsibles are missing", () => {
    expect(formatAcademyResponsiblesSummary(undefined)).toBe("Sem responsável");
    expect(formatAcademyResponsiblesSummary(null)).toBe("Sem responsável");
    expect(formatAcademyResponsiblesSummary([])).toBe("Sem responsável");
  });

  it("summarises one or many responsibles", () => {
    expect(formatAcademyResponsiblesSummary([{ name: "Ana", email: "ana@test.com" }])).toBe(
      "ana@test.com",
    );
    expect(
      formatAcademyResponsiblesSummary([
        { name: "Ana", email: "ana@test.com" },
        { name: "Bob", email: "bob@test.com" },
      ]),
    ).toBe("ana@test.com · +1");
  });
});
