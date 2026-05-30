import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous, Session } from "@thallesp/nestjs-better-auth";

type PlatformRequest = { ip?: string; headers: Record<string, string | string[] | undefined> };

import { R2StorageService } from "../monthly-fees/r2-storage.service";
import { AuditService } from "./audit.service";
import {
  ActivatePlatformSupportBodyDto,
  AddPlatformAdministratorBodyDto,
  AddPlatformAdministratorResultDto,
  CompleteReservedFirstAccessBodyDto,
  CompleteReservedFirstAccessResponseDto,
  PlatformAcademiesResponseDto,
  PlatformAcademyDetailDto,
  PlatformAcademyOperationalOverviewDto,
  PlatformActionResultDto,
  PlatformAdministratorsResponseDto,
  PlatformAuditListResponseDto,
  PlatformBanUserBodyDto,
  PlatformDashboardDto,
  PlatformDeleteUserBodyDto,
  PlatformMeDto,
  PlatformSensitiveFileUrlDto,
  PlatformSupportSessionDto,
  PlatformUserDeletionImpactDto,
  PlatformUserDetailDto,
  PlatformUsersResponseDto,
  ProvisionAcademyBodyDto,
  ProvisionAcademyResultDto,
  ReservedFirstAccessPreviewDto,
  StartPlatformSupportBodyDto,
  TransferAcademyBodyDto,
  TransferAcademyResultDto,
} from "./platform.dto";
import { PlatformAcademyService } from "./platform-academy.service";
import {
  PlatformAdminService,
  type PlatformMe,
  type PlatformSession,
} from "./platform-admin.service";
import { PlatformSupportService } from "./platform-support.service";
import { PlatformUserService } from "./platform-user.service";
import { ReservedAccountService } from "./reserved-account.service";

@ApiTags("platform")
@Controller("platform")
export class PlatformController {
  constructor(
    @Inject(PlatformAdminService) private readonly platformAdminService: PlatformAdminService,
    @Inject(PlatformAcademyService) private readonly platformAcademyService: PlatformAcademyService,
    @Inject(PlatformSupportService) private readonly platformSupportService: PlatformSupportService,
    @Inject(PlatformUserService) private readonly platformUserService: PlatformUserService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(R2StorageService) private readonly r2: R2StorageService,
    @Inject(ReservedAccountService) private readonly reservedAccounts: ReservedAccountService,
  ) {}

  @Get("first-access/:token")
  @AllowAnonymous()
  @ApiParam({ name: "token", type: String })
  @ApiOkResponse({ type: ReservedFirstAccessPreviewDto })
  previewFirstAccess(@Param("token") token: string) {
    return this.reservedAccounts.previewFirstAccess(token);
  }

  @Post("first-access/:token/complete")
  @AllowAnonymous()
  @ApiParam({ name: "token", type: String })
  @ApiBody({ type: CompleteReservedFirstAccessBodyDto })
  @ApiOkResponse({ type: CompleteReservedFirstAccessResponseDto })
  async completeFirstAccess(
    @Param("token") token: string,
    @Body() body: CompleteReservedFirstAccessBodyDto,
  ) {
    if (!body.password || body.password.length < 8) {
      throw new BadRequestException("Senha deve ter no mínimo 8 caracteres.");
    }
    await this.reservedAccounts.completeFirstAccess(token, body.password);
    return { success: true };
  }

  @Get("me")
  @ApiOkResponse({ type: PlatformMeDto })
  me(@Session() session: PlatformSession): PlatformMe {
    return this.platformAdminService.assertPlatformAdmin(session);
  }

