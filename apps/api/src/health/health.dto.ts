import { healthResponseSchema } from "@appdosensei/contracts";
import { createZodDto } from "nestjs-zod";

export class HealthResponseDto extends createZodDto(healthResponseSchema) {}
