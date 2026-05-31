import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { OrgRoles } from "@thallesp/nestjs-better-auth";
import { AcademyId, ActorId } from "../academy-request";
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
    @AcademyId() academyId: string,
    @Param("id") id: string,
  ): Promise<ListStudentNotesResponseDto> {
    return this.studentNotesService.listAll(academyId, id);
  }

  @Post(":id/notes")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: CreateStudentNoteDto })
  @ApiOkResponse({ type: StudentNoteDto })
  create(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @Body() body: CreateStudentNoteDto,
  ): Promise<StudentNoteDto> {
    return this.studentNotesService.create(academyId, id, actorId, body);
  }

  @Patch(":id/notes/:noteId")
  @ApiParam({ name: "id" })
  @ApiParam({ name: "noteId" })
  @ApiBody({ type: UpdateStudentNoteDto })
  @ApiOkResponse({ type: StudentNoteDto })
  update(
    @AcademyId() academyId: string,
    @Param("id") _id: string,
    @Param("noteId") noteId: string,
    @Body() body: UpdateStudentNoteDto,
  ): Promise<StudentNoteDto> {
    return this.studentNotesService.update(academyId, noteId, body);
  }

  @Post(":id/notes/:noteId/archive")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiParam({ name: "noteId" })
  @ApiOkResponse({ type: StudentNoteDto })
  archive(
    @AcademyId() academyId: string,
    @Param("id") _id: string,
    @Param("noteId") noteId: string,
  ): Promise<StudentNoteDto> {
    return this.studentNotesService.archive(academyId, noteId);
  }
}
