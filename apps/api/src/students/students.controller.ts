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
  Query,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { createStudentSchema, updateStudentSchema } from "@tatamiq/contracts";
import { OrgRoles, Session } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import { activeOrganizationId, type SessionWithOrganization } from "../active-organization";
import {
  CreateStudentDto,
  ListStudentsResponseDto,
  StudentDto,
  UpdateStudentDto,
} from "./students.dto";
import { StudentsService } from "./students.service";

@ApiTags("students")
@OrgRoles(["owner"])
@Controller("students")
export class StudentsController {
  constructor(@Inject(StudentsService) private readonly studentsService: StudentsService) {}

  @Get()
  @ApiQuery({ name: "status", required: false, enum: ["active", "inactive", "all"] })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiOkResponse({ type: ListStudentsResponseDto })
  list(
    @Session() session: SessionWithOrganization,
    @Query("status") status?: "active" | "inactive" | "all",
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<ListStudentsResponseDto> {
    return this.studentsService.list(activeOrganizationId(session), {
      status: status ?? "active",
      page: page ? Number(page) : 0,
      pageSize: pageSize ? Number(pageSize) : 10,
    });
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
