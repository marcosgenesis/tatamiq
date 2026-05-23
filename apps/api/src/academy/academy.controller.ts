import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { updateAcademySchema } from "@tatamiq/contracts";
import { OrgRoles, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import type { auth } from "../auth";
import { AcademyLogoUploadResponseDto, AcademyProfileDto, UpdateAcademyDto } from "./academy.dto";
import { AcademyService } from "./academy.service";

type SessionWithOrganization = UserSession<typeof auth> & {
  session: { activeOrganizationId?: string | null };
};

@ApiTags("academy")
@OrgRoles(["owner"])
@Controller("academy")
export class AcademyController {
  constructor(@Inject(AcademyService) private readonly academyService: AcademyService) {}

  @Get()
  @ApiOkResponse({ type: AcademyProfileDto })
  get(@Session() session: SessionWithOrganization): Promise<AcademyProfileDto> {
    return this.academyService.get(activeOrganizationId(session));
  }

  @Patch()
  @ApiBody({ type: UpdateAcademyDto })
  @ApiOkResponse({ type: AcademyProfileDto })
  update(
    @Session() session: SessionWithOrganization,
    @Body() body: UpdateAcademyDto,
  ): Promise<AcademyProfileDto> {
    return this.academyService.update(
      activeOrganizationId(session),
      parseBody(updateAcademySchema, body),
    );
  }

  @Post("logo/upload-url")
  @HttpCode(200)
  @ApiOkResponse({ type: AcademyLogoUploadResponseDto })
  logoUploadUrl(
    @Session() session: SessionWithOrganization,
  ): Promise<AcademyLogoUploadResponseDto> {
    return this.academyService.generateLogoUploadUrl(activeOrganizationId(session));
  }

  @Post("logo/confirm")
  @HttpCode(200)
  @ApiOkResponse({ type: AcademyProfileDto })
  confirmLogo(
    @Session() session: SessionWithOrganization,
    @Body() body: { fileKey: string },
  ): Promise<AcademyProfileDto> {
    if (!body.fileKey) {
      throw new BadRequestException("fileKey é obrigatório.");
    }
    return this.academyService.confirmLogo(activeOrganizationId(session), body.fileKey);
  }
}

function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException("Dados da academia inválidos.");
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
