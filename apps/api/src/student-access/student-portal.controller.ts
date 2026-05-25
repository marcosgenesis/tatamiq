import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Patch,
  Post,
  Session,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { confirmQrAttendanceSchema } from "@tatamiq/contracts";
import type { z } from "zod";
import type { SessionWithUser } from "../active-organization";
import { GraduationService } from "../graduation/graduation.service";
import { MonthlyFeesService } from "../monthly-fees/monthly-fees.service";
import { StudentNotesService } from "../student-notes/student-notes.service";
import { QrAttendanceService } from "./qr-attendance.service";
import {
  ConfirmQrAttendanceDto,
  ConfirmQrAttendanceResponseDto,
  type MarkSeenDto,
  StudentAttendancesResponseDto,
  StudentGraduationResponseDto,
  StudentIndicatorsResponseDto,
  StudentMeResponseDto,
  StudentScheduleResponseDto,
  type UpdateStudentProfileDto,
} from "./student-access.dto";
import { StudentAccessService } from "./student-access.service";
import { StudentPortalService } from "./student-portal.service";

@ApiTags("student-portal")
@Controller("student")
export class StudentPortalController {
  constructor(
    @Inject(StudentAccessService) private readonly studentAccessService: StudentAccessService,
    @Inject(QrAttendanceService) private readonly qrAttendanceService: QrAttendanceService,
    @Inject(MonthlyFeesService) private readonly monthlyFeesService: MonthlyFeesService,
    @Inject(StudentNotesService) private readonly studentNotesService: StudentNotesService,
    @Inject(StudentPortalService) private readonly portalService: StudentPortalService,
    @Inject(GraduationService) private readonly graduationService: GraduationService,
  ) {}

  @Post("attendances/qr")
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

  @Get("me")
  @ApiOkResponse({ type: StudentMeResponseDto })
  me(@Session() session: SessionWithUser): Promise<StudentMeResponseDto> {
    return this.studentAccessService.me(session.user.id);
  }

  @Get("monthly-fees")
  async studentMonthlyFees(@Session() session: SessionWithUser) {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.monthlyFeesService.studentFees(meData.student.id, meData.academy.id);
  }

  @Get("notes")
  async studentNotes(@Session() session: SessionWithUser) {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.studentNotesService.listVisibleNotes(meData.student.id);
  }

  @Get("schedule")
  @ApiOkResponse({ type: StudentScheduleResponseDto })
  async studentSchedule(@Session() session: SessionWithUser): Promise<StudentScheduleResponseDto> {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.portalService.schedule(meData.student.id);
  }

  @Get("attendances")
  @ApiOkResponse({ type: StudentAttendancesResponseDto })
  async studentAttendances(
    @Session() session: SessionWithUser,
  ): Promise<StudentAttendancesResponseDto> {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.portalService.attendanceHistory(meData.student.id);
  }

  @Patch("profile")
  async updateStudentProfile(
    @Session() session: SessionWithUser,
    @Body() body: UpdateStudentProfileDto,
  ): Promise<void> {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.portalService.updateProfile(meData.student.id, session.user.id, body);
  }

  @Get("graduation")
  @ApiOkResponse({ type: StudentGraduationResponseDto })
  async studentGraduation(
    @Session() session: SessionWithUser,
  ): Promise<StudentGraduationResponseDto> {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.graduationService.studentGraduation(meData.student.id);
  }

  @Get("indicators")
  @ApiOkResponse({ type: StudentIndicatorsResponseDto })
  async studentIndicators(
    @Session() session: SessionWithUser,
  ): Promise<StudentIndicatorsResponseDto> {
    const meData = await this.studentAccessService.me(session.user.id);
    return this.portalService.indicators(meData.student.id, session.user.id);
  }

  @Post("indicators/mark-seen")
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
