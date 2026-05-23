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
import { acceptStudentInviteSchema, confirmQrAttendanceSchema } from "@tatamiq/contracts";
import { AllowAnonymous, OrgRoles, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import type { auth } from "../auth";
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
  StudentInvitePreviewDto,
  StudentMeResponseDto,
} from "./student-access.dto";
import { StudentAccessService } from "./student-access.service";

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
