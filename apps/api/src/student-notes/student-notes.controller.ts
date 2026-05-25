import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { createStudentNoteSchema, updateStudentNoteSchema } from "@tatamiq/contracts";
import { OrgRoles, Session } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import { activeOrganizationId, type SessionWithOrganization } from "../active-organization";
import {
  CreateStudentNoteDto,
  ListStudentNotesResponseDto,
  StudentNoteDto,
  UpdateStudentNoteDto,
} from "./student-notes.dto";
import { StudentNotesService } from "./student-notes.service";

@ApiTags("student-notes")
@OrgRoles(["owner"])
@Controller("students")
export class StudentNotesController {
  constructor(
    @Inject(StudentNotesService) private readonly studentNotesService: StudentNotesService,
  ) {}

  @Get(":id/notes")
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ListStudentNotesResponseDto })
  list(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
  ): Promise<ListStudentNotesResponseDto> {
    return this.studentNotesService.listAll(activeOrganizationId(session), id);
  }

  @Post(":id/notes")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: CreateStudentNoteDto })
  @ApiOkResponse({ type: StudentNoteDto })
  create(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
    @Body() body: CreateStudentNoteDto,
  ): Promise<StudentNoteDto> {
    return this.studentNotesService.create(
      activeOrganizationId(session),
      id,
      session.user.id,
      parseBody(createStudentNoteSchema, body),
    );
  }

  @Patch(":id/notes/:noteId")
  @ApiParam({ name: "id" })
  @ApiParam({ name: "noteId" })
  @ApiBody({ type: UpdateStudentNoteDto })
  @ApiOkResponse({ type: StudentNoteDto })
  update(
    @Session() session: SessionWithOrganization,
    @Param("id") _id: string,
    @Param("noteId") noteId: string,
    @Body() body: UpdateStudentNoteDto,
  ): Promise<StudentNoteDto> {
    return this.studentNotesService.update(
      activeOrganizationId(session),
      noteId,
      parseBody(updateStudentNoteSchema, body),
    );
  }

  @Post(":id/notes/:noteId/archive")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiParam({ name: "noteId" })
  @ApiOkResponse({ type: StudentNoteDto })
  archive(
    @Session() session: SessionWithOrganization,
    @Param("id") _id: string,
    @Param("noteId") noteId: string,
  ): Promise<StudentNoteDto> {
    return this.studentNotesService.archive(activeOrganizationId(session), noteId);
  }
}

function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Dados inválidos.");
  return result.data;
}
