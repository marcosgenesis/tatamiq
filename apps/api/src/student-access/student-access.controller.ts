import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { acceptStudentInviteSchema } from "@tatamiq/contracts";
import { AllowAnonymous, OrgRoles, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import type { auth } from "../auth";
import {
  AcceptStudentInviteDto,
  AcceptStudentInviteResponseDto,
  CreateStudentInviteResponseDto,
  StudentInvitePreviewDto,
  StudentMeResponseDto,
} from "./student-access.dto";
import { StudentAccessService } from "./student-access.service";

type SessionWithUser = UserSession<typeof auth> & {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

@ApiTags("student-access")
@Controller()
export class StudentAccessController {
  constructor(
    @Inject(StudentAccessService) private readonly studentAccessService: StudentAccessService,
  ) {}

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

  @Get("student/me")
  @ApiOkResponse({ type: StudentMeResponseDto })
  me(@Session() session: SessionWithUser): Promise<StudentMeResponseDto> {
    return this.studentAccessService.me(session.user.id);
  }
}

function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Dados inválidos.");
  return result.data;
}

function activeOrganizationId(session: SessionWithUser): string {
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw new ForbiddenException("Sessão sem academia ativa.");
  return organizationId;
}
