import { describe, expect, it } from "vitest";
import { birthDateSchema, calendarDateSchema, createPreRegistrationRequestSchema } from "./schemas";

describe("calendarDateSchema", () => {
  it("accepts a real past date", () => {
    expect(calendarDateSchema.safeParse("2020-01-15").success).toBe(true);
  });

  it("rejects impossible dates that pass the format regex", () => {
    expect(calendarDateSchema.safeParse("2020-13-45").success).toBe(false);
    expect(calendarDateSchema.safeParse("2020-02-30").success).toBe(false);
  });

  it("rejects future dates", () => {
    expect(calendarDateSchema.safeParse("2999-12-31").success).toBe(false);
  });
});

describe("birthDateSchema", () => {
  it("accepts a real past date", () => {
    expect(birthDateSchema.safeParse("1990-05-20").success).toBe(true);
  });

  it("rejects impossible calendar dates that pass the format regex", () => {
    expect(birthDateSchema.safeParse("9999-99-99").success).toBe(false);
    expect(birthDateSchema.safeParse("2024-02-30").success).toBe(false);
    expect(birthDateSchema.safeParse("0000-01-01").success).toBe(false);
  });

  it("rejects future dates", () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    expect(birthDateSchema.safeParse(nextYear.toISOString().slice(0, 10)).success).toBe(false);
  });

  it("rejects malformed strings", () => {
    expect(birthDateSchema.safeParse("20-01-1990").success).toBe(false);
    expect(birthDateSchema.safeParse("not-a-date").success).toBe(false);
  });
});

describe("createPreRegistrationRequestSchema", () => {
  const valid = {
    name: "Maria Silva",
    birthDate: "1995-03-10",
    phone: "11999999999",
    email: "maria@example.com",
    consentAccepted: true as const,
  };

  it("accepts a valid submission", () => {
    expect(createPreRegistrationRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an unbounded name", () => {
    const result = createPreRegistrationRequestSchema.safeParse({
      ...valid,
      name: "A".repeat(121),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a single-character name", () => {
    expect(createPreRegistrationRequestSchema.safeParse({ ...valid, name: "A" }).success).toBe(
      false,
    );
  });

  it("bounds phone, note, cpf and guardian fields", () => {
    expect(
      createPreRegistrationRequestSchema.safeParse({ ...valid, phone: "1".repeat(31) }).success,
    ).toBe(false);
    expect(
      createPreRegistrationRequestSchema.safeParse({ ...valid, note: "x".repeat(1001) }).success,
    ).toBe(false);
    expect(
      createPreRegistrationRequestSchema.safeParse({ ...valid, cpf: "1".repeat(15) }).success,
    ).toBe(false);
    expect(
      createPreRegistrationRequestSchema.safeParse({ ...valid, guardianName: "g".repeat(121) })
        .success,
    ).toBe(false);
  });

  it("rejects an impossible birthDate", () => {
    expect(
      createPreRegistrationRequestSchema.safeParse({ ...valid, birthDate: "9999-99-99" }).success,
    ).toBe(false);
  });
});
