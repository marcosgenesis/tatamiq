import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { acceptStudentInviteSchema, confirmQrAttendanceSchema } from "@tatamiq/contracts";
import { AllowAnonymous, OrgRoles, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import type { auth } from "../auth";
import { GraduationService } from "../graduation/graduation.service";
import { MonthlyFeesService } from "../monthly-fees/monthly-fees.service";
import { StudentNotesService } from "../student-notes/student-notes.service";
import { QrAttendanceService } from "./qr-attendance.service";
import {
  AcceptStudentInviteDto,
  AcceptStudentInviteResponseDto,
  ConfirmQrAttendanceDto,
  ConfirmQrAttendanceResponseDto,
  CreateStudentInviteResponseDto,
  InviteSummaryResponseDto,
  type MarkSeenDto,
  StudentAttendancesResponseDto,
  StudentGraduationResponseDto,
  StudentIndicatorsResponseDto,
  StudentInvitePreviewDto,
  StudentMeResponseDto,
  StudentScheduleResponseDto,
  type UpdateStudentProfileDto,
} from "./student-access.dto";
import { StudentAccessService } from "./student-access.service";
import { StudentPortalService } from "./student-portal.service";

type SessionWithUser = UserSession<typeof auth> & {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

@ApiTags("student-access")
@Controller()
export class StudentAccessController {
  constructor(
    @Inject(StudentAccessService) private readonly studentAccessService: StudentAccessService,
    @Inject(QrAttendanceService) private readonly qrAttendanceService: QrAttendanceService,
    @Inject(MonthlyFeesService) private readonly monthlyFeesService: MonthlyFeesService,
    @Inject(StudentNotesService) private readonly studentNotesService: StudentNotesService,
    @Inject(StudentPortalService) private readonly portalService: StudentPortalService,
    @Inject(GraduationService) private readonly graduationService: GraduationService,
  ) {}

  @Get("student-access/invites/summary")
  @OrgRoles(["owner"])
  @ApiOkResponse({ type: InviteSummaryResponseDto })
  inviteSummary(@Session() session: SessionWithUser): Promise<InviteSummaryResponseDto> {
    return this.studentAccessService.inviteSummary(activeOrganizationId(session));
  }

  @Post("students/:id/access-invites")
  @HttpCode(200)
  @OrgRoles(["owner"])
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: CreateStudentInviteResponseDto })
  createInvite(
    @Session() session: SessionWithUser,
    @Param("id") id: string,
  ): Promise<CreateStudentInviteResponseDto> {
    return this.studentAccessService.createInvite(
      activeOrganizationId(session),
      session.user.id,
      id,
    );
  }

  @Post("students/:id/access-invites/:inviteId/revoke")
  @HttpCode(200)
  @OrgRoles(["owner"])
  @ApiParam({ name: "id" })
  @ApiParam({ name: "inviteId" })
  revokeInvite(
    @Session() session: SessionWithUser,
    @Param("id") id: string,
    @Param("inviteId") inviteId: string,
  ) {
    return this.studentAccessService.revokeInvite(activeOrganizationId(session), id, inviteId);
  }

  @Post("students/:id/access/revoke")
  @HttpCode(200)
  @OrgRoles(["owner"])
  @ApiParam({ name: "id" })
  revokeAccess(@Session() session: SessionWithUser, @Param("id") id: string) {
    return this.studentAccessService.revokeAccess(
      activeOrganizationId(session),
      session.user.id,
      id,
    );
  }

  @Get("student-invites/:token")
  @AllowAnonymous()
  @ApiParam({ name: "token" })
  @ApiOkResponse({ type: StudentInvitePreviewDto })
  preview(@Param("token") token: string): Promise<StudentInvitePreviewDto> {
    return this.studentAccessService.previewInvite(token);
  }

  @Post("student-invites/:token/accept")
  @HttpCode(200)
  @ApiParam({ name: "token" })
  @ApiBody({ type: AcceptStudentInviteDto })
  @ApiOkResponse({ type: AcceptStudentInviteResponseDto })
  accept(
    @Session() session: SessionWithUser,
    @Param("token") token: string,
    @Body() body: AcceptStudentInviteDto,
  ): Promise<AcceptStudentInviteResponseDto> {
    return this.studentAccessService.acceptInvite(
      token,
      session.user.id,
      parseBody(acceptStudentInviteSchema, body),
    );
  }

  @Post("student/attendances/qr")
  @HttpCode(200)
  @ApiBody({ type: ConfirmQrAttendanceDto })
  @ApiOkResponse({ type: ConfirmQrAttendanceResponseDto })
  confirmQrAttendance(
    @Session() session: SessionWithUser,
    @Body() body: ConfirmQrAttendanceDto,
  ): Promise<ConfirmQrAttendanceResponseDto> {
    return this.qrAttendanceService.confirmQrAttendance(
      session.user.id,
      parseBody(confirmQrAttendanceSchema, body),
    );
  }

  @Get("student/me")
  @ApiOkResponse({ type: StudentMeResponseDto })
  me(@Session() session: SessionWithUser): Promise<StudentMeResponseDto> {
    return this.studentAccessService.me(session.user.id);
  }

  @Get("student/monthly-fees")
  async studentMonthlyFees(@Session() session: SessionWithUser) {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.monthlyFeesService.studentFees(meData.student.id, meData.academy.id);
  }

  @Get("student/notes")
  async studentNotes(@Session() session: SessionWithUser) {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.studentNotesService.listVisibleNotes(meData.student.id);
  }

  @Get("student/schedule")
  @ApiOkResponse({ type: StudentScheduleResponseDto })
  async studentSchedule(@Session() session: SessionWithUser): Promise<StudentScheduleResponseDto> {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.portalService.schedule(meData.student.id);
  }

  @Get("student/attendances")
  @ApiOkResponse({ type: StudentAttendancesResponseDto })
  async studentAttendances(
    @Session() session: SessionWithUser,
  ): Promise<StudentAttendancesResponseDto> {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.portalService.attendanceHistory(meData.student.id);
  }

  @Patch("student/profile")
  async updateStudentProfile(
    @Session() session: SessionWithUser,
    @Body() body: UpdateStudentProfileDto,
  ): Promise<void> {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.portalService.updateProfile(meData.student.id, session.user.id, body);
  }

  @Get("student/graduation")
  @ApiOkResponse({ type: StudentGraduationResponseDto })
  async studentGraduation(
    @Session() session: SessionWithUser,
  ): Promise<StudentGraduationResponseDto> {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.graduationService.studentGraduation(meData.student.id);
  }

  @Get("student/indicators")
  @ApiOkResponse({ type: StudentIndicatorsResponseDto })
  async studentIndicators(
    @Session() session: SessionWithUser,
  ): Promise<StudentIndicatorsResponseDto> {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.portalService.indicators(meData.student.id, session.user.id);
  }

  @Post("student/indicators/mark-seen")
  @HttpCode(200)
  async markSeen(@Session() session: SessionWithUser, @Body() body: MarkSeenDto): Promise<void> {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.portalService.markSeen(meData.student.id, body);
  }
}

function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Dados inválidos.");
  return result.data;
}

function activeOrganizationId(session: SessionWithUser): string {
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw new ForbiddenException("Sessão sem academia ativa.");
  return organizationId;
}
