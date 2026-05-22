import { describe, expect, it } from "vitest";
import { validateStudentInput } from "./student-rules";

describe("student input rules", () => {
  it("allows an adult student without guardian", () => {
    expect(() =>
      validateStudentInput({
        birthDate: "1995-05-10",
      }),
    ).not.toThrow();
  });

  it("requires guardian name and phone for a minor student", () => {
    expect(() =>
      validateStudentInput({
        birthDate: "2015-05-10",
      }),
    ).toThrow("Aluno menor de idade precisa de responsável com nome e telefone.");
  });
});