  @Get("dashboard")
  @ApiOkResponse({ type: PlatformDashboardDto })
  async dashboard(@Session() session: PlatformSession) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const result = await this.platformAcademyService.dashboard();
    await this.auditService.write({
      adminUserId: admin.user.id,
      action: "platform.dashboard.viewed",
      targetType: "platform",
    });
    return result;
  }

  @Get("academies")
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiOkResponse({ type: PlatformAcademiesResponseDto })
  academies(
    @Session() session: PlatformSession,
    @Query("q") query?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformAcademyService.listAcademies({
      query,
      page: parseOptionalInteger(page),
      pageSize: parseOptionalInteger(pageSize),
    });
  }

  @Post("academies/provision")
  @ApiBody({ type: ProvisionAcademyBodyDto })
  @ApiOkResponse({ type: ProvisionAcademyResultDto })
  async provisionAcademy(
    @Session() session: PlatformSession,
    @Body() body: ProvisionAcademyBodyDto,
  ) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const input = parseProvisionAcademyBody(body);
    const result = await this.platformAcademyService.provisionAcademy(input);
    await this.auditService.write({
      adminUserId: admin.user.id,
      action: "platform.academy.provisioned",
      targetType: "academy",
      targetId: result.academy.id,
      academyId: result.academy.id,
      metadata: {
        ownerUserId: result.ownerUserId,
        ownerWasCreated: result.ownerWasCreated,
      },
    });
    return result;
  }

  @Post("academies/:id/transfer")
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: TransferAcademyBodyDto })
  @ApiOkResponse({ type: TransferAcademyResultDto })
  async transferAcademy(
    @Session() session: PlatformSession,
    @Param("id") id: string,
    @Body() body: TransferAcademyBodyDto,
  ) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const input = parseTransferAcademyBody(body);
    const result = await this.platformAcademyService.transferAcademy(id, input);
    await this.auditService.write({
      adminUserId: admin.user.id,
      action: "platform.academy.transferred",
      targetType: "academy",
      targetId: id,
      academyId: id,
      metadata: {
        ownerUserId: result.ownerUserId,
        ownerWasCreated: result.ownerWasCreated,
      },
    });
    return result;
  }

  @Get("academies/:id")
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ type: PlatformAcademyDetailDto })
  academy(@Session() session: PlatformSession, @Param("id") id: string) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformAcademyService.getAcademy(id);
  }

  @Get("academies/:id/operational-overview")
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ type: PlatformAcademyOperationalOverviewDto })
  academyOperationalOverview(@Session() session: PlatformSession, @Param("id") id: string) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformAcademyService.getAcademyOperationalOverview(id);
  }

  @Get("academies/:academyId/receipts/:receiptId/view-url")
  @ApiParam({ name: "academyId", type: String })
  @ApiParam({ name: "receiptId", type: String })
  @ApiOkResponse({ type: PlatformSensitiveFileUrlDto })
  async receiptViewUrl(
    @Session() session: PlatformSession,
    @Param("academyId") academyId: string,
    @Param("receiptId") receiptId: string,
  ) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const receipt = await this.platformAcademyService.getReceipt(academyId, receiptId);
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

  @Get("administrators")
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiOkResponse({ type: PlatformAdministratorsResponseDto })
  administrators(
    @Session() session: PlatformSession,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformAdminService.listAdministrators({
      page: parseOptionalInteger(page),
      pageSize: parseOptionalInteger(pageSize),
    });
  }

  @Post("administrators")
  @ApiBody({ type: AddPlatformAdministratorBodyDto })
  @ApiOkResponse({ type: AddPlatformAdministratorResultDto })
  async addAdministrator(
    @Session() session: PlatformSession,
    @Body() body: AddPlatformAdministratorBodyDto,
  ) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const input = parseAdministratorBody(body);
    const result = await this.platformAdminService.addAdministrator(input);
    await this.auditService.write({
      adminUserId: admin.user.id,
      action: "platform.admin.added",
      targetType: "user",
      targetId: result.administrator.id,
      metadata: { userWasCreated: result.userWasCreated },
    });
    return result;
  }

  @Post("administrators/:id/remove")
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ type: PlatformActionResultDto })
  async removeAdministrator(@Session() session: PlatformSession, @Param("id") id: string) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const result = await this.platformAdminService.removeAdministrator(id);
    await this.auditService.write({
      adminUserId: admin.user.id,
      action: "platform.admin.removed",
      targetType: "user",
      targetId: id,
    });
    return result;
  }

  @Post("support/start")
  @ApiBody({ type: StartPlatformSupportBodyDto })
  @ApiOkResponse({ type: PlatformSupportSessionDto })
  async startSupport(
    @Session() session: PlatformSession,
    @Body() body: StartPlatformSupportBodyDto,
    @Req() request: PlatformRequest,
  ) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const userAgentHeader = request.headers["user-agent"];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader.join(", ") : userAgentHeader;
    const input = {
      adminUserId: admin.user.id,
      targetUserId: body.targetUserId,
      ...(body.academyId ? { academyId: body.academyId } : {}),
      ...(body.reason ? { reason: body.reason } : {}),
      ipAddress: request.ip ?? null,
      userAgent: userAgent ?? null,
    };
    const result = await this.platformSupportService.prepareSupport(input);
    await this.auditService.write({
      adminUserId: admin.user.id,
      action: "platform.support.started",
      targetType: "user",
      targetId: body.targetUserId,
      academyId: body.academyId,
      reason: body.reason,
      metadata: {
        supportSessionId: result.id,
        ipAddress: request.ip ?? null,
        userAgent: userAgent ?? null,
      },
    });
    return result;
  }

  @Post("support/activate")
  @ApiBody({ type: ActivatePlatformSupportBodyDto })
  @ApiOkResponse({ type: PlatformSupportSessionDto })
  async activateSupport(
    @Session() session: PlatformSession,
    @Body() body: ActivatePlatformSupportBodyDto,
  ) {
    if (!session.session.impersonatedBy) throw new BadRequestException("Não há suporte ativo.");
    const result = await this.platformSupportService.activateSupport({
      supportSessionId: body.supportSessionId,
      adminUserId: session.session.impersonatedBy,
      targetUserId: session.user.id,
      impersonationSessionId: session.session.id,
    });
    await this.auditService.write({
      adminUserId: session.session.impersonatedBy,
      action: "platform.support.activated",
      targetType: "user",
      targetId: session.user.id,
      academyId: result.academyId ?? undefined,
      reason: result.reason ?? undefined,
      metadata: { supportSessionId: result.id, impersonationSessionId: session.session.id },
    });
    return result;
  }

  @Get("support/current")
  @ApiOkResponse({ type: PlatformSupportSessionDto })
  currentSupport(@Session() session: PlatformSession) {
    return this.platformSupportService.currentSupport(session.session.id);
  }

  @Post("support/end")
  @ApiOkResponse({ type: PlatformSupportSessionDto })
  async endSupport(@Session() session: PlatformSession) {
    if (!session.session.impersonatedBy) throw new BadRequestException("Não há suporte ativo.");
    const result = await this.platformSupportService.endSupport(session.session.id);
    await this.auditService.write({
      adminUserId: session.session.impersonatedBy,
      action: "platform.support.ended",
      targetType: "user",
      targetId: session.user.id,
      academyId: result.academyId ?? undefined,
      reason: result.reason ?? undefined,
      metadata: { supportSessionId: result.id, impersonationSessionId: session.session.id },
    });
    return result;
  }

  @Get("audit")
  @ApiQuery({ name: "action", required: false, type: String })
  @ApiQuery({ name: "adminUserId", required: false, type: String })
  @ApiQuery({ name: "academyId", required: false, type: String })
  @ApiQuery({ name: "from", required: false, type: String })
  @ApiQuery({ name: "to", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
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
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiOkResponse({ type: PlatformUsersResponseDto })
  users(
    @Session() session: PlatformSession,
    @Query("q") query?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformUserService.listUsers({
      query,
      page: parseOptionalInteger(page),
      pageSize: parseOptionalInteger(pageSize),
    });
  }

  @Get("users/:id")
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ type: PlatformUserDetailDto })
  user(@Session() session: PlatformSession, @Param("id") id: string) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformUserService.getUser(id);
  }

  @Get("users/:id/deletion-impact")
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ type: PlatformUserDeletionImpactDto })
  userDeletionImpact(@Session() session: PlatformSession, @Param("id") id: string) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformUserService.userDeletionImpact(id);
  }

  @Post("users/:id/delete")
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: PlatformDeleteUserBodyDto })
  @ApiOkResponse({ type: PlatformActionResultDto })
  async deleteUser(
    @Session() session: PlatformSession,
    @Param("id") id: string,
    @Body() body: PlatformDeleteUserBodyDto,
  ) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const result = await this.platformUserService.deleteUser(id, body);
    await this.auditService.write({
      adminUserId: admin.user.id,
      action:
        body.mode === "preserve_history"
          ? "platform.user.deleted_preserving_history"
          : "platform.user.deleted",
      targetType: "user",
      targetId: id,
      metadata: {
        mode: body.mode,
        ownerResolution: body.ownerResolution ?? null,
      },
    });
    return result;
  }

  @Post("users/:id/ban")
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: PlatformBanUserBodyDto })
  @ApiOkResponse({ type: PlatformActionResultDto })
  async banUser(
    @Session() session: PlatformSession,
    @Param("id") id: string,
    @Body() body: PlatformBanUserBodyDto,
  ) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const result = await this.platformUserService.banUser(id, body.reason);
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
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ type: PlatformActionResultDto })
  async unbanUser(@Session() session: PlatformSession, @Param("id") id: string) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const result = await this.platformUserService.unbanUser(id);
    await this.auditService.write({
      adminUserId: admin.user.id,
      action: "platform.user.unbanned",
      targetType: "user",
      targetId: id,
    });
    return result;
  }

  @Post("users/:id/revoke-sessions")
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ type: PlatformActionResultDto })
  async revokeUserSessions(@Session() session: PlatformSession, @Param("id") id: string) {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    const result = await this.platformUserService.revokeUserSessions(id);
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

function parseProvisionAcademyBody(body: ProvisionAcademyBodyDto) {
  const academyName = body.academyName?.trim();
  const owner = parseOwnerInput(body);

  if (!academyName) throw new BadRequestException("Nome da academia é obrigatório.");

  return { academyName, ...owner };
}

function parseTransferAcademyBody(body: TransferAcademyBodyDto) {
  return parseOwnerInput(body);
}

function parseAdministratorBody(body: AddPlatformAdministratorBodyDto) {
  const email = body.email?.trim();
  const name = body.name?.trim();

  if (!email?.includes("@")) {
    throw new BadRequestException("Email do administrador é obrigatório.");
  }

  return { email, name };
}

function parseOwnerInput(body: { ownerEmail?: string; ownerName?: string }) {
  const ownerEmail = body.ownerEmail?.trim();
  const ownerName = body.ownerName?.trim();

  if (!ownerEmail?.includes("@")) {
    throw new BadRequestException("Email do dono é obrigatório.");
  }

  return { ownerEmail, ownerName };
}
