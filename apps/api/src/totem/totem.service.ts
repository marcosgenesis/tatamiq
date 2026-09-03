import { createHash, randomBytes, randomInt } from "node:crypto";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { ClassSession, ScheduleOccurrence } from "@tatamiq/contracts";
import {
  type Database,
  member,
  organization,
  totemDevices,
  totemPairingCodes,
  user,
} from "@tatamiq/database";
import { and, eq, gt, isNull } from "drizzle-orm";
import { ClassesService } from "../classes/classes.service";
import { DATABASE } from "../database/database.module";
import { ScheduleService } from "../schedule/schedule.service";
import { pairTotemSchema } from "./totem.dto";

const PAIRING_CODE_MINUTES = 10;
const DEFAULT_DEVICE_NAME = "Totem";

export type TotemAuth = {
  deviceId: string;
  organizationId: string;
  pairedByUserId: string | null;
};

@Injectable()
export class TotemService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(ClassesService) private readonly classesService: ClassesService,
    @Inject(ScheduleService) private readonly scheduleService: ScheduleService,
  ) {}

  async createPairingCode(organizationId: string, userId: string) {
    // Um novo código substitui qualquer código ainda não usado da Academia.
    await this.db
      .update(totemPairingCodes)
      .set({ usedAt: new Date() })
      .where(
        and(eq(totemPairingCodes.organizationId, organizationId), isNull(totemPairingCodes.usedAt)),
      );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = String(randomInt(100000, 1000000));
      const [existing] = await this.db
        .select({ id: totemPairingCodes.id })
        .from(totemPairingCodes)
        .where(eq(totemPairingCodes.codeHash, hash(code)))
        .limit(1);
      if (existing) continue;

      await this.db.insert(totemPairingCodes).values({
        id: crypto.randomUUID(),
        organizationId,
        codeHash: hash(code),
        expiresAt: new Date(Date.now() + PAIRING_CODE_MINUTES * 60_000),
        usedAt: null,
        createdByUserId: userId,
        createdAt: new Date(),
      });
      return { code, expiresInMinutes: PAIRING_CODE_MINUTES };
    }
    throw new BadRequestException("Não foi possível gerar um código de pareamento.");
  }

  async pair(input: unknown) {
    const parsed = pairTotemSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException("Código ou nome do totem inválido.");
    const [codeRow] = await this.db
      .select({
        id: totemPairingCodes.id,
        organizationId: totemPairingCodes.organizationId,
        createdByUserId: totemPairingCodes.createdByUserId,
        expiresAt: totemPairingCodes.expiresAt,
        usedAt: totemPairingCodes.usedAt,
      })
      .from(totemPairingCodes)
      .where(
        and(
          eq(totemPairingCodes.codeHash, hash(parsed.data.code)),
          isNull(totemPairingCodes.usedAt),
          gt(totemPairingCodes.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!codeRow || codeRow.usedAt || codeRow.expiresAt <= new Date()) {
      throw new UnauthorizedException("Código de pareamento expirado ou inválido.");
    }

    const token = randomBytes(32).toString("base64url");
    const deviceName = parsed.data.name || (await this.nextDeviceName(codeRow.organizationId));
    const deviceId = crypto.randomUUID();
    const now = new Date();
    await this.db.transaction(async (tx) => {
      await tx
        .update(totemPairingCodes)
        .set({ usedAt: now })
        .where(and(eq(totemPairingCodes.id, codeRow.id), isNull(totemPairingCodes.usedAt)));
      await tx.insert(totemDevices).values({
        id: deviceId,
        organizationId: codeRow.organizationId,
        name: deviceName,
        tokenHash: hash(token),
        pairedByUserId: codeRow.createdByUserId,
        revokedAt: null,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      });
    });

    const [academy] = await this.db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, codeRow.organizationId))
      .limit(1);
    return { deviceToken: token, deviceName, academyName: academy?.name ?? "Tatamiq" };
  }

  async authenticate(authorization: string | undefined): Promise<TotemAuth> {
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException("Totem não pareado.");
    const [device] = await this.db
      .select({
        id: totemDevices.id,
        organizationId: totemDevices.organizationId,
        pairedByUserId: totemDevices.pairedByUserId,
        revokedAt: totemDevices.revokedAt,
      })
      .from(totemDevices)
      .where(and(eq(totemDevices.tokenHash, hash(token)), isNull(totemDevices.revokedAt)))
      .limit(1);
    if (!device?.pairedByUserId) {
      throw new UnauthorizedException("A autorização deste totem foi revogada.");
    }
    const [responsible] = await this.db
      .select({ id: member.id })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(
        and(
          eq(member.userId, device.pairedByUserId),
          eq(member.organizationId, device.organizationId),
          eq(member.role, "owner"),
          eq(user.banned, false),
        ),
      )
      .limit(1);
    if (!responsible)
      throw new UnauthorizedException("O responsável não tem mais acesso à Academia.");
    await this.db
      .update(totemDevices)
      .set({ lastSeenAt: new Date() })
      .where(eq(totemDevices.id, device.id));
    return {
      deviceId: device.id,
      organizationId: device.organizationId,
      pairedByUserId: device.pairedByUserId,
    };
  }

  async state(auth: TotemAuth) {
    const [academy, today, activeClasses] = await Promise.all([
      this.db
        .select({ name: organization.name })
        .from(organization)
        .where(eq(organization.id, auth.organizationId))
        .limit(1),
      this.scheduleService.today(auth.organizationId),
      this.classesService.getActiveMany(auth.organizationId),
    ]);
    return {
      deviceName: await this.deviceName(auth.deviceId),
      academyName: academy[0]?.name ?? "Tatamiq",
      activeClasses: activeClasses.map((item) => toTotemOccurrence(item)),
      today: today.occurrences.map((item) => toTotemOccurrence(item)),
    };
  }

  async start(auth: TotemAuth, occurrenceId: string) {
    const today = await this.scheduleService.today(auth.organizationId);
    const occurrence = today.occurrences.find((item) => item.id === occurrenceId);
    if (occurrence?.status !== "scheduled") {
      throw new BadRequestException("Esta ocorrência não pode ser iniciada pelo totem.");
    }
    if (occurrence.source === "recurring" && occurrence.scheduleId) {
      return toTotemOccurrence(
        await this.classesService.startRecurring(
          auth.organizationId,
          auth.pairedByUserId ?? "totem",
          {
            classGroupId: occurrence.classGroupId,
            scheduleId: occurrence.scheduleId,
            scheduledDate: occurrence.scheduledDate,
          },
        ),
      );
    }
    if (!occurrence.classSessionId) throw new BadRequestException("Aula sem sessão iniciável.");
    return toTotemOccurrence(
      await this.classesService.startAdHoc(auth.organizationId, occurrence.classSessionId),
    );
  }

  async qr(auth: TotemAuth, classSessionId: string) {
    const token = await this.classesService.getQrToken(auth.organizationId, classSessionId);
    const portalUrl =
      process.env.STUDENT_PORTAL_URL ?? process.env.WEB_APP_URL ?? "http://localhost:5173";
    return {
      url: `${portalUrl.replace(/\/$/, "")}/student/check-in?token=${encodeURIComponent(token.token)}`,
      issuedAt: token.issuedAt,
      expiresAt: token.expiresAt,
    };
  }

  async listDevices(organizationId: string) {
    return this.db
      .select({
        id: totemDevices.id,
        name: totemDevices.name,
        revokedAt: totemDevices.revokedAt,
        lastSeenAt: totemDevices.lastSeenAt,
        createdAt: totemDevices.createdAt,
      })
      .from(totemDevices)
      .where(eq(totemDevices.organizationId, organizationId));
  }

  async revokeDevice(organizationId: string, id: string) {
    const result = await this.db
      .update(totemDevices)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(totemDevices.id, id),
          eq(totemDevices.organizationId, organizationId),
          isNull(totemDevices.revokedAt),
        ),
      );
    if (result.count === 0) throw new NotFoundException("Totem não encontrado ou já revogado.");
  }

  private async deviceName(id: string) {
    const [device] = await this.db
      .select({ name: totemDevices.name })
      .from(totemDevices)
      .where(eq(totemDevices.id, id))
      .limit(1);
    return device?.name ?? DEFAULT_DEVICE_NAME;
  }

  private async nextDeviceName(organizationId: string) {
    const devices = await this.db
      .select({ name: totemDevices.name })
      .from(totemDevices)
      .where(eq(totemDevices.organizationId, organizationId));
    const used = new Set(devices.map((device) => device.name));
    let index = 1;
    while (used.has(`${DEFAULT_DEVICE_NAME} ${index}`)) index += 1;
    return `${DEFAULT_DEVICE_NAME} ${index}`;
  }
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

type TotemOccurrenceResponse = {
  id: string;
  classGroupId: string;
  classGroupName: string;
  scheduledStartAt: string;
  durationMinutes: number;
  status: "scheduled" | "active" | "ended" | "cancelled";
  actualStartAt: string | null;
};

function toTotemOccurrence(item: ScheduleOccurrence | ClassSession): TotemOccurrenceResponse {
  if ("source" in item) {
    return {
      id: item.id,
      classGroupId: item.classGroupId,
      classGroupName: item.classGroupName,
      scheduledStartAt: item.scheduledStartAt,
      durationMinutes: item.durationMinutes,
      status: item.status,
      actualStartAt: null,
    };
  }
  return {
    id: item.id,
    classGroupId: item.classGroupId,
    classGroupName: item.classGroupName,
    scheduledStartAt: item.scheduledStartAt,
    durationMinutes: item.durationMinutes,
    status: item.status,
    actualStartAt: item.actualStartAt,
  };
}
