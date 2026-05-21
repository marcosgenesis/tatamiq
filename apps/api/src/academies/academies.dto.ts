import { academyDemoResponseSchema } from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";

export class AcademyDemoResponseDto extends createZodDto(academyDemoResponseSchema) {}
