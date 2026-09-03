import {
  createStudentNoteSchema,
  listStudentNotesResponseSchema,
  studentNoteSchema,
  updateStudentNoteSchema,
} from "@appdosensei/contracts";
import { createZodDto } from "nestjs-zod";

export class StudentNoteDto extends createZodDto(studentNoteSchema) {}
export class ListStudentNotesResponseDto extends createZodDto(listStudentNotesResponseSchema) {}
export class CreateStudentNoteDto extends createZodDto(createStudentNoteSchema) {}
export class UpdateStudentNoteDto extends createZodDto(updateStudentNoteSchema) {}
