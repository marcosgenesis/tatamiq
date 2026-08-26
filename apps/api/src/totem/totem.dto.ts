import {
  totemDeviceSchema,
  totemOccurrenceSchema,
  totemPairingCodeResponseSchema,
  totemPairResponseSchema,
  totemQrResponseSchema,
  totemStateSchema,
} from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const pairTotemSchema = z.object({
  code: z.string().regex(/^\d{4,8}$/, "Código de pareamento inválido."),
  name: z.string().trim().max(40).optional().default(""),
});

export class PairTotemDto extends createZodDto(pairTotemSchema) {}
export class TotemPairResponseDto extends createZodDto(totemPairResponseSchema) {}
export class TotemStateDto extends createZodDto(totemStateSchema) {}
export class TotemOccurrenceDto extends createZodDto(totemOccurrenceSchema) {}
export class TotemQrResponseDto extends createZodDto(totemQrResponseSchema) {}
export class TotemPairingCodeResponseDto extends createZodDto(totemPairingCodeResponseSchema) {}
export class TotemDeviceDto extends createZodDto(totemDeviceSchema) {}
