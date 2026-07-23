import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ApprovePreRegistrationRequestInput,
  ApprovePreRegistrationResponse,
  CompleteFirstAccessInput,
  CompleteFirstAccessResponse,
  CreatePreRegistrationRequestInput,
  FirstAccessPreview,
  GenerateFirstAccessLinkResponse,
  ListPreRegistrationRequestsResponse,
  PreRegistrationLink,
  PreRegistrationPublicProfile,
  PreRegistrationRequest,
  RejectPreRegistrationRequestInput,
  SendFirstAccessEmailResponse,
} from "@tatamiq/contracts";
import {
  academyPreRegistrationLinks,
  account,
  belts,
  type Database,
  member,
  organization,
  preRegistrationRequests,
  studentAccess,
  studentGuardians,
  students,
  user,
} from "@tatamiq/database";
import { and, desc, eq, sql } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { StudentAccessActivationService } from "../student-access/student-access-activation.service";
import { hashToken, STUDENT_ACCESS_TERMS_VERSION } from "../student-access/student-access-rules";
import { EmailService } from "./email.service";
import { PreRegistrationLinkLifecycle } from "./pre-registration-link-lifecycle";
import { parseLinkStatus } from "./pre-registration-link-rules";
import { isMinor } from "./student-rules";

const FIRST_ACCESS_DAYS = 7;
const PRE_REGISTRATION_THROTTLE_WINDOW_MS = 10 * 60 * 1000;
const PRE_REGISTRATION_EMAIL_ATTEMPT_LIMIT = 3;
const PRE_REGISTRATION_IP_ATTEMPT_LIMIT = 20;
const PRE_REGISTRATION_THROTTLED_MESSAGE =
  "Muitas tentativas de pré-cadastro. Aguarde alguns minutos e tente novamente.";

const preRegistrationEmailAttempts = new Map<string, number[]>();
const preRegistrationIpAttempts = new Map<string, number[]>();

export function resetPreRegistrationThrottleForTests() {
  preRegistrationEmailAttempts.clear();
  preRegistrationIpAttempts.clear();
}

type LinkRow = typeof academyPreRegistrationLinks.$inferSelect;
type RequestRow = typeof preRegistrationRequests.$inferSelect;

type DuplicateStudent = { id: string; name: string } | null;

