import {
  BadRequestException,
  Body,
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
import { createStudentSchema, updateStudentSchema } from "@tatamiq/contracts";
import { OrgRoles, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import type { auth } from "../auth";
import {
  CreateStudentDto,
  ListStudentsResponseDto,
  StudentDto,
  UpdateStudentDto,
} from "./students.dto";
import { StudentsService } from "./students.service";

type SessionWithOrganization = UserSession<typeof auth> & {
  session: { activeOrganizationId?: string | null };
};

@ApiTags("students")
@OrgRoles(["owner"])
@Controller("students")
export class StudentsController {
  constructor(@Inject(StudentsService) private readonly studentsService: StudentsService) {}

  @Get()
  @ApiQuery({ name: "status", required: false, enum: ["active", "inactive", "all"] })
  @ApiOkResponse({ type: ListStudentsResponseDto })
  list(
    @Session() session: SessionWithOrganization,
    @Query("status") status?: "active" | "inactive" | "all",
  ): Promise<ListStudentsResponseDto> {
    return this.studentsService.list(activeOrganizationId(session), status ?? "active");
  }

  @Post()
  @HttpCode(200)
  @ApiBody({ type: CreateStudentDto })
  @ApiOkResponse({ type: StudentDto })
  create(
    @Session() session: SessionWithOrganization,
    @Body() body: CreateStudentDto,
  ): Promise<StudentDto> {
    return this.studentsService.create(
      activeOrganizationId(session),
      parseBody(createStudentSchema, body),
    );
  }

  @Get(":id")
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: StudentDto })
  get(@Session() session: SessionWithOrganization, @Param("id") id: string): Promise<StudentDto> {
    return this.studentsService.get(activeOrganizationId(session), id);
  }

  @Patch(":id")
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateStudentDto })
  @ApiOkResponse({ type: StudentDto })
  update(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
    @Body() body: UpdateStudentDto,
  ): Promise<StudentDto> {
    return this.studentsService.update(
      activeOrganizationId(session),
      id,
      parseBody(updateStudentSchema, body),
    );
  }

  @Post(":id/inactivate")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: StudentDto })
  inactivate(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
  ): Promise<StudentDto> {
    return this.studentsService.inactivate(activeOrganizationId(session), id);
  }

  @Post(":id/reactivate")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: StudentDto })
  reactivate(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
  ): Promise<StudentDto> {
    return this.studentsService.reactivate(activeOrganizationId(session), id);
  }
}

function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException("Dados do aluno inválidos.");
  }
  return result.data;
}

function activeOrganizationId(session: SessionWithOrganization): string {
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    throw new ForbiddenException("Sessão sem academia ativa.");
  }
  return organizationId;
}
