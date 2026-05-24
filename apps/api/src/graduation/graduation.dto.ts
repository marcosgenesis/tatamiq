import {
  createPromotionSchema,
  dismissEligibilitySchema,
  eligibleStudentSchema,
  graduationSummaryResponseSchema,
  listEligibleStudentsResponseSchema,
  listPromotionsResponseSchema,
  promotionSchema,
} from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";

export class PromotionDto extends createZodDto(promotionSchema) {}
export class CreatePromotionDto extends createZodDto(createPromotionSchema) {}
export class ListPromotionsResponseDto extends createZodDto(listPromotionsResponseSchema) {}
export class EligibleStudentDto extends createZodDto(eligibleStudentSchema) {}
export class ListEligibleStudentsResponseDto extends createZodDto(
  listEligibleStudentsResponseSchema,
) {}
export class GraduationSummaryResponseDto extends createZodDto(graduationSummaryResponseSchema) {}
export class DismissEligibilityDto extends createZodDto(dismissEligibilitySchema) {}
