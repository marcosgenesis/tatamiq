import { describe, expect, it } from "vitest";
import { normalizeClassGroupInput } from "./class-group-rules";

describe("class group input rules", () => {
  it("requires at least one schedule entry", () => {
    expect(() =>
      normalizeClassGroupInput({
        schedules: [],
        tags: [],
      }),
    ).toThrow("Turma precisa ter pelo menos um horário semanal.");
  });

  it("rejects invalid schedule time format", () => {
    expect(() =>
      normalizeClassGroupInput({
        schedules: [{ weekday: 1, startTime: "7h30" }],
        tags: [],
      }),
    ).toThrow("Horário da turma precisa estar no formato HH:mm.");
  });

  it("normalizes unique tags", () => {
    const normalized = normalizeClassGroupInput({
      schedules: [{ weekday: 1, startTime: "07:30" }],
      tags: [" No Gi ", "no gi", "Iniciante"],
    });

    expect(normalized.tags).toEqual(["No Gi", "Iniciante"]);
  });
});
