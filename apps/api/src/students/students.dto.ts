import {
  approvePreRegistrationRequestSchema,
  approvePreRegistrationResponseSchema,
  completeFirstAccessResponseSchema,
  completeFirstAccessSchema,
  createPreRegistrationRequestSchema,
  createStudentSchema,
  firstAccessPreviewSchema,
  generateFirstAccessLinkResponseSchema,
  listPreRegistrationRequestsResponseSchema,
  listStudentsResponseSchema,
  preRegistrationLinkSchema,
  preRegistrationPublicProfileSchema,
  preRegistrationRequestSchema,
  rejectPreRegistrationRequestSchema,
  sendFirstAccessEmailResponseSchema,
  studentSchema,
  updateStudentSchema,
} from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";

export class StudentDto extends createZodDto(studentSchema) {}
export class ListStudentsResponseDto extends createZodDto(listStudentsResponseSchema) {}
export class CreateStudentDto extends createZodDto(createStudentSchema) {}
export class UpdateStudentDto extends createZodDto(updateStudentSchema) {}
export class PreRegistrationPublicProfileDto extends createZodDto(
  preRegistrationPublicProfileSchema,
) {}
export class CreatePreRegistrationRequestDto extends createZodDto(
  createPreRegistrationRequestSchema,
) {}
export class PreRegistrationRequestDto extends createZodDto(preRegistrationRequestSchema) {}
export class PreRegistrationLinkDto extends createZodDto(preRegistrationLinkSchema) {}
export class ListPreRegistrationRequestsResponseDto extends createZodDto(
  listPreRegistrationRequestsResponseSchema,
) {}
export class RejectPreRegistrationRequestDto extends createZodDto(
  rejectPreRegistrationRequestSchema,
) {}
export class ApprovePreRegistrationRequestDto extends createZodDto(
  approvePreRegistrationRequestSchema,
) {}
export class ApprovePreRegistrationResponseDto extends createZodDto(
  approvePreRegistrationResponseSchema,
) {}
export class FirstAccessPreviewDto extends createZodDto(firstAccessPreviewSchema) {}
export class CompleteFirstAccessDto extends createZodDto(completeFirstAccessSchema) {}
export class CompleteFirstAccessResponseDto extends createZodDto(
  completeFirstAccessResponseSchema,
) {}
export class GenerateFirstAccessLinkResponseDto extends createZodDto(
  generateFirstAccessLinkResponseSchema,
) {}
export class SendFirstAccessEmailResponseDto extends createZodDto(
  sendFirstAccessEmailResponseSchema,
) {}
