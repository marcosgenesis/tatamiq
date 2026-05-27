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
import {
  approvePreRegistrationRequestSchema,
  completeFirstAccessSchema,
  createPreRegistrationRequestSchema,
  rejectPreRegistrationRequestSchema,
} from "@tatamiq/contracts";
import { AllowAnonymous, OrgRoles, Session } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import { activeOrganizationId, type SessionWithOrganization } from "../active-organization";
import { PreRegistrationService } from "./pre-registration.service";
import {
  ApprovePreRegistrationRequestDto,
  ApprovePreRegistrationResponseDto,
  CompleteFirstAccessDto,
  CompleteFirstAccessResponseDto,
  CreatePreRegistrationRequestDto,
  FirstAccessPreviewDto,
  ListPreRegistrationRequestsResponseDto,
  PreRegistrationLinkDto,
  PreRegistrationPublicProfileDto,
  PreRegistrationRequestDto,
  RejectPreRegistrationRequestDto,
  SendFirstAccessEmailResponseDto,
} from "./students.dto";

@ApiTags("pre-registration")
@Controller()
export class PreRegistrationController {
  constructor(
    @Inject(PreRegistrationService)
    private readonly preRegistrationService: PreRegistrationService,
  ) {}

  // --- Public ---

  @Get("pre-register/:token")
  @AllowAnonymous()
  @ApiParam({ name: "token" })
  @ApiOkResponse({ type: PreRegistrationPublicProfileDto })
  publicProfile(@Param("token") token: string): Promise<PreRegistrationPublicProfileDto> {
    return this.preRegistrationService.publicProfile(token);
  }

  @Post("pre-register/:token/requests")
  @AllowAnonymous()
  @HttpCode(200)
  @ApiParam({ name: "token" })
  @ApiBody({ type: CreatePreRegistrationRequestDto })
  @ApiOkResponse({ type: PreRegistrationRequestDto })
  createRequest(
    @Param("token") token: string,
    @Body() body: CreatePreRegistrationRequestDto,
  ): Promise<PreRegistrationRequestDto> {
    return this.preRegistrationService.createRequest(
      token,
      parseBody(createPreRegistrationRequestSchema, body),
    );
  }

  // --- First access (anonymous) ---

  @Get("student/first-access/:token")
  @AllowAnonymous()
  @ApiParam({ name: "token" })
  @ApiOkResponse({ type: FirstAccessPreviewDto })
  previewFirstAccess(@Param("token") token: string): Promise<FirstAccessPreviewDto> {
    return this.preRegistrationService.previewFirstAccess(token);
  }

  @Post("student/first-access/:token/complete")
  @AllowAnonymous()
  @HttpCode(200)
  @ApiParam({ name: "token" })
  @ApiBody({ type: CompleteFirstAccessDto })
  @ApiOkResponse({ type: CompleteFirstAccessResponseDto })
  completeFirstAccess(
    @Param("token") token: string,
    @Body() body: CompleteFirstAccessDto,
  ): Promise<CompleteFirstAccessResponseDto> {
    return this.preRegistrationService.completeFirstAccess(
      token,
      parseBody(completeFirstAccessSchema, body),
    );
  }

  // --- Instructor: link management ---

  @Get("students/pre-registration-link")
  @OrgRoles(["owner"])
  @ApiOkResponse({ type: PreRegistrationLinkDto })
  getLink(@Session() session: SessionWithOrganization): Promise<PreRegistrationLinkDto> {
    return this.preRegistrationService.getOrCreateLink(activeOrganizationId(session));
  }

  @Post("students/pre-registration-link/pause")
  @OrgRoles(["owner"])
  @HttpCode(200)
  @ApiOkResponse({ type: PreRegistrationLinkDto })
  pauseLink(@Session() session: SessionWithOrganization): Promise<PreRegistrationLinkDto> {
    return this.preRegistrationService.pauseLink(activeOrganizationId(session));
  }

  @Post("students/pre-registration-link/reactivate")
  @OrgRoles(["owner"])
  @HttpCode(200)
  @ApiOkResponse({ type: PreRegistrationLinkDto })
  reactivateLink(@Session() session: SessionWithOrganization): Promise<PreRegistrationLinkDto> {
    return this.preRegistrationService.reactivateLink(activeOrganizationId(session));
  }

  @Post("students/pre-registration-link/regenerate")
  @OrgRoles(["owner"])
  @HttpCode(200)
  @ApiOkResponse({ type: PreRegistrationLinkDto })
  regenerateLink(@Session() session: SessionWithOrganization): Promise<PreRegistrationLinkDto> {
    return this.preRegistrationService.regenerateLink(activeOrganizationId(session));
  }

  // --- Instructor: request queue ---

  @Get("students/pre-registrations")
  @OrgRoles(["owner"])
  @ApiOkResponse({ type: ListPreRegistrationRequestsResponseDto })
  listRequests(
    @Session() session: SessionWithOrganization,
  ): Promise<ListPreRegistrationRequestsResponseDto> {
    return this.preRegistrationService.listRequests(activeOrganizationId(session));
  }

  @Post("students/pre-registrations/:id/reject")
  @OrgRoles(["owner"])
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: RejectPreRegistrationRequestDto })
  @ApiOkResponse({ type: PreRegistrationRequestDto })
  rejectRequest(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
    @Body() body: RejectPreRegistrationRequestDto,
  ): Promise<PreRegistrationRequestDto> {
    return this.preRegistrationService.rejectRequest(
      activeOrganizationId(session),
      id,
      session.user.id,
      parseBody(rejectPreRegistrationRequestSchema, body),
    );
  }

  @Post("students/pre-registrations/:id/approve")
  @OrgRoles(["owner"])
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: ApprovePreRegistrationRequestDto })
  @ApiOkResponse({ type: ApprovePreRegistrationResponseDto })
  approveRequest(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
    @Body() body: ApprovePreRegistrationRequestDto,
  ): Promise<ApprovePreRegistrationResponseDto> {
    return this.preRegistrationService.approveRequest(
      activeOrganizationId(session),
      id,
      session.user.id,
      parseBody(approvePreRegistrationRequestSchema, body),
    );
  }

  // --- Instructor: email ---

  @Post("students/pre-registrations/:id/send-first-access-email")
  @OrgRoles(["owner"])
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: SendFirstAccessEmailResponseDto })
  sendFirstAccessEmail(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
  ): Promise<SendFirstAccessEmailResponseDto> {
    return this.preRegistrationService.sendFirstAccessEmail(activeOrganizationId(session), id);
  }
}

function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Dados de pré-cadastro inválidos.");
  return result.data;
}
