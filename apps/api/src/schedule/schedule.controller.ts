import { Controller, ForbiddenException, Get, Inject, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { OrgRoles, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import type { auth } from "../auth";
import { TodayScheduleResponseDto, WeeklyScheduleResponseDto } from "./schedule.dto";
import { ScheduleService } from "./schedule.service";

type SessionWithOrganization = UserSession<typeof auth> & {
  session: { activeOrganizationId?: string | null };
};

@ApiTags("schedule")
@OrgRoles(["owner"])
@Controller("schedule")
export class ScheduleController {
  constructor(@Inject(ScheduleService) private readonly scheduleService: ScheduleService) {}

  @Get("week")
  @ApiQuery({ name: "weekStart", required: false })
  @ApiOkResponse({ type: WeeklyScheduleResponseDto })
  week(
    @Session() session: SessionWithOrganization,
    @Query("weekStart") weekStart?: string,
  ): Promise<WeeklyScheduleResponseDto> {
    return this.scheduleService.week(activeOrganizationId(session), weekStart);
  }

  @Get("today")
  @ApiOkResponse({ type: TodayScheduleResponseDto })
  today(@Session() session: SessionWithOrganization): Promise<TodayScheduleResponseDto> {
    return this.scheduleService.today(activeOrganizationId(session));
  }
}

function activeOrganizationId(session: SessionWithOrganization): string {
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw new ForbiddenException("Sessão sem academia ativa.");
  return organizationId;
}
