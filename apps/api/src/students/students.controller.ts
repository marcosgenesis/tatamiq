import { Controller, Get, HttpCode, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { OrgRoles } from "@thallesp/nestjs-better-auth";
import { AcademyId } from "../academy-request";
import { ZodBody } from "../zod-body.decorator";
import { PreRegistrationService } from "./pre-registration.service";
import {
  CreateStudentDto,
  GenerateFirstAccessLinkResponseDto,
  ListStudentsResponseDto,
  StudentDto,
  UpdateStudentDto,
} from "./students.dto";
import { StudentsService } from "./students.service";

@ApiTags("students")
@OrgRoles(["owner"])
@Controller("students")
export class StudentsController {
  constructor(
    @Inject(StudentsService) private readonly studentsService: StudentsService,
    @Inject(PreRegistrationService) private readonly preRegistrationService: PreRegistrationService,
  ) {}

  @Get()
  @ApiQuery({ name: "status", required: false, enum: ["active", "inactive", "all"] })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiOkResponse({ type: ListStudentsResponseDto })
  list(
    @AcademyId() academyId: string,
    @Query("status") status?: "active" | "inactive" | "all",
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<ListStudentsResponseDto> {
    return this.studentsService.list(academyId, {
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
    @AcademyId() academyId: string,
    @ZodBody(CreateStudentDto) body: CreateStudentDto,
  ): Promise<StudentDto> {
    return this.studentsService.create(academyId, body);
  }

  @Post(":id/first-access-link")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: GenerateFirstAccessLinkResponseDto })
  generateFirstAccessLink(
    @AcademyId() academyId: string,
    @Param("id") id: string,
  ): Promise<GenerateFirstAccessLinkResponseDto> {
    return this.preRegistrationService.generateFirstAccessLinkForStudent(academyId, id);
  }

  @Get(":id")
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: StudentDto })
  get(@AcademyId() academyId: string, @Param("id") id: string): Promise<StudentDto> {
    return this.studentsService.get(academyId, id);
  }

  @Patch(":id")
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateStudentDto })
  @ApiOkResponse({ type: StudentDto })
  update(
    @AcademyId() academyId: string,
    @Param("id") id: string,
    @ZodBody(UpdateStudentDto) body: UpdateStudentDto,
  ): Promise<StudentDto> {
    return this.studentsService.update(academyId, id, body);
  }

  @Post(":id/inactivate")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: StudentDto })
  inactivate(@AcademyId() academyId: string, @Param("id") id: string): Promise<StudentDto> {
    return this.studentsService.inactivate(academyId, id);
  }

  @Post(":id/reactivate")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: StudentDto })
  reactivate(@AcademyId() academyId: string, @Param("id") id: string): Promise<StudentDto> {
    return this.studentsService.reactivate(academyId, id);
  }
}
