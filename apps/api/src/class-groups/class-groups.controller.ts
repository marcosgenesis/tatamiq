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
import { createClassGroupSchema, updateClassGroupSchema } from "@tatamiq/contracts";
import { OrgRoles, Session } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import { activeOrganizationId, type SessionWithOrganization } from "../active-organization";
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
    @Session() session: SessionWithOrganization,
    @Query("status") status?: "active" | "archived" | "all",
  ): Promise<ListClassGroupsResponseDto> {
    return this.classGroupsService.list(activeOrganizationId(session), status ?? "active");
  }

  @Post()
  @HttpCode(200)
  @ApiBody({ type: CreateClassGroupDto })
  @ApiOkResponse({ type: ClassGroupDto })
  create(
    @Session() session: SessionWithOrganization,
    @Body() body: CreateClassGroupDto,
  ): Promise<ClassGroupDto> {
    return this.classGroupsService.create(
      activeOrganizationId(session),
      parseBody(createClassGroupSchema, body),
    );
  }

  @Get(":id")
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ClassGroupDto })
  get(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
  ): Promise<ClassGroupDto> {
    return this.classGroupsService.get(activeOrganizationId(session), id);
  }

  @Patch(":id")
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateClassGroupDto })
  @ApiOkResponse({ type: ClassGroupDto })
  update(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
    @Body() body: UpdateClassGroupDto,
  ): Promise<ClassGroupDto> {
    return this.classGroupsService.update(
      activeOrganizationId(session),
      id,
      parseBody(updateClassGroupSchema, body),
    );
  }

  @Post(":id/archive")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ClassGroupDto })
  archive(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
  ): Promise<ClassGroupDto> {
    return this.classGroupsService.archive(activeOrganizationId(session), id);
  }

  @Post(":id/reactivate")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ClassGroupDto })
  reactivate(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
  ): Promise<ClassGroupDto> {
    return this.classGroupsService.reactivate(activeOrganizationId(session), id);
  }
}

function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Dados da turma inválidos.");
  return result.data;
}