@Injectable()
export class PreRegistrationService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(StudentAccessActivationService)
    private readonly activationService: StudentAccessActivationService,
    @Inject(PreRegistrationLinkLifecycle)
    private readonly linkLifecycle: PreRegistrationLinkLifecycle,
  ) {}

  // --- Link management (delegated to lifecycle) ---

  async getOrCreateLink(organizationId: string): Promise<PreRegistrationLink> {
    await this.linkLifecycle.getOrCreateLink(organizationId);
    return this.fetchLinkDto(organizationId);
  }

  async pauseLink(organizationId: string): Promise<PreRegistrationLink> {
    await this.linkLifecycle.pauseLink(organizationId);
    return this.fetchLinkDto(organizationId);
  }

  async reactivateLink(organizationId: string): Promise<PreRegistrationLink> {
    await this.linkLifecycle.reactivateLink(organizationId);
    return this.fetchLinkDto(organizationId);
  }

  async regenerateLink(organizationId: string): Promise<PreRegistrationLink> {
    await this.linkLifecycle.regenerateLink(organizationId);
    return this.fetchLinkDto(organizationId);
  }

  async copyLink(organizationId: string): Promise<PreRegistrationLink> {
    await this.linkLifecycle.markCopied(organizationId);
    return this.fetchLinkDto(organizationId);
  }

  // --- Public form (link resolution delegated to lifecycle) ---

  async publicProfile(token: string): Promise<PreRegistrationPublicProfile> {
    return this.linkLifecycle.resolvePublicProfile(token);
  }

  async createRequest(
    token: string,
    input: CreatePreRegistrationRequestInput,
    clientIp?: string | null,
  ): Promise<PreRegistrationRequest> {
    const { linkId, organizationId } = await this.linkLifecycle.resolveActiveLink(token);

    this.validateRequest(input);

    const normalizedEmail = input.email.trim().toLowerCase();
    this.assertPublicSubmissionAllowed(organizationId, normalizedEmail, clientIp);

    const duplicateEmail = await this.findOpenRequestByEmail(organizationId, normalizedEmail);
    if (duplicateEmail) {
      throw new ConflictException("Já existe uma solicitação em análise para este email.");
    }

    const existingAccount = await this.findAuthUserByEmail(normalizedEmail);
    if (existingAccount) {
      throw new ConflictException("Este email já está em uso na plataforma.");
    }

    const duplicateStudent = await this.findDuplicateStudent(
      organizationId,
      input.name,
      input.birthDate,
    );

    const declaredBeltId = emptyToNull(input.declaredBeltId);
    if (declaredBeltId) {
      await this.assertBeltBelongsToOrg(organizationId, declaredBeltId, input.declaredDegree ?? 0);
    }

    const now = new Date();
    const [created] = await this.db
      .insert(preRegistrationRequests)
      .values({
        id: crypto.randomUUID(),
        organizationId,
        linkId,
        status: "pending_review",
        name: input.name.trim(),
        birthDate: input.birthDate,
        phone: input.phone.trim(),
        email: normalizedEmail,
        guardianName: emptyToNull(input.guardianName),
        guardianPhone: emptyToNull(input.guardianPhone),
        note: emptyToNull(input.note),
        cpf: emptyToNull(input.cpf),
        declaredBeltId,
        declaredDegree: input.declaredDegree ?? null,
        consentAcceptedAt: now,
        reviewedByUserId: null,
        reviewedAt: null,
        rejectionReason: null,
        approvedStudentId: null,
        approvedStudentAccessId: null,
        duplicateStudentId: duplicateStudent?.id ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.toRequestDto(created, duplicateStudent);
  }

  // --- Instructor queue ---

  async listRequests(organizationId: string): Promise<ListPreRegistrationRequestsResponse> {
    const rows = await this.db
      .select({ request: preRegistrationRequests, duplicateName: students.name })
      .from(preRegistrationRequests)
      .leftJoin(students, eq(preRegistrationRequests.duplicateStudentId, students.id))
      .where(eq(preRegistrationRequests.organizationId, organizationId))
      .orderBy(preRegistrationRequests.createdAt);

    const enriched = await Promise.all(
      rows.map(async ({ request, duplicateName }) => {
        const dup =
          request.duplicateStudentId && duplicateName
            ? { id: request.duplicateStudentId, name: duplicateName }
            : null;
        return this.toRequestDto(request, dup);
      }),
    );

    let pendingReview = 0;
    let approved = 0;
    let rejected = 0;
    for (const { request } of rows) {
      if (request.status === "approved") approved++;
      else if (request.status === "rejected") rejected++;
      else pendingReview++;
    }

    return {
      requests: enriched,
      summary: { pendingReview, approved, rejected },
    };
  }

  async rejectRequest(
    organizationId: string,
    requestId: string,
    userId: string,
    input: RejectPreRegistrationRequestInput,
  ): Promise<PreRegistrationRequest> {
    const existing = await this.findRequest(organizationId, requestId);
    if (existing.status !== "pending_review") {
      throw new BadRequestException("Somente solicitações em análise podem ser rejeitadas.");
    }

    const now = new Date();
    const [updated] = await this.db
      .update(preRegistrationRequests)
      .set({
        status: "rejected",
        reviewedByUserId: userId,
        reviewedAt: now,
        rejectionReason: input.reason?.trim() || null,
        updatedAt: now,
      })
      .where(
        and(
          eq(preRegistrationRequests.id, requestId),
          eq(preRegistrationRequests.organizationId, organizationId),
        ),
      )
      .returning();

    const duplicateStudent = updated.duplicateStudentId
      ? await this.findStudentById(organizationId, updated.duplicateStudentId)
      : null;
    return this.toRequestDto(updated, duplicateStudent);
  }

  // --- Approval (#58, #60) ---

  async approveRequest(
    organizationId: string,
    requestId: string,
    userId: string,
    input: ApprovePreRegistrationRequestInput,
  ): Promise<ApprovePreRegistrationResponse> {
    const existing = await this.findRequest(organizationId, requestId);
    if (existing.status !== "pending_review") {
      throw new BadRequestException("Somente solicitações em análise podem ser aprovadas.");
    }

    if (existing.duplicateStudentId && input.duplicateDecision === "reject_as_duplicate") {
      return this.rejectAsDuplicate(organizationId, requestId, userId, existing);
    }

    const linkToExisting =
      existing.duplicateStudentId && input.duplicateDecision === "link_to_existing";

    if (linkToExisting && existing.duplicateStudentId) {
      const existingAccess = await this.findActiveAccessForStudent(existing.duplicateStudentId);
      if (existingAccess) {
        throw new BadRequestException(
          "Este aluno já possui acesso ativo. Não é possível vincular.",
        );
      }
    }

    const whiteBelt = await this.findWhiteBelt(organizationId, existing.birthDate);
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + FIRST_ACCESS_DAYS);
    const todayStr = now.toISOString().slice(0, 10);

    const studentId = linkToExisting ? existing.duplicateStudentId : crypto.randomUUID();
    if (!studentId) throw new BadRequestException("Aluno duplicado não encontrado.");
    let accessId = "";
    const authUser = await this.findOrCreateAuthUser(existing.name, existing.email);

    await this.db.transaction(async (tx) => {
      if (!linkToExisting) {
        await tx.insert(students).values({
          id: studentId,
          organizationId,
          name: existing.name,
          birthDate: existing.birthDate,
          enrollmentDate: todayStr,
          status: "active",
          phone: existing.phone,
          email: existing.email,
          monthlyAmountInCents: null,
          monthlyDueDay: null,
          currentBeltId: existing.declaredBeltId ?? whiteBelt.id,
          currentDegree: existing.declaredDegree ?? 0,
          createdAt: now,
          updatedAt: now,
        });

        if (existing.guardianName && existing.guardianPhone) {
          await tx.insert(studentGuardians).values({
            id: crypto.randomUUID(),
            studentId,
            name: existing.guardianName,
            phone: existing.guardianPhone,
            email: null,
            relationship: null,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      const activation = await this.activationService.activate(tx, {
        organizationId,
        studentId,
        authUserId: authUser.id,
        termsVersion: STUDENT_ACCESS_TERMS_VERSION,
      });
      accessId = activation.accessId;

      await tx
        .update(preRegistrationRequests)
        .set({
          status: "approved",
          reviewedByUserId: userId,
          reviewedAt: now,
          approvedStudentId: studentId,
          approvedStudentAccessId: accessId,
          firstAccessTokenHash: tokenHash,
          firstAccessTokenExpiresAt: expiresAt,
          updatedAt: now,
        })
        .where(eq(preRegistrationRequests.id, requestId));
    });

    const updatedRow = await this.findRequest(organizationId, requestId);
    const duplicateStudent = updatedRow.duplicateStudentId
      ? await this.findStudentById(organizationId, updatedRow.duplicateStudentId)
      : null;

    return {
      request: await this.toRequestDto(updatedRow, duplicateStudent),
      firstAccessLink: `${webAppUrl()}/student/first-access/${rawToken}`,
      studentId,
    };
  }

  private async rejectAsDuplicate(
    organizationId: string,
    requestId: string,
    userId: string,
    existing: RequestRow,
  ): Promise<ApprovePreRegistrationResponse> {
    const now = new Date();
    const [updated] = await this.db
      .update(preRegistrationRequests)
      .set({
        status: "rejected",
        reviewedByUserId: userId,
        reviewedAt: now,
        rejectionReason: "Rejeitada como duplicata.",
        updatedAt: now,
      })
      .where(eq(preRegistrationRequests.id, requestId))
      .returning();

    const dupStudent = existing.duplicateStudentId
      ? await this.findStudentById(organizationId, existing.duplicateStudentId)
      : null;

    return {
      request: await this.toRequestDto(updated, dupStudent),
      firstAccessLink: "",
      studentId: "",
    };
  }

  // --- First access (#59) ---

  async previewFirstAccess(token: string): Promise<FirstAccessPreview> {
    const row = await this.findRequestByFirstAccessToken(token);
    if (!row)
      return { status: "invalid", hasPassword: false, studentName: null, academyName: null };

    if (row.request.firstAccessConsumedAt) {
      return { status: "consumed", hasPassword: false, studentName: null, academyName: null };
    }

    const now = new Date();
    if (row.request.firstAccessTokenExpiresAt && row.request.firstAccessTokenExpiresAt <= now) {
      return { status: "expired", hasPassword: false, studentName: null, academyName: null };
    }

    const authUser = await this.findAuthUserByEmail(row.request.email);
    const hasPassword = authUser ? await this.userHasPassword(authUser.id) : false;

    return {
      status: "valid",
      hasPassword,
      studentName: row.request.name,
      academyName: row.academy.name,
    };
  }

  async completeFirstAccess(
    token: string,
    input: CompleteFirstAccessInput,
  ): Promise<CompleteFirstAccessResponse> {
    const row = await this.findRequestByFirstAccessToken(token);
    if (!row) throw new NotFoundException("Token de primeiro acesso inválido.");

    if (row.request.firstAccessConsumedAt) {
      throw new BadRequestException("Este token já foi utilizado.");
    }

    const now = new Date();
    if (row.request.firstAccessTokenExpiresAt && row.request.firstAccessTokenExpiresAt <= now) {
      throw new BadRequestException("Token de primeiro acesso expirado.");
    }

    const authUser = await this.findAuthUserByEmail(row.request.email);
    if (!authUser) throw new NotFoundException("Conta não encontrada.");

    const hasPassword = await this.userHasPassword(authUser.id);

    if (!hasPassword) {
      if (!input.password) {
        throw new BadRequestException("Senha é obrigatória para novos usuários.");
      }
      const { hashPassword } = await import("better-auth/crypto");
      const hashed = await hashPassword(input.password);
      await this.db
        .update(account)
        .set({ password: hashed, updatedAt: now })
        .where(and(eq(account.userId, authUser.id), eq(account.providerId, "credential")));
    }

    await this.db
      .update(preRegistrationRequests)
      .set({ firstAccessConsumedAt: now, updatedAt: now })
      .where(eq(preRegistrationRequests.id, row.request.id));

    return { redirectTo: hasPassword ? "student" : "sign-in" };
  }

  // --- Email (#61) ---

  async generateFirstAccessLink(
    organizationId: string,
    requestId: string,
  ): Promise<GenerateFirstAccessLinkResponse> {
    const { firstAccessLink } = await this.rotateFirstAccessToken(
      organizationId,
      requestId,
      "Link de primeiro acesso só pode ser gerado para solicitações aprovadas.",
    );
    return { firstAccessLink };
  }

  async generateFirstAccessLinkForStudent(
    organizationId: string,
    studentId: string,
  ): Promise<GenerateFirstAccessLinkResponse> {
    const [request] = await this.db
      .select()
      .from(preRegistrationRequests)
      .where(
        and(
          eq(preRegistrationRequests.organizationId, organizationId),
          eq(preRegistrationRequests.approvedStudentId, studentId),
          eq(preRegistrationRequests.status, "approved"),
        ),
      )
      .orderBy(desc(preRegistrationRequests.reviewedAt), desc(preRegistrationRequests.createdAt))
      .limit(1);

    if (!request) {
      throw new NotFoundException("Solicitação aprovada do aluno não encontrada.");
    }

    return this.generateFirstAccessLink(organizationId, request.id);
  }

  async sendFirstAccessEmail(
    organizationId: string,
    requestId: string,
  ): Promise<SendFirstAccessEmailResponse> {
    const { request, firstAccessLink } = await this.rotateFirstAccessToken(
      organizationId,
      requestId,
      "Email só pode ser enviado para solicitações aprovadas.",
    );

    const [academy] = await this.db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);
    if (!academy) throw new NotFoundException("Academia não encontrada.");

    await this.emailService.send({
      to: request.email,
      subject: `Seu acesso ao ${academy.name} no Tatamiq`,
      html: buildFirstAccessEmailHtml(academy.name, request.name, firstAccessLink),
    });

    return { sent: true };
  }

  // --- Private: link DTO projection ---

  private async rotateFirstAccessToken(
    organizationId: string,
    requestId: string,
    notApprovedMessage: string,
  ) {
    const request = await this.findRequest(organizationId, requestId);
    if (request.status !== "approved") {
      throw new BadRequestException(notApprovedMessage);
    }

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + FIRST_ACCESS_DAYS);

    await this.db
      .update(preRegistrationRequests)
      .set({
        firstAccessTokenHash: tokenHash,
        firstAccessTokenExpiresAt: expiresAt,
        firstAccessConsumedAt: null,
        updatedAt: now,
      })
      .where(eq(preRegistrationRequests.id, requestId));

    return {
      request,
      firstAccessLink: `${webAppUrl()}/student/first-access/${rawToken}`,
    };
  }

  private async fetchLinkDto(organizationId: string): Promise<PreRegistrationLink> {
    const [row] = await this.db
      .select()
      .from(academyPreRegistrationLinks)
      .where(eq(academyPreRegistrationLinks.organizationId, organizationId))
      .limit(1);
    if (!row) throw new NotFoundException("Link de pré-cadastro não encontrado.");
    return this.toLinkDto(row);
  }

  // --- Private helpers ---

  /**
   * Ensures a declared belt exists, belongs to this academy, and that the
   * declared degree fits the belt. Without the org check, an anonymous
   * submitter could reference another academy's belt (cross-tenant leak) or a
   * non-existent id, which would surface as a raw foreign-key 500. The degree
   * check rejects impossible combinations (e.g. a white belt with 6 degrees)
   * that the client could send when its state gets out of sync.
   */
  private async assertBeltBelongsToOrg(
    organizationId: string,
    beltId: string,
    declaredDegree: number,
  ): Promise<void> {
    const [belt] = await this.db
      .select({ id: belts.id, maxDegrees: belts.maxDegrees })
      .from(belts)
      .where(and(eq(belts.organizationId, organizationId), eq(belts.id, beltId)))
      .limit(1);
    if (!belt) throw new BadRequestException("Faixa informada é inválida.");
    if (declaredDegree > belt.maxDegrees) {
      throw new BadRequestException("Grau informado é inválido para a faixa selecionada.");
    }
  }

  private async findWhiteBelt(organizationId: string, birthDate: string) {
    const path = isMinor(birthDate) ? "child" : "adult";
    const slug = `${path}-white`;

    const [belt] = await this.db
      .select()
      .from(belts)
      .where(and(eq(belts.organizationId, organizationId), eq(belts.slug, slug)))
      .limit(1);

    if (!belt) throw new BadRequestException("Faixa branca não encontrada na academia.");
    return belt;
  }

  private async findOrCreateAuthUser(
    name: string,
    email: string,
  ): Promise<{ id: string; isNew: boolean }> {
    const existing = await this.findAuthUserByEmail(email);
    if (existing) return { id: existing.id, isNew: false };

    const userId = crypto.randomUUID();
    const now = new Date();

    await this.db.insert(user).values({
      id: userId,
      name: name.trim(),
      email: email.toLowerCase(),
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    await this.db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: null,
      createdAt: now,
      updatedAt: now,
    });

    return { id: userId, isNew: true };
  }

  private async findAuthUserByEmail(email: string) {
    const [row] = await this.db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.email, email.toLowerCase()))
      .limit(1);
    return row ?? null;
  }

  private async userHasPassword(userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ password: account.password })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
      .limit(1);
    return !!row?.password;
  }

  private async isInstructorAccount(email: string): Promise<boolean> {
    const authUser = await this.findAuthUserByEmail(email);
    if (!authUser) return false;
    const [row] = await this.db
      .select({ id: member.id })
      .from(member)
      .where(eq(member.userId, authUser.id))
      .limit(1);
    return !!row;
  }

  private async findActiveAccessForStudent(studentId: string) {
    const [row] = await this.db
      .select({ id: studentAccess.id })
      .from(studentAccess)
      .where(and(eq(studentAccess.studentId, studentId), eq(studentAccess.status, "active")))
      .limit(1);
    return row ?? null;
  }

  private async findRequestByFirstAccessToken(token: string) {
    const tokenHash = hashToken(token);
    const [row] = await this.db
      .select({ request: preRegistrationRequests, academy: organization })
      .from(preRegistrationRequests)
      .innerJoin(organization, eq(preRegistrationRequests.organizationId, organization.id))
      .where(eq(preRegistrationRequests.firstAccessTokenHash, tokenHash))
      .limit(1);
    return row ?? null;
  }

  private assertPublicSubmissionAllowed(
    organizationId: string,
    normalizedEmail: string,
    clientIp?: string | null,
  ) {
    const now = Date.now();
    const emailKey = `${organizationId}:${normalizedEmail}`;
    recordThrottleAttempt(
      preRegistrationEmailAttempts,
      emailKey,
      PRE_REGISTRATION_EMAIL_ATTEMPT_LIMIT,
      now,
    );

    if (clientIp) {
      recordThrottleAttempt(
        preRegistrationIpAttempts,
        clientIp,
        PRE_REGISTRATION_IP_ATTEMPT_LIMIT,
        now,
      );
    }
  }

  private async findOpenRequestByEmail(organizationId: string, email: string) {
    const [row] = await this.db
      .select({ id: preRegistrationRequests.id })
      .from(preRegistrationRequests)
      .where(
        and(
          eq(preRegistrationRequests.organizationId, organizationId),
          sql`lower(${preRegistrationRequests.email}) = ${email}`,
          sql`${preRegistrationRequests.status} IN ('pending_review', 'approved')`,
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private async findDuplicateStudent(
    organizationId: string,
    name: string,
    birthDate: string,
  ): Promise<DuplicateStudent> {
    const [row] = await this.db
      .select({ id: students.id, name: students.name })
      .from(students)
      .where(
        and(
          eq(students.organizationId, organizationId),
          eq(students.birthDate, birthDate),
          sql`lower(${students.name}) = ${name.trim().toLowerCase()}`,
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private async findStudentById(organizationId: string, id: string): Promise<DuplicateStudent> {
    const [row] = await this.db
      .select({ id: students.id, name: students.name })
      .from(students)
      .where(and(eq(students.organizationId, organizationId), eq(students.id, id)))
      .limit(1);
    return row ?? null;
  }

  private async findRequest(organizationId: string, requestId: string): Promise<RequestRow> {
    const [row] = await this.db
      .select()
      .from(preRegistrationRequests)
      .where(
        and(
          eq(preRegistrationRequests.id, requestId),
          eq(preRegistrationRequests.organizationId, organizationId),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Solicitação de pré-cadastro não encontrada.");
    return row;
  }

  private validateRequest(input: CreatePreRegistrationRequestInput): void {
    if (!input.consentAccepted) {
      throw new BadRequestException("Consentimento de pré-cadastro é obrigatório.");
    }
    if (isMinor(input.birthDate)) {
      if (!input.guardianName?.trim() || !input.guardianPhone?.trim()) {
        throw new BadRequestException("Menor de idade precisa de responsável com nome e telefone.");
      }
    }
  }

  private toLinkDto(row: LinkRow): PreRegistrationLink {
    return {
      id: row.id,
      status: parseLinkStatus(row.status),
      url: `${webAppUrl()}/pre-register/${row.token}`,
      regeneratedAt: row.regeneratedAt?.toISOString() ?? null,
      copiedAt: row.copiedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toRequestDto(
    row: RequestRow,
    duplicateStudent: DuplicateStudent,
  ): Promise<PreRegistrationRequest> {
    const isInstructor = await this.isInstructorAccount(row.email);
    const hasActiveAccess = row.duplicateStudentId
      ? !!(await this.findActiveAccessForStudent(row.duplicateStudentId))
      : false;

    return {
      id: row.id,
      status: parseRequestStatus(row.status),
      name: row.name,
      birthDate: row.birthDate,
      phone: row.phone,
      email: row.email,
      guardianName: row.guardianName,
      guardianPhone: row.guardianPhone,
      note: row.note,
      duplicateStudent,
      rejectionReason: row.rejectionReason,
      approvedStudentId: row.approvedStudentId,
      isInstructorAccount: isInstructor,
      duplicateStudentHasActiveAccess: hasActiveAccess,
      cpf: row.cpf ?? null,
      declaredBeltId: row.declaredBeltId ?? null,
      declaredDegree: row.declaredDegree ?? null,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
    };
  }
}

function recordThrottleAttempt(
  store: Map<string, number[]>,
  key: string,
  limit: number,
  now: number,
) {
  const windowStart = now - PRE_REGISTRATION_THROTTLE_WINDOW_MS;
  const attempts = (store.get(key) ?? []).filter((timestamp) => timestamp > windowStart);
  if (attempts.length >= limit) {
    store.set(key, attempts);
    throw new HttpException(PRE_REGISTRATION_THROTTLED_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
  }
  attempts.push(now);
  store.set(key, attempts);
}

function parseRequestStatus(value: string): "pending_review" | "approved" | "rejected" {
  if (value === "pending_review" || value === "approved" || value === "rejected") return value;
  throw new BadRequestException("Status da solicitação de pré-cadastro inválido.");
}

function emptyToNull(value?: string): string | null {
  return value?.trim() || null;
}

function webAppUrl(): string {
  return process.env.WEB_APP_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:5173";
}

/** Escapes text before interpolating it into email HTML (prevents HTML/script injection). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildFirstAccessEmailHtml(
  academyName: string,
  studentName: string,
  firstAccessUrl: string,
): string {
  const safeAcademyName = escapeHtml(academyName);
  const safeStudentName = escapeHtml(studentName);
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
      <h2 style="margin: 0 0 8px;">Bem-vindo ao ${safeAcademyName}!</h2>
      <p>Olá ${safeStudentName},</p>
      <p>Seu pré-cadastro foi aprovado. Use o link abaixo para configurar seu acesso ao Tatamiq:</p>
      <p style="margin: 24px 0;">
        <a href="${firstAccessUrl}" style="background: #18181b; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
          Configurar meu acesso
        </a>
      </p>
      <p style="color: #71717a; font-size: 14px;">Este link expira em 7 dias.</p>
    </div>
  `;
}
