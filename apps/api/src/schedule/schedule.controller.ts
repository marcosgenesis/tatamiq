import { Controller, Delete, Get, HttpCode, Inject, Param, Post, Query } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { OrgRoles } from "@thallesp/nestjs-better-auth";
import { AcademyId, ActorId } from "../academy-request";
import { ZodBody } from "../zod-body.decorator";
import {
  CreateAdHocClassDto,
  CreateRecurringCancellationDto,
  ScheduleOccurrenceDto,
  TodayScheduleResponseDto,
  WeeklyScheduleResponseDto,
} from "./schedule.dto";
import { ScheduleService } from "./schedule.service";

@ApiTags("schedule")
@OrgRoles(["owner"])
@Controller("schedule")
export class ScheduleController {
  constructor(@Inject(ScheduleService) private readonly scheduleService: ScheduleService) {}

  @Get("week")
  @ApiQuery({ name: "weekStart", required: false })
  @ApiOkResponse({ type: WeeklyScheduleResponseDto })
  week(
    @AcademyId() academyId: string,
    @Query("weekStart") weekStart?: string,
  ): Promise<WeeklyScheduleResponseDto> {
    return this.scheduleService.week(academyId, weekStart);
  }

  @Get("today")
  @ApiOkResponse({ type: TodayScheduleResponseDto })
  today(@AcademyId() academyId: string): Promise<TodayScheduleResponseDto> {
    return this.scheduleService.today(academyId);
  }

  @Post("ad-hoc-classes")
  @HttpCode(200)
  @ApiBody({ type: CreateAdHocClassDto })
  @ApiOkResponse({ type: ScheduleOccurrenceDto })
  createAdHoc(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @ZodBody(CreateAdHocClassDto) body: CreateAdHocClassDto,
  ): Promise<ScheduleOccurrenceDto> {
    return this.scheduleService.createAdHoc(academyId, actorId, body);
  }

  @Post("ad-hoc-classes/:id/cancel")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ScheduleOccurrenceDto })
  cancelAdHoc(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
  ): Promise<ScheduleOccurrenceDto> {
    return this.scheduleService.cancelAdHoc(academyId, actorId, id);
  }

  @Delete("ad-hoc-classes/:id")
  @HttpCode(204)
  @ApiParam({ name: "id" })
  async deleteAdHoc(@AcademyId() academyId: string, @Param("id") id: string): Promise<void> {
    await this.scheduleService.deleteAdHoc(academyId, id);
  }

  @Post("ad-hoc-classes/:id/reactivate")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ScheduleOccurrenceDto })
  reactivateAdHoc(
    @AcademyId() academyId: string,
    @Param("id") id: string,
  ): Promise<ScheduleOccurrenceDto> {
    return this.scheduleService.reactivateAdHoc(academyId, id);
  }

  @Post("recurring-cancellations")
  @HttpCode(200)
  @ApiBody({ type: CreateRecurringCancellationDto })
  @ApiOkResponse({ type: ScheduleOccurrenceDto })
  cancelRecurring(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @ZodBody(CreateRecurringCancellationDto) body: CreateRecurringCancellationDto,
  ): Promise<ScheduleOccurrenceDto> {
    return this.scheduleService.cancelRecurring(academyId, actorId, body);
  }

  @Post("recurring-cancellations/:id/revert")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ScheduleOccurrenceDto })
  revertRecurring(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
  ): Promise<ScheduleOccurrenceDto> {
    return this.scheduleService.revertRecurring(academyId, actorId, id);
  }
}
