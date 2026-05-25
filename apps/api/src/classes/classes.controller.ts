import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { startRecurringClassSchema } from "@tatamiq/contracts";
import { OrgRoles, Session } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import { activeOrganizationId, type SessionWithUser } from "../active-organization";
import { ClassSessionDto, QrTokenResponseDto, StartRecurringClassDto } from "./classes.dto";
import { ClassesService } from "./classes.service";

@ApiTags("classes")
@OrgRoles(["owner"])
@Controller("classes")
export class ClassesController {
  constructor(@Inject(ClassesService) private readonly classesService: ClassesService) {}

  @Post("start-recurring")
  @HttpCode(200)
  @ApiBody({ type: StartRecurringClassDto })
  @ApiOkResponse({ type: ClassSessionDto })
  startRecurring(
    @Session() session: SessionWithUser,
    @Body() body: StartRecurringClassDto,
  ): Promise<ClassSessionDto> {
    return this.classesService.startRecurring(
      activeOrganizationId(session),
      session.user.id,
      parseBody(startRecurringClassSchema, body),
    );
  }

  @Post(":id/start-ad-hoc")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ClassSessionDto })
  startAdHoc(
    @Session() session: SessionWithUser,
    @Param("id") id: string,
  ): Promise<ClassSessionDto> {
    return this.classesService.startAdHoc(activeOrganizationId(session), id);
  }

  @Get("active")
  @ApiOkResponse({ type: ClassSessionDto })
  async getActive(@Session() session: SessionWithUser): Promise<ClassSessionDto | null> {
    return this.classesService.getActive(activeOrganizationId(session));
  }

  @Get(":id")
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ClassSessionDto })
  getById(@Session() session: SessionWithUser, @Param("id") id: string): Promise<ClassSessionDto> {
    return this.classesService.getById(activeOrganizationId(session), id);
  }

  @Get(":id/qr-token")
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: QrTokenResponseDto })
  getQrToken(
    @Session() session: SessionWithUser,
    @Param("id") id: string,
  ): Promise<QrTokenResponseDto> {
    return this.classesService.getQrToken(activeOrganizationId(session), id);
  }

  @Post(":id/end")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ClassSessionDto })
  end(@Session() session: SessionWithUser, @Param("id") id: string): Promise<ClassSessionDto> {
    return this.classesService.end(activeOrganizationId(session), id);
  }
}

function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Dados inválidos.");
  return result.data;
}
