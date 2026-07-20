import { ZodValidationPipe } from "nestjs-zod";
import { describe, expect, it } from "vitest";
import {
  AddPlatformAdministratorBodyDto,
  AddResponsibleBodyDto,
  CompleteReservedFirstAccessBodyDto,
  PlatformBanUserBodyDto,
  PlatformDeleteUserBodyDto,
  ProvisionAcademyBodyDto,
} from "./platform.dto";

// Regression: these body DTOs were plain classes (only @ApiProperty), so ZodBody's
// ZodValidationPipe had no schema and every request failed with 400 "Validation failed".
// They must be createZodDto-backed so the pipe can validate the real UI payloads.
describe("platform body DTOs accept their UI payloads through ZodValidationPipe", () => {
  const cases: Array<{ name: string; dto: unknown; payload: Record<string, unknown> }> = [
    {
      name: "ProvisionAcademyBodyDto",
      dto: ProvisionAcademyBodyDto,
      payload: {
        academyName: "Academia Teste",
        ownerEmail: "owner@example.com",
        ownerName: "Dono",
      },
    },
    {
      name: "AddResponsibleBodyDto",
      dto: AddResponsibleBodyDto,
      payload: { ownerEmail: "owner@example.com", ownerName: "Dono" },
    },
    {
      name: "CompleteReservedFirstAccessBodyDto",
      dto: CompleteReservedFirstAccessBodyDto,
      payload: { password: "super-secret" },
    },
    {
      name: "PlatformBanUserBodyDto",
      dto: PlatformBanUserBodyDto,
      payload: { reason: "abuse" },
    },
    {
      name: "PlatformDeleteUserBodyDto",
      dto: PlatformDeleteUserBodyDto,
      payload: { mode: "definitive" },
    },
    {
      name: "AddPlatformAdministratorBodyDto",
      dto: AddPlatformAdministratorBodyDto,
      payload: { email: "admin@example.com", name: "Admin" },
    },
  ];

  for (const { name, dto, payload } of cases) {
    it(`validates ${name}`, () => {
      const pipe = new ZodValidationPipe(dto as never);
      expect(pipe.transform(payload, { type: "body", metatype: dto as never })).toMatchObject(
        payload,
      );
    });
  }
});
