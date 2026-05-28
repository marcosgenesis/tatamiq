import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Session } from "@thallesp/nestjs-better-auth";
import { R2StorageService } from "../monthly-fees/r2-storage.service";
import { AuditService } from "./audit.service";
import {
  PlatformAcademiesResponseDto,
  PlatformAcademyDetailDto,
  PlatformAcademyOperationalOverviewDto,
  PlatformActionResultDto,
  PlatformAuditListResponseDto,
  type PlatformBanUserBodyDto,
  PlatformDashboardDto,
  PlatformMeDto,
  PlatformSensitiveFileUrlDto,
  PlatformUserDetailDto,
  PlatformUsersResponseDto,
} from "./platform.dto";
import { PlatformService } from "./platform.service";
import {
  PlatformAdminService,
  type PlatformMe,
  type PlatformSession,
} from "./platform-admin.service";

@ApiTags("platform")
@Controller("platform")
export class PlatformController {
  constructor(
    @Inject(PlatformAdminService) private readonly platformAdminService: PlatformAdminService,
    @Inject(PlatformService) private readonly platformService: PlatformService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(R2StorageService) private readonly r2: R2StorageService,
  ) {}

  @Get("me")
  @ApiOkResponse({ type: PlatformMeDto })
  me(@Session() session: PlatformSession): PlatformMe {
    return this.platformAdminService.assertPlatformAdmin(session);
  }

  @Get("dashboard")
  @ApiOkResponse({ type: PlatformDashboardDto })
  async dashboard(@Session() session: PlatformSession) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const result = await this.platformService.dashboard();
    await this.auditService.write({
      adminUserId: admin.user.id,
      action: "platform.dashboard.viewed",
      targetType: "platform",
    });
    return result;
  }

  @Get("academies")
  @ApiOkResponse({ type: PlatformAcademiesResponseDto })
  academies(
    @Session() session: PlatformSession,
    @Query("q") query?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformService.listAcademies({
      query,
      page: parseOptionalInteger(page),
      pageSize: parseOptionalInteger(pageSize),
    });
  }

  @Get("academies/:id")
  @ApiOkResponse({ type: PlatformAcademyDetailDto })
  academy(@Session() session: PlatformSession, @Param("id") id: string) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformService.getAcademy(id);
  }

  @Get("academies/:id/operational-overview")
  @ApiOkResponse({ type: PlatformAcademyOperationalOverviewDto })
  academyOperationalOverview(@Session() session: PlatformSession, @Param("id") id: string) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformService.getAcademyOperationalOverview(id);
  }

  @Get("academies/:academyId/receipts/:receiptId/view-url")
  @ApiOkResponse({ type: PlatformSensitiveFileUrlDto })
  async receiptViewUrl(
    @Session() session: PlatformSession,
    @Param("academyId") academyId: string,
    @Param("receiptId") receiptId: string,
  ) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const receipt = await this.platformService.getReceipt(academyId, receiptId);
    if (!receipt) throw new NotFoundException("Comprovante não encontrado.");

    const viewUrl = await this.r2.generateReadUrl(receipt.fileKey, 5 * 60);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await this.auditService.write({
      adminUserId: admin.user.id,
      action: "platform.sensitive_file.accessed",
      targetType: "payment_receipt",
      targetId: receiptId,
      academyId,
      metadata: { fileType: receipt.fileType, studentId: receipt.studentId },
    });

    return { viewUrl, expiresAt };
  }

  @Get("audit")
  @ApiOkResponse({ type: PlatformAuditListResponseDto })
  audit(
    @Session() session: PlatformSession,
    @Query("action") action?: string,
    @Query("adminUserId") adminUserId?: string,
    @Query("academyId") academyId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.auditService.list({
      action,
      adminUserId,
      academyId,
      from,
      to,
      page: parseOptionalInteger(page),
      pageSize: parseOptionalInteger(pageSize),
    });
  }

  // --- User management ---

  @Get("users")
  @ApiOkResponse({ type: PlatformUsersResponseDto })
  users(
    @Session() session: PlatformSession,
    @Query("q") query?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformService.listUsers({
      query,
      page: parseOptionalInteger(page),
      pageSize: parseOptionalInteger(pageSize),
    });
  }

  @Get("users/:id")
  @ApiOkResponse({ type: PlatformUserDetailDto })
  user(@Session() session: PlatformSession, @Param("id") id: string) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformService.getUser(id);
  }

  @Post("users/:id/ban")
  @ApiOkResponse({ type: PlatformActionResultDto })
  async banUser(
    @Session() session: PlatformSession,
    @Param("id") id: string,
    @Body() body: PlatformBanUserBodyDto,
  ) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const result = await this.platformService.banUser(id, body.reason);
    await this.auditService.write({
      adminUserId: admin.user.id,
      action: "platform.user.banned",
      targetType: "user",
      targetId: id,
      reason: body.reason,
    });
    return result;
  }

  @Post("users/:id/unban")
  @ApiOkResponse({ type: PlatformActionResultDto })
  async unbanUser(@Session() session: PlatformSession, @Param("id") id: string) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const result = await this.platformService.unbanUser(id);
    await this.auditService.write({
      adminUserId: admin.user.id,
      action: "platform.user.unbanned",
      targetType: "user",
      targetId: id,
    });
    return result;
  }

  @Post("users/:id/revoke-sessions")
  @ApiOkResponse({ type: PlatformActionResultDto })
  async revokeUserSessions(@Session() session: PlatformSession, @Param("id") id: string) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const result = await this.platformService.revokeUserSessions(id);
    await this.auditService.write({
      adminUserId: admin.user.id,
      action: "platform.user.sessions_revoked",
      targetType: "user",
      targetId: id,
    });
    return result;
  }
}

function parseOptionalInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
