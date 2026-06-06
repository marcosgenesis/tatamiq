import { describe, expect, it } from "vitest";
import { validateStudentInput } from "./student-rules";

describe("student input rules", () => {
  it("allows an adult student without guardian", () => {
    expect(() =>
      validateStudentInput(
        {
          birthDate: "1995-05-10",
          enrollmentDate: "2024-01-01",
        },
        new Date("2026-06-06T12:00:00.000Z"),
      ),
    ).not.toThrow();
  });

  it("requires guardian name and phone for a minor student", () => {
    expect(() =>
      validateStudentInput(
        {
          birthDate: "2015-05-10",
        },
        new Date("2026-06-06T12:00:00.000Z"),
      ),
    ).toThrow("Aluno menor de idade precisa de responsável com nome e telefone.");
  });

  it("rejects future birth dates", () => {
    expect(() =>
      validateStudentInput(
        {
          birthDate: "2030-01-01",
          guardian: { name: "Responsável", phone: "85999999999" },
        },
        new Date("2026-06-06T12:00:00.000Z"),
      ),
    ).toThrow("Data de nascimento não pode ser futura.");
  });

  it("rejects future enrollment dates", () => {
    expect(() =>
      validateStudentInput(
        {
          birthDate: "1995-01-01",
          enrollmentDate: "2030-01-01",
        },
        new Date("2026-06-06T12:00:00.000Z"),
      ),
    ).toThrow("Data de matrícula não pode ser futura.");
  });
});
