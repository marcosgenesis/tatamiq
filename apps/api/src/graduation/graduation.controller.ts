import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { EligibilityType } from "@tatamiq/contracts";
import { OrgRoles, Session } from "@thallesp/nestjs-better-auth";
import { activeOrganizationId, type SessionWithUser } from "../active-organization";
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
    @Session() session: SessionWithUser,
  ): Promise<PromotionDto> {
    return this.graduationService.createPromotion(
      activeOrganizationId(session),
      studentId,
      session.user.id,
      body,
    );
  }

  @Get("students/:id/promotions")
  @ApiOkResponse({ type: ListPromotionsResponseDto })
  listPromotions(
    @Param("id") studentId: string,
    @Session() session: SessionWithUser,
  ): Promise<ListPromotionsResponseDto> {
    return this.graduationService.listPromotions(activeOrganizationId(session), studentId);
  }

  @Get("graduation/eligible")
  @ApiQuery({ name: "type", required: false, enum: ["degree", "belt", "transition"] })
  @ApiOkResponse({ type: ListEligibleStudentsResponseDto })
  listEligible(
    @Session() session: SessionWithUser,
    @Query("type") type?: EligibilityType,
  ): Promise<ListEligibleStudentsResponseDto> {
    return this.graduationService.listEligibleStudents(activeOrganizationId(session), type);
  }

  @Get("graduation/summary")
  @ApiOkResponse({ type: GraduationSummaryResponseDto })
  summary(@Session() session: SessionWithUser): Promise<GraduationSummaryResponseDto> {
    return this.graduationService.summary(activeOrganizationId(session));
  }

  @Post("students/:id/dismiss-eligibility")
  dismissEligibility(
    @Param("id") studentId: string,
    @Body() body: DismissEligibilityDto,
    @Session() session: SessionWithUser,
  ): Promise<void> {
    return this.graduationService.dismissEligibility(
      activeOrganizationId(session),
      studentId,
      body,
    );
  }
}
