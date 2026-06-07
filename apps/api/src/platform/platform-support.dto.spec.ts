import { ZodValidationPipe } from "nestjs-zod";
import { describe, expect, it } from "vitest";
import { ActivatePlatformSupportBodyDto, StartPlatformSupportBodyDto } from "./platform.dto";

describe("platform support body DTOs", () => {
  it("accepts the support start payload sent by the platform UI", async () => {
    const pipe = new ZodValidationPipe(StartPlatformSupportBodyDto);

    expect(
      pipe.transform(
        {
          targetUserId: "YHdfXlvPa0mlqFZP916leGcsgNeExTDH",
          academyId: "wIBKK96pI9YNYR1mP7cG2cq2WLNZKHRK",
        },
        { type: "body", metatype: StartPlatformSupportBodyDto },
      ),
    ).toEqual({
      targetUserId: "YHdfXlvPa0mlqFZP916leGcsgNeExTDH",
      academyId: "wIBKK96pI9YNYR1mP7cG2cq2WLNZKHRK",
    });
  });

  it("accepts support activation payloads", async () => {
    const pipe = new ZodValidationPipe(ActivatePlatformSupportBodyDto);

    expect(
      pipe.transform(
        { supportSessionId: "support-1" },
        { type: "body", metatype: ActivatePlatformSupportBodyDto },
      ),
    ).toEqual({ supportSessionId: "support-1" });
  });
});
