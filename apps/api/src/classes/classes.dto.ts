import {
  classSessionSchema,
  qrTokenResponseSchema,
  startRecurringClassSchema,
} from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";

export class ClassSessionDto extends createZodDto(classSessionSchema) {}
export class StartRecurringClassDto extends createZodDto(startRecurringClassSchema) {}
export class QrTokenResponseDto extends createZodDto(qrTokenResponseSchema) {}
