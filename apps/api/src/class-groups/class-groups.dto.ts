import {
  classGroupSchema,
  createClassGroupSchema,
  listClassGroupsResponseSchema,
  updateClassGroupSchema,
} from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";

export class ClassGroupDto extends createZodDto(classGroupSchema) {}
export class ListClassGroupsResponseDto extends createZodDto(listClassGroupsResponseSchema) {}
export class CreateClassGroupDto extends createZodDto(createClassGroupSchema) {}
export class UpdateClassGroupDto extends createZodDto(updateClassGroupSchema) {}
