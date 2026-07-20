import {
  academyConfirmLogoSchema,
  academyLogoUploadResponseSchema,
  academyOnboardingChecklistSchema,
  academyProfileSchema,
  updateAcademySchema,
} from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";

export class AcademyProfileDto extends createZodDto(academyProfileSchema) {}
export class AcademyOnboardingChecklistDto extends createZodDto(academyOnboardingChecklistSchema) {}
export class UpdateAcademyDto extends createZodDto(updateAcademySchema) {}
export class AcademyLogoUploadResponseDto extends createZodDto(academyLogoUploadResponseSchema) {}
export class AcademyConfirmLogoDto extends createZodDto(academyConfirmLogoSchema) {}
