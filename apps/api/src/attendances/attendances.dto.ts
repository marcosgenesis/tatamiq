import {
  addManualAttendanceSchema,
  attendanceRosterResponseSchema,
  attendanceSchema,
  invalidateAttendanceSchema,
} from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";

export class AttendanceDto extends createZodDto(attendanceSchema) {}
export class AttendanceRosterResponseDto extends createZodDto(attendanceRosterResponseSchema) {}
export class AddManualAttendanceDto extends createZodDto(addManualAttendanceSchema) {}
export class InvalidateAttendanceDto extends createZodDto(invalidateAttendanceSchema) {}
