import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ActorId } from "../academy-request";
import { GraduationService } from "../graduation/graduation.service";
import {
  ConfirmReceiptDto,
  MonthlyFeeDetailDto,
  ReceiptViewUrlResponseDto,
  StudentMonthlyFeesResponseDto,
  UploadUrlResponseDto,
} from "../monthly-fees/monthly-fees.dto";
import { MonthlyFeesService } from "../monthly-fees/monthly-fees.service";
import { StudentNotesService } from "../student-notes/student-notes.service";
import { ZodBody } from "../zod-body.decorator";
import { QrAttendanceService } from "./qr-attendance.service";
import {
  ConfirmQrAttendanceDto,
  ConfirmQrAttendanceResponseDto,
  MarkSeenDto,
  StudentAttendancesResponseDto,
  StudentGraduationResponseDto,
  StudentIndicatorsResponseDto,
  StudentMeResponseDto,
  StudentScheduleResponseDto,
  UpdateStudentProfileDto,
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
    @ActorId() actorId: string,
    @ZodBody(ConfirmQrAttendanceDto) body: ConfirmQrAttendanceDto,
  ): Promise<ConfirmQrAttendanceResponseDto> {
    return this.qrAttendanceService.confirmQrAttendance(actorId, body);
  }

  @Get("me")
  @ApiOkResponse({ type: StudentMeResponseDto })
  me(@ActorId() actorId: string): Promise<StudentMeResponseDto> {
    return this.studentAccessService.me(actorId);
  }

  @Get("monthly-fees")
  @ApiOkResponse({ type: StudentMonthlyFeesResponseDto })
  async studentMonthlyFees(@ActorId() actorId: string): Promise<StudentMonthlyFeesResponseDto> {
    const meData = await this.studentAccessService.me(actorId);
    return this.monthlyFeesService.studentFees(meData.student.id, meData.academy.id);
  }

  @Post("monthly-fees/:id/upload-url")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiQuery({ name: "contentType", required: true })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  async studentReceiptUploadUrl(
    @ActorId() actorId: string,
    @Param("id") id: string,
    @Query("contentType") contentType: string,
  ): Promise<UploadUrlResponseDto> {
    const meData = await this.studentAccessService.me(actorId);
    assertStudentCanSubmitReceipts(meData.student.readOnly);
    return this.monthlyFeesService.generateUploadUrl(
      meData.academy.id,
      id,
      contentType,
      meData.student.id,
    );
  }

  @Post("monthly-fees/:id/receipts")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: ConfirmReceiptDto })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  async studentConfirmReceipt(
    @ActorId() actorId: string,
    @Param("id") id: string,
    @ZodBody(ConfirmReceiptDto) body: ConfirmReceiptDto,
  ): Promise<MonthlyFeeDetailDto> {
    const meData = await this.studentAccessService.me(actorId);
    assertStudentCanSubmitReceipts(meData.student.readOnly);
    return this.monthlyFeesService.confirmReceipt(
      meData.academy.id,
      id,
      actorId,
      body,
      meData.student.id,
    );
  }

  @Get("monthly-fees/:id/receipts/:receiptId/view-url")
  @ApiParam({ name: "id" })
  @ApiParam({ name: "receiptId" })
  @ApiOkResponse({ type: ReceiptViewUrlResponseDto })
  async studentReceiptViewUrl(
    @ActorId() actorId: string,
    @Param("id") id: string,
    @Param("receiptId") receiptId: string,
  ): Promise<ReceiptViewUrlResponseDto> {
    const meData = await this.studentAccessService.me(actorId);
    return this.monthlyFeesService.receiptViewUrl(
      meData.academy.id,
      id,
      receiptId,
      meData.student.id,
    );
  }

  @Get("notes")
  async studentNotes(@ActorId() actorId: string) {
    const meData = await this.studentAccessService.me(actorId);
    return this.studentNotesService.listVisibleNotes(meData.student.id);
  }

  @Get("schedule")
  @ApiOkResponse({ type: StudentScheduleResponseDto })
  async studentSchedule(@ActorId() actorId: string): Promise<StudentScheduleResponseDto> {
    const meData = await this.studentAccessService.me(actorId);
    return this.portalService.schedule(meData.student.id);
  }

  @Get("attendances")
  @ApiOkResponse({ type: StudentAttendancesResponseDto })
  async studentAttendances(@ActorId() actorId: string): Promise<StudentAttendancesResponseDto> {
    const meData = await this.studentAccessService.me(actorId);
    return this.portalService.attendanceHistory(meData.student.id);
  }

  @Patch("profile")
  async updateStudentProfile(
    @ActorId() actorId: string,
    @ZodBody(UpdateStudentProfileDto) body: UpdateStudentProfileDto,
  ): Promise<void> {
    const meData = await this.studentAccessService.me(actorId);
    return this.portalService.updateProfile(meData.student.id, actorId, body);
  }

  @Get("graduation")
  @ApiOkResponse({ type: StudentGraduationResponseDto })
  async studentGraduation(@ActorId() actorId: string): Promise<StudentGraduationResponseDto> {
    const meData = await this.studentAccessService.me(actorId);
    return this.graduationService.studentGraduation(meData.student.id);
  }

  @Get("indicators")
  @ApiOkResponse({ type: StudentIndicatorsResponseDto })
  async studentIndicators(@ActorId() actorId: string): Promise<StudentIndicatorsResponseDto> {
    const meData = await this.studentAccessService.me(actorId);
    return this.portalService.indicators(meData.student.id, actorId);
  }

  @Post("indicators/mark-seen")
  @HttpCode(200)
  async markSeen(
    @ActorId() actorId: string,
    @ZodBody(MarkSeenDto) body: MarkSeenDto,
  ): Promise<void> {
    const meData = await this.studentAccessService.me(actorId);
    return this.portalService.markSeen(meData.student.id, body);
  }
}

function assertStudentCanSubmitReceipts(readOnly: boolean): void {
  if (readOnly) {
    throw new ForbiddenException("Aluno inativo não pode enviar comprovante Pix.");
  }
}
