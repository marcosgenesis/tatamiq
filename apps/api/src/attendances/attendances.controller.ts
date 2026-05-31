import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { OrgRoles } from "@thallesp/nestjs-better-auth";
import { AcademyId, ActorId } from "../academy-request";
import {
  AddManualAttendanceDto,
  AttendanceDto,
  AttendanceRosterResponseDto,
  InvalidateAttendanceDto,
} from "./attendances.dto";
import { AttendancesService } from "./attendances.service";

@ApiTags("attendances")
@OrgRoles(["owner"])
@Controller("classes/:classSessionId/attendances")
export class AttendancesController {
  constructor(
    @Inject(AttendancesService) private readonly attendancesService: AttendancesService,
  ) {}

  @Get()
  @ApiParam({ name: "classSessionId", type: String })
  @ApiOkResponse({ type: AttendanceRosterResponseDto })
  roster(
    @AcademyId() academyId: string,
    @Param("classSessionId") classSessionId: string,
  ): Promise<AttendanceRosterResponseDto> {
    return this.attendancesService.roster(academyId, classSessionId);
  }

  @Post()
  @HttpCode(200)
  @ApiParam({ name: "classSessionId", type: String })
  @ApiBody({ type: AddManualAttendanceDto })
  @ApiOkResponse({ type: AttendanceDto })
  addManual(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("classSessionId") classSessionId: string,
    @Body() body: AddManualAttendanceDto,
  ): Promise<AttendanceDto> {
    return this.attendancesService.addManual(academyId, actorId, classSessionId, body);
  }

  @Post(":attendanceId/invalidate")
  @HttpCode(200)
  @ApiParam({ name: "classSessionId", type: String })
  @ApiParam({ name: "attendanceId", type: String })
  @ApiBody({ type: InvalidateAttendanceDto })
  @ApiOkResponse({ type: AttendanceDto })
  invalidate(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("classSessionId") classSessionId: string,
    @Param("attendanceId") attendanceId: string,
    @Body() body: InvalidateAttendanceDto,
  ): Promise<AttendanceDto> {
    return this.attendancesService.invalidate(
      academyId,
      actorId,
      classSessionId,
      attendanceId,
      body,
    );
  }
}
