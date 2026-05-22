import {
  createStudentSchema,
  listStudentsResponseSchema,
  studentSchema,
  updateStudentSchema,
} from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";

export class StudentDto extends createZodDto(studentSchema) {}
export class ListStudentsResponseDto extends createZodDto(listStudentsResponseSchema) {}
export class CreateStudentDto extends createZodDto(createStudentSchema) {}
export class UpdateStudentDto extends createZodDto(updateStudentSchema) {}
