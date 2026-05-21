import { healthResponseSchema } from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";

export class HealthResponseDto extends createZodDto(healthResponseSchema) {}
