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
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { addManualAttendanceSchema, invalidateAttendanceSchema } from "@tatamiq/contracts";
import { OrgRoles, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import type { auth } from "../auth";
import {
  AddManualAttendanceDto,
  AttendanceDto,
  AttendanceRosterResponseDto,
  InvalidateAttendanceDto,
} from "./attendances.dto";
import { AttendancesService } from "./attendances.service";

type SessionWithOrganization = UserSession<typeof auth> & {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

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
    @Session() session: SessionWithOrganization,
    @Param("classSessionId") classSessionId: string,
  ): Promise<AttendanceRosterResponseDto> {
    return this.attendancesService.roster(activeOrganizationId(session), classSessionId);
  }

  @Post()
  @HttpCode(200)
  @ApiParam({ name: "classSessionId", type: String })
  @ApiBody({ type: AddManualAttendanceDto })
  @ApiOkResponse({ type: AttendanceDto })
  addManual(
    @Session() session: SessionWithOrganization,
    @Param("classSessionId") classSessionId: string,
    @Body() body: AddManualAttendanceDto,
  ): Promise<AttendanceDto> {
    return this.attendancesService.addManual(
      activeOrganizationId(session),
      session.user.id,
      classSessionId,
      parseBody(addManualAttendanceSchema, body),
    );
  }

  @Post(":attendanceId/invalidate")
  @HttpCode(200)
  @ApiParam({ name: "classSessionId", type: String })
  @ApiParam({ name: "attendanceId", type: String })
  @ApiBody({ type: InvalidateAttendanceDto })
  @ApiOkResponse({ type: AttendanceDto })
  invalidate(
    @Session() session: SessionWithOrganization,
    @Param("classSessionId") classSessionId: string,
    @Param("attendanceId") attendanceId: string,
    @Body() body: InvalidateAttendanceDto,
  ): Promise<AttendanceDto> {
    return this.attendancesService.invalidate(
      activeOrganizationId(session),
      session.user.id,
      classSessionId,
      attendanceId,
      parseBody(invalidateAttendanceSchema, body),
    );
  }
}

function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Dados inválidos.");
  return result.data;
}

function activeOrganizationId(session: SessionWithOrganization): string {
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw new ForbiddenException("Sessão sem academia ativa.");
  return organizationId;
}
