import {
  acceptStudentInviteResponseSchema,
  acceptStudentInviteSchema,
  confirmQrAttendanceResponseSchema,
  confirmQrAttendanceSchema,
  createStudentInviteResponseSchema,
  inviteSummaryResponseSchema,
  markSeenSchema,
  studentAttendancesResponseSchema,
  studentGraduationResponseSchema,
  studentIndicatorsResponseSchema,
  studentInvitePreviewSchema,
  studentMeResponseSchema,
  studentScheduleResponseSchema,
  updateStudentProfileSchema,
} from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";

export class CreateStudentInviteResponseDto extends createZodDto(
  createStudentInviteResponseSchema,
) {}
export class StudentInvitePreviewDto extends createZodDto(studentInvitePreviewSchema) {}
export class AcceptStudentInviteDto extends createZodDto(acceptStudentInviteSchema) {}
export class AcceptStudentInviteResponseDto extends createZodDto(
  acceptStudentInviteResponseSchema,
) {}
export class StudentMeResponseDto extends createZodDto(studentMeResponseSchema) {}
export class ConfirmQrAttendanceDto extends createZodDto(confirmQrAttendanceSchema) {}
export class ConfirmQrAttendanceResponseDto extends createZodDto(
  confirmQrAttendanceResponseSchema,
) {}
export class InviteSummaryResponseDto extends createZodDto(inviteSummaryResponseSchema) {}
export class StudentScheduleResponseDto extends createZodDto(studentScheduleResponseSchema) {}
export class StudentAttendancesResponseDto extends createZodDto(studentAttendancesResponseSchema) {}
export class UpdateStudentProfileDto extends createZodDto(updateStudentProfileSchema) {}
export class StudentGraduationResponseDto extends createZodDto(studentGraduationResponseSchema) {}
export class StudentIndicatorsResponseDto extends createZodDto(studentIndicatorsResponseSchema) {}
export class MarkSeenDto extends createZodDto(markSeenSchema) {}
