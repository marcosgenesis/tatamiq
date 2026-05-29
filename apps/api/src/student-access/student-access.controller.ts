import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous, OrgRoles, Session } from "@thallesp/nestjs-better-auth";
import { AcademyId, ActorId } from "../academy-request";
import {
  AcceptStudentInviteDto,
  AcceptStudentInviteResponseDto,
  CreateStudentInviteResponseDto,
  InviteSummaryResponseDto,
  StudentInvitePreviewDto,
} from "./student-access.dto";
import { StudentAccessService } from "./student-access.service";

@ApiTags("student-access")
@Controller()
export class StudentAccessController {
  constructor(
    @Inject(StudentAccessService) private readonly studentAccessService: StudentAccessService,
  ) {}

  @Get("student-access/invites/summary")
  @OrgRoles(["owner"])
  @ApiOkResponse({ type: InviteSummaryResponseDto })
  inviteSummary(@AcademyId() academyId: string): Promise<InviteSummaryResponseDto> {
    return this.studentAccessService.inviteSummary(academyId);
  }

  @Post("students/:id/access-invites")
  @HttpCode(200)
  @OrgRoles(["owner"])
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: CreateStudentInviteResponseDto })
  createInvite(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
  ): Promise<CreateStudentInviteResponseDto> {
    return this.studentAccessService.createInvite(academyId, actorId, id);
  }

  @Post("students/:id/access-invites/:inviteId/revoke")
  @HttpCode(200)
  @OrgRoles(["owner"])
  @ApiParam({ name: "id" })
  @ApiParam({ name: "inviteId" })
  revokeInvite(
    @AcademyId() academyId: string,
    @Param("id") id: string,
    @Param("inviteId") inviteId: string,
  ) {
    return this.studentAccessService.revokeInvite(academyId, id, inviteId);
  }

  @Post("students/:id/access/revoke")
  @HttpCode(200)
  @OrgRoles(["owner"])
  @ApiParam({ name: "id" })
  revokeAccess(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
  ) {
    return this.studentAccessService.revokeAccess(academyId, actorId, id);
  }

  @Get("student-invites/:token")
  @AllowAnonymous()
  @ApiParam({ name: "token" })
  @ApiOkResponse({ type: StudentInvitePreviewDto })
  preview(@Param("token") token: string): Promise<StudentInvitePreviewDto> {
    return this.studentAccessService.previewInvite(token);
  }

  @Post("student-invites/:token/accept")
  @HttpCode(200)
  @ApiParam({ name: "token" })
  @ApiBody({ type: AcceptStudentInviteDto })
  @ApiOkResponse({ type: AcceptStudentInviteResponseDto })
  accept(
    @ActorId() actorId: string,
    @Param("token") token: string,
    @Body() body: AcceptStudentInviteDto,
  ): Promise<AcceptStudentInviteResponseDto> {
    return this.studentAccessService.acceptInvite(token, actorId, body);
  }
}
