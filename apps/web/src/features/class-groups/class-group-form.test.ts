import { describe, expect, it } from "vitest";
import {
  type ClassGroupFormValues,
  classGroupFormSchema,
  normalizeClassGroupTags,
  toClassGroupPayload,
} from "./class-group-form";

describe("classGroupFormSchema", () => {
  const validValues: ClassGroupFormValues = {
    name: "No Gi 19h",
    defaultDurationMinutes: "60",
    schedules: [{ weekday: "1", startTime: "19:00" }],
    tags: [],
    studentIds: [],
  };

  it("accepts valid class group form values", () => {
    expect(classGroupFormSchema.safeParse(validValues).success).toBe(true);
  });

  it("rejects duplicate weekly schedules", () => {
    const result = classGroupFormSchema.safeParse({
      ...validValues,
      schedules: [
        { weekday: "1", startTime: "19:00" },
        { weekday: "1", startTime: "19:00" },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "Remova horários duplicados.",
      );
    }
  });

  it("rejects invalid duration", () => {
    const result = classGroupFormSchema.safeParse({
      ...validValues,
      defaultDurationMinutes: "10",
    });

    expect(result.success).toBe(false);
  });
});

describe("normalizeClassGroupTags", () => {
  it("trims, collapses spaces and deduplicates tags case-insensitively", () => {
    expect(normalizeClassGroupTags([" No   Gi ", "no gi", "Infantil", "", " infantil "])).toEqual([
      "No Gi",
      "Infantil",
    ]);
  });
});

describe("toClassGroupPayload", () => {
  it("converts form values to API payload", () => {
    expect(
      toClassGroupPayload({
        name: " No Gi 19h ",
        defaultDurationMinutes: "75",
        schedules: [{ weekday: "2", startTime: "20:30" }],
        tags: [" No   Gi ", "no gi"],
        studentIds: ["student-1"],
      }),
    ).toEqual({
      name: "No Gi 19h",
      defaultDurationMinutes: 75,
      schedules: [{ weekday: 2, startTime: "20:30" }],
      tags: ["No Gi"],
      studentIds: ["student-1"],
    });
  });
});
