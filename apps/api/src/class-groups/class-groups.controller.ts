import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { OrgRoles } from "@thallesp/nestjs-better-auth";
import { AcademyId } from "../academy-request";
import {
  ClassGroupDto,
  CreateClassGroupDto,
  ListClassGroupsResponseDto,
  UpdateClassGroupDto,
} from "./class-groups.dto";
import { ClassGroupsService } from "./class-groups.service";

@ApiTags("class-groups")
@OrgRoles(["owner"])
@Controller("class-groups")
export class ClassGroupsController {
  constructor(
    @Inject(ClassGroupsService) private readonly classGroupsService: ClassGroupsService,
  ) {}

  @Get()
  @ApiQuery({ name: "status", required: false, enum: ["active", "archived", "all"] })
  @ApiOkResponse({ type: ListClassGroupsResponseDto })
  list(
    @AcademyId() academyId: string,
    @Query("status") status?: "active" | "archived" | "all",
  ): Promise<ListClassGroupsResponseDto> {
    return this.classGroupsService.list(academyId, status ?? "active");
  }

  @Post()
  @HttpCode(200)
  @ApiBody({ type: CreateClassGroupDto })
  @ApiOkResponse({ type: ClassGroupDto })
  create(
    @AcademyId() academyId: string,
    @Body() body: CreateClassGroupDto,
  ): Promise<ClassGroupDto> {
    return this.classGroupsService.create(academyId, body);
  }

  @Get(":id")
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ClassGroupDto })
  get(@AcademyId() academyId: string, @Param("id") id: string): Promise<ClassGroupDto> {
    return this.classGroupsService.get(academyId, id);
  }

  @Patch(":id")
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateClassGroupDto })
  @ApiOkResponse({ type: ClassGroupDto })
  update(
    @AcademyId() academyId: string,
    @Param("id") id: string,
    @Body() body: UpdateClassGroupDto,
  ): Promise<ClassGroupDto> {
    return this.classGroupsService.update(academyId, id, body);
  }

  @Post(":id/archive")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ClassGroupDto })
  archive(@AcademyId() academyId: string, @Param("id") id: string): Promise<ClassGroupDto> {
    return this.classGroupsService.archive(academyId, id);
  }

  @Post(":id/reactivate")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ClassGroupDto })
  reactivate(@AcademyId() academyId: string, @Param("id") id: string): Promise<ClassGroupDto> {
    return this.classGroupsService.reactivate(academyId, id);
  }
}
