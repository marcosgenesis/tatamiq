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
import { acceptStudentInviteSchema } from "@tatamiq/contracts";
import { AllowAnonymous, OrgRoles, Session } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import { activeOrganizationId, type SessionWithUser } from "../active-organization";
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
  inviteSummary(@Session() session: SessionWithUser): Promise<InviteSummaryResponseDto> {
    return this.studentAccessService.inviteSummary(activeOrganizationId(session));
  }

  @Post("students/:id/access-invites")
  @HttpCode(200)
  @OrgRoles(["owner"])
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: CreateStudentInviteResponseDto })
  createInvite(
    @Session() session: SessionWithUser,
    @Param("id") id: string,
  ): Promise<CreateStudentInviteResponseDto> {
    return this.studentAccessService.createInvite(
      activeOrganizationId(session),
      session.user.id,
      id,
    );
  }

  @Post("students/:id/access-invites/:inviteId/revoke")
  @HttpCode(200)
  @OrgRoles(["owner"])
  @ApiParam({ name: "id" })
  @ApiParam({ name: "inviteId" })
  revokeInvite(
    @Session() session: SessionWithUser,
    @Param("id") id: string,
    @Param("inviteId") inviteId: string,
  ) {
    return this.studentAccessService.revokeInvite(activeOrganizationId(session), id, inviteId);
  }

  @Post("students/:id/access/revoke")
  @HttpCode(200)
  @OrgRoles(["owner"])
  @ApiParam({ name: "id" })
  revokeAccess(@Session() session: SessionWithUser, @Param("id") id: string) {
    return this.studentAccessService.revokeAccess(
      activeOrganizationId(session),
      session.user.id,
      id,
    );
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
    @Session() session: SessionWithUser,
    @Param("token") token: string,
    @Body() body: AcceptStudentInviteDto,
  ): Promise<AcceptStudentInviteResponseDto> {
    return this.studentAccessService.acceptInvite(
      token,
      session.user.id,
      parseBody(acceptStudentInviteSchema, body),
    );
  }
}

function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Dados inválidos.");
  return result.data;
}
