import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { createAdHocClassSchema, createRecurringCancellationSchema } from "@tatamiq/contracts";
import { OrgRoles, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import type { auth } from "../auth";
import {
  CreateAdHocClassDto,
  CreateRecurringCancellationDto,
  ScheduleOccurrenceDto,
  TodayScheduleResponseDto,
  WeeklyScheduleResponseDto,
} from "./schedule.dto";
import { ScheduleService } from "./schedule.service";

type SessionWithOrganization = UserSession<typeof auth> & {
  user: { id: string };
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

  @Post("ad-hoc-classes")
  @HttpCode(200)
  @ApiBody({ type: CreateAdHocClassDto })
  @ApiOkResponse({ type: ScheduleOccurrenceDto })
  createAdHoc(
    @Session() session: SessionWithOrganization,
    @Body() body: CreateAdHocClassDto,
  ): Promise<ScheduleOccurrenceDto> {
    return this.scheduleService.createAdHoc(
      activeOrganizationId(session),
      session.user.id,
      parseBody(createAdHocClassSchema, body),
    );
  }

  @Post("ad-hoc-classes/:id/cancel")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ScheduleOccurrenceDto })
  cancelAdHoc(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
  ): Promise<ScheduleOccurrenceDto> {
    return this.scheduleService.cancelAdHoc(activeOrganizationId(session), session.user.id, id);
  }

  @Post("ad-hoc-classes/:id/reactivate")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ScheduleOccurrenceDto })
  reactivateAdHoc(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
  ): Promise<ScheduleOccurrenceDto> {
    return this.scheduleService.reactivateAdHoc(activeOrganizationId(session), id);
  }

  @Post("recurring-cancellations")
  @HttpCode(200)
  @ApiBody({ type: CreateRecurringCancellationDto })
  @ApiOkResponse({ type: ScheduleOccurrenceDto })
  cancelRecurring(
    @Session() session: SessionWithOrganization,
    @Body() body: CreateRecurringCancellationDto,
  ): Promise<ScheduleOccurrenceDto> {
    return this.scheduleService.cancelRecurring(
      activeOrganizationId(session),
      session.user.id,
      parseBody(createRecurringCancellationSchema, body),
    );
  }

  @Post("recurring-cancellations/:id/revert")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ScheduleOccurrenceDto })
  revertRecurring(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
  ): Promise<ScheduleOccurrenceDto> {
    return this.scheduleService.revertRecurring(activeOrganizationId(session), session.user.id, id);
  }
}

function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Dados da agenda inválidos.");
  return result.data;
}

function activeOrganizationId(session: SessionWithOrganization): string {
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw new ForbiddenException("Sessão sem academia ativa.");
  return organizationId;
}
