import { Controller, Get, Header, HttpCode, Inject, Param, Post, Req } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous, OrgRoles } from "@thallesp/nestjs-better-auth";
import { AcademyId, ActorId } from "../academy-request";
import { ZodBody } from "../zod-body.decorator";
import { PreRegistrationService } from "./pre-registration.service";
import { preRegistrationSharePage } from "./pre-registration-share-page";

type PreRegistrationRequestMetadata = { ip?: string };

import {
  ApprovePreRegistrationRequestDto,
  ApprovePreRegistrationResponseDto,
  CompleteFirstAccessDto,
  CompleteFirstAccessResponseDto,
  CreatePreRegistrationRequestDto,
  FirstAccessPreviewDto,
  GenerateFirstAccessLinkResponseDto,
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

  @Get("pre-register/:token/share")
  @AllowAnonymous()
  @Header("Content-Type", "text/html; charset=utf-8")
  async sharePage(@Param("token") token: string): Promise<string> {
    const profile = await this.preRegistrationService.publicProfile(token);
    return preRegistrationSharePage(
      profile.academy,
      this.preRegistrationService.publicFormUrl(token),
    );
  }

  @Post("pre-register/:token/requests")
  @AllowAnonymous()
  @HttpCode(200)
  @ApiParam({ name: "token" })
  @ApiBody({ type: CreatePreRegistrationRequestDto })
  @ApiOkResponse({ type: PreRegistrationRequestDto })
  createRequest(
    @Param("token") token: string,
    @ZodBody(CreatePreRegistrationRequestDto) body: CreatePreRegistrationRequestDto,
    @Req() request: PreRegistrationRequestMetadata,
  ): Promise<PreRegistrationRequestDto> {
    return this.preRegistrationService.createRequest(token, body, request.ip ?? null);
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
    @ZodBody(CompleteFirstAccessDto) body: CompleteFirstAccessDto,
  ): Promise<CompleteFirstAccessResponseDto> {
    return this.preRegistrationService.completeFirstAccess(token, body);
  }

  // --- Instructor: link management ---

  @Get("students/pre-registration-link")
  @OrgRoles(["owner"])
  @ApiOkResponse({ type: PreRegistrationLinkDto })
  getLink(@AcademyId() academyId: string): Promise<PreRegistrationLinkDto> {
    return this.preRegistrationService.getOrCreateLink(academyId);
  }

  @Post("students/pre-registration-link/pause")
  @OrgRoles(["owner"])
  @HttpCode(200)
  @ApiOkResponse({ type: PreRegistrationLinkDto })
  pauseLink(@AcademyId() academyId: string): Promise<PreRegistrationLinkDto> {
    return this.preRegistrationService.pauseLink(academyId);
  }

  @Post("students/pre-registration-link/reactivate")
  @OrgRoles(["owner"])
  @HttpCode(200)
  @ApiOkResponse({ type: PreRegistrationLinkDto })
  reactivateLink(@AcademyId() academyId: string): Promise<PreRegistrationLinkDto> {
    return this.preRegistrationService.reactivateLink(academyId);
  }

  @Post("students/pre-registration-link/regenerate")
  @OrgRoles(["owner"])
  @HttpCode(200)
  @ApiOkResponse({ type: PreRegistrationLinkDto })
  regenerateLink(@AcademyId() academyId: string): Promise<PreRegistrationLinkDto> {
    return this.preRegistrationService.regenerateLink(academyId);
  }

  @Post("students/pre-registration-link/copy")
  @OrgRoles(["owner"])
  @HttpCode(200)
  @ApiOkResponse({ type: PreRegistrationLinkDto })
  copyLink(@AcademyId() academyId: string): Promise<PreRegistrationLinkDto> {
    return this.preRegistrationService.copyLink(academyId);
  }

  // --- Instructor: request queue ---

  @Get("students/pre-registrations")
  @OrgRoles(["owner"])
  @ApiOkResponse({ type: ListPreRegistrationRequestsResponseDto })
  listRequests(@AcademyId() academyId: string): Promise<ListPreRegistrationRequestsResponseDto> {
    return this.preRegistrationService.listRequests(academyId);
  }

  @Post("students/pre-registrations/:id/reject")
  @OrgRoles(["owner"])
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: RejectPreRegistrationRequestDto })
  @ApiOkResponse({ type: PreRegistrationRequestDto })
  rejectRequest(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @ZodBody(RejectPreRegistrationRequestDto) body: RejectPreRegistrationRequestDto,
  ): Promise<PreRegistrationRequestDto> {
    return this.preRegistrationService.rejectRequest(academyId, id, actorId, body);
  }

  @Post("students/pre-registrations/:id/approve")
  @OrgRoles(["owner"])
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: ApprovePreRegistrationRequestDto })
  @ApiOkResponse({ type: ApprovePreRegistrationResponseDto })
  approveRequest(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @ZodBody(ApprovePreRegistrationRequestDto) body: ApprovePreRegistrationRequestDto,
  ): Promise<ApprovePreRegistrationResponseDto> {
    return this.preRegistrationService.approveRequest(academyId, id, actorId, body);
  }

  // --- Instructor: first-access follow-up ---

  @Post("students/pre-registrations/:id/generate-first-access-link")
  @OrgRoles(["owner"])
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: GenerateFirstAccessLinkResponseDto })
  generateFirstAccessLink(
    @AcademyId() academyId: string,
    @Param("id") id: string,
  ): Promise<GenerateFirstAccessLinkResponseDto> {
    return this.preRegistrationService.generateFirstAccessLink(academyId, id);
  }

  @Post("students/pre-registrations/:id/send-first-access-email")
  @OrgRoles(["owner"])
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: SendFirstAccessEmailResponseDto })
  sendFirstAccessEmail(
    @AcademyId() academyId: string,
    @Param("id") id: string,
  ): Promise<SendFirstAccessEmailResponseDto> {
    return this.preRegistrationService.sendFirstAccessEmail(academyId, id);
  }
}
