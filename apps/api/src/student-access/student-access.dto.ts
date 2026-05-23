import {
  acceptStudentInviteResponseSchema,
  acceptStudentInviteSchema,
  createStudentInviteResponseSchema,
  studentInvitePreviewSchema,
  studentMeResponseSchema,
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
