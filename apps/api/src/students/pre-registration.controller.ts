import { Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous, OrgRoles } from "@thallesp/nestjs-better-auth";
import { AcademyId, ActorId } from "../academy-request";
import { ZodBody } from "../zod-body.decorator";
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
    @ZodBody(CreatePreRegistrationRequestDto) body: CreatePreRegistrationRequestDto,
  ): Promise<PreRegistrationRequestDto> {
    return this.preRegistrationService.createRequest(token, body);
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

  // --- Instructor: email ---

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
