import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { EligibilityType } from "@tatamiq/contracts";
import { OrgRoles, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import type { auth } from "../auth";
import {
  type CreatePromotionDto,
  type DismissEligibilityDto,
  GraduationSummaryResponseDto,
  ListEligibleStudentsResponseDto,
  ListPromotionsResponseDto,
  PromotionDto,
} from "./graduation.dto";
import { GraduationService } from "./graduation.service";

type SessionWithOrganization = UserSession<typeof auth> & {
  session: { activeOrganizationId?: string | null };
  user: { id: string };
};

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
    @Session() session: SessionWithOrganization,
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
    @Session() session: SessionWithOrganization,
  ): Promise<ListPromotionsResponseDto> {
    return this.graduationService.listPromotions(activeOrganizationId(session), studentId);
  }

  @Get("graduation/eligible")
  @ApiQuery({ name: "type", required: false, enum: ["degree", "belt", "transition"] })
  @ApiOkResponse({ type: ListEligibleStudentsResponseDto })
  listEligible(
    @Session() session: SessionWithOrganization,
    @Query("type") type?: EligibilityType,
  ): Promise<ListEligibleStudentsResponseDto> {
    return this.graduationService.listEligibleStudents(activeOrganizationId(session), type);
  }

  @Get("graduation/summary")
  @ApiOkResponse({ type: GraduationSummaryResponseDto })
  summary(@Session() session: SessionWithOrganization): Promise<GraduationSummaryResponseDto> {
    return this.graduationService.summary(activeOrganizationId(session));
  }

  @Post("students/:id/dismiss-eligibility")
  dismissEligibility(
    @Param("id") studentId: string,
    @Body() body: DismissEligibilityDto,
    @Session() session: SessionWithOrganization,
  ): Promise<void> {
    return this.graduationService.dismissEligibility(
      activeOrganizationId(session),
      studentId,
      body,
    );
  }
}

function activeOrganizationId(session: SessionWithOrganization): string {
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    throw new ForbiddenException("Sessao sem academia ativa.");
  }
  return organizationId;
}
