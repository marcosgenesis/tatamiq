import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { EligibilityType } from "@tatamiq/contracts";
import { OrgRoles } from "@thallesp/nestjs-better-auth";
import { AcademyId, ActorId } from "../academy-request";
import {
  type CreatePromotionDto,
  type DismissEligibilityDto,
  GraduationSummaryResponseDto,
  ListEligibleStudentsResponseDto,
  ListPromotionsResponseDto,
  PromotionDto,
} from "./graduation.dto";
import { GraduationService } from "./graduation.service";

@ApiTags("graduation")
@OrgRoles(["owner"])
@Controller()
export class GraduationController {
  constructor(@Inject(GraduationService) private readonly graduationService: GraduationService) {}

  @Post("students/:id/promotions")
  @ApiOkResponse({ type: PromotionDto })
  createPromotion(
    @Param("id") studentId: string,
    @Body() body: CreatePromotionDto,
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
  ): Promise<PromotionDto> {
    return this.graduationService.createPromotion(academyId, studentId, actorId, body);
  }

  @Get("students/:id/promotions")
  @ApiOkResponse({ type: ListPromotionsResponseDto })
  listPromotions(
    @Param("id") studentId: string,
    @AcademyId() academyId: string,
  ): Promise<ListPromotionsResponseDto> {
    return this.graduationService.listPromotions(academyId, studentId);
  }

  @Get("graduation/eligible")
  @ApiQuery({ name: "type", required: false, enum: ["degree", "belt", "transition"] })
  @ApiOkResponse({ type: ListEligibleStudentsResponseDto })
  listEligible(
    @AcademyId() academyId: string,
    @Query("type") type?: EligibilityType,
  ): Promise<ListEligibleStudentsResponseDto> {
    return this.graduationService.listEligibleStudents(academyId, type);
  }

  @Get("graduation/summary")
  @ApiOkResponse({ type: GraduationSummaryResponseDto })
  summary(@AcademyId() academyId: string): Promise<GraduationSummaryResponseDto> {
    return this.graduationService.summary(academyId);
  }

  @Post("students/:id/dismiss-eligibility")
  dismissEligibility(
    @Param("id") studentId: string,
    @Body() body: DismissEligibilityDto,
    @AcademyId() academyId: string,
  ): Promise<void> {
    return this.graduationService.dismissEligibility(academyId, studentId, body);
  }
}
