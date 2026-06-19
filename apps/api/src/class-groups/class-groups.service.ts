import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { ClassGroup, CreateClassGroupInput, UpdateClassGroupInput } from "@tatamiq/contracts";
import {
  classGroupSchedules,
  classGroups,
  classGroupTags,
  type Database,
  studentClassGroups,
  students,
} from "@tatamiq/database";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { normalizeClassGroupInput } from "./class-group-rules";

type ClassGroupRow = typeof classGroups.$inferSelect;
type ScheduleRow = typeof classGroupSchedules.$inferSelect;
type ClassGroupStatusFilter = "active" | "archived" | "all";
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type ServiceDb = Database | Transaction;

@Injectable()
export class ClassGroupsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(organizationId: string, status: ClassGroupStatusFilter = "active") {
    const conditions = [eq(classGroups.organizationId, organizationId)];
    if (status !== "all") conditions.push(eq(classGroups.status, status));

    const rows = await this.db
      .select()
      .from(classGroups)
      .where(and(...conditions))
      .orderBy(classGroups.name);

    const allRows = await this.db
      .select({ status: classGroups.status })
      .from(classGroups)
      .where(eq(classGroups.organizationId, organizationId));

    return {
      classGroups: await this.toDtos(organizationId, rows),
      summary: {
        active: allRows.filter((row) => row.status === "active").length,
        archived: allRows.filter((row) => row.status === "archived").length,
        total: allRows.length,
      },
    };
  }

  async create(organizationId: string, input: CreateClassGroupInput): Promise<ClassGroup> {
    const normalized = normalizeClassGroupInput(input);
    await this.ensureStudentsBelongToOrganization(organizationId, normalized.studentIds ?? []);

    const id = crypto.randomUUID();
    const now = new Date();

    await this.db.transaction(async (tx) => {
      await tx.insert(classGroups).values({
        id,
        organizationId,
        name: normalized.name.trim(),
        defaultDurationMinutes: normalized.defaultDurationMinutes,
        status: "active",
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      await this.replaceSchedules(organizationId, id, normalized.schedules, tx);
      await this.replaceTags(organizationId, id, normalized.tags, tx);
      await this.replaceStudentLinks(organizationId, id, normalized.studentIds ?? [], tx);
    });

    return this.get(organizationId, id);
  }

  async get(organizationId: string, id: string): Promise<ClassGroup> {
    const row = await this.findClassGroup(organizationId, id);
    const [dto] = await this.toDtos(organizationId, [row]);
    if (!dto) throw new NotFoundException("Turma não encontrada.");
    return dto;
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateClassGroupInput,
  ): Promise<ClassGroup> {
    await this.findClassGroup(organizationId, id);
    const normalized = normalizeClassGroupInput(input);
    await this.ensureStudentsBelongToOrganization(organizationId, normalized.studentIds ?? []);

    const now = new Date();
    const status = normalized.status;
    await this.db.transaction(async (tx) => {
      await tx
        .update(classGroups)
        .set({
          name: normalized.name.trim(),
          defaultDurationMinutes: normalized.defaultDurationMinutes,
          status,
          archivedAt: status === "archived" ? now : status === "active" ? null : undefined,
          updatedAt: now,
        })
        .where(and(eq(classGroups.id, id), eq(classGroups.organizationId, organizationId)));

      await this.replaceSchedules(organizationId, id, normalized.schedules, tx);
      await this.replaceTags(organizationId, id, normalized.tags, tx);
      await this.replaceStudentLinks(organizationId, id, normalized.studentIds ?? [], tx);
    });

    return this.get(organizationId, id);
  }

  async archive(organizationId: string, id: string): Promise<ClassGroup> {
    await this.findClassGroup(organizationId, id);
    await this.db
      .update(classGroups)
      .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(classGroups.id, id), eq(classGroups.organizationId, organizationId)));
    return this.get(organizationId, id);
  }

  async reactivate(organizationId: string, id: string): Promise<ClassGroup> {
    await this.findClassGroup(organizationId, id);
    await this.db
      .update(classGroups)
      .set({ status: "active", archivedAt: null, updatedAt: new Date() })
      .where(and(eq(classGroups.id, id), eq(classGroups.organizationId, organizationId)));
    return this.get(organizationId, id);
  }

  private async findClassGroup(organizationId: string, id: string): Promise<ClassGroupRow> {
    const [row] = await this.db
      .select()
      .from(classGroups)
      .where(and(eq(classGroups.id, id), eq(classGroups.organizationId, organizationId)))
      .limit(1);

    if (!row) throw new NotFoundException("Turma não encontrada.");
    return row;
  }

  private async ensureStudentsBelongToOrganization(organizationId: string, studentIds: string[]) {
    if (studentIds.length === 0) return;
    const uniqueIds = [...new Set(studentIds)];
    const rows = await this.db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.organizationId, organizationId), inArray(students.id, uniqueIds)));

    if (rows.length !== uniqueIds.length) {
      throw new BadRequestException("Um ou mais alunos não pertencem à academia ativa.");
    }
  }

  private async replaceSchedules(
    organizationId: string,
    classGroupId: string,
    schedules: CreateClassGroupInput["schedules"],
    db: ServiceDb = this.db,
  ) {
    await db.delete(classGroupSchedules).where(eq(classGroupSchedules.classGroupId, classGroupId));
    await db.insert(classGroupSchedules).values(
      schedules.map((schedule) => ({
        id: crypto.randomUUID(),
        organizationId,
        classGroupId,
        weekday: schedule.weekday,
        startTime: schedule.startTime,
        createdAt: new Date(),
      })),
    );
  }

  private async replaceTags(
    organizationId: string,
    classGroupId: string,
    tags: string[],
    db: ServiceDb = this.db,
  ) {
    await db.delete(classGroupTags).where(eq(classGroupTags.classGroupId, classGroupId));
    if (tags.length === 0) return;
    await db.insert(classGroupTags).values(
      tags.map((label) => ({
        id: crypto.randomUUID(),
        organizationId,
        classGroupId,
        label,
      })),
    );
  }

  private async replaceStudentLinks(
    organizationId: string,
    classGroupId: string,
    studentIds: string[],
    db: ServiceDb = this.db,
  ) {
    const uniqueIds = [...new Set(studentIds)];
    const activeLinks = await db
      .select()
      .from(studentClassGroups)
      .where(
        and(
          eq(studentClassGroups.classGroupId, classGroupId),
          isNull(studentClassGroups.activeUntil),
        ),
      );

    const currentIds = new Set(activeLinks.map((link) => link.studentId));
    const nextIds = new Set(uniqueIds);
    const today = new Date().toISOString().slice(0, 10);

    for (const link of activeLinks) {
      if (!nextIds.has(link.studentId)) {
        await db
          .update(studentClassGroups)
          .set({ activeUntil: today })
          .where(eq(studentClassGroups.id, link.id));
      }
    }

    const newLinks = uniqueIds.filter((studentId) => !currentIds.has(studentId));
    if (newLinks.length === 0) return;

    await db.insert(studentClassGroups).values(
      newLinks.map((studentId) => ({
        id: crypto.randomUUID(),
        organizationId,
        studentId,
        classGroupId,
        activeFrom: today,
        activeUntil: null,
        createdAt: new Date(),
      })),
    );
  }

  private async toDtos(organizationId: string, rows: ClassGroupRow[]): Promise<ClassGroup[]> {
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return [];

    const schedules = await this.db
      .select()
      .from(classGroupSchedules)
      .where(inArray(classGroupSchedules.classGroupId, ids));
    const tags = await this.db
      .select()
      .from(classGroupTags)
      .where(inArray(classGroupTags.classGroupId, ids));
    const links = await this.db
      .select({
        classGroupId: studentClassGroups.classGroupId,
        studentId: students.id,
        studentName: students.name,
      })
      .from(studentClassGroups)
      .innerJoin(students, eq(students.id, studentClassGroups.studentId))
      .where(
        and(
          eq(studentClassGroups.organizationId, organizationId),
          inArray(studentClassGroups.classGroupId, ids),
          isNull(studentClassGroups.activeUntil),
        ),
      );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      defaultDurationMinutes: row.defaultDurationMinutes,
      status: parseStatus(row.status),
      archivedAt: row.archivedAt?.toISOString() ?? null,
      schedules: schedules
        .filter((schedule) => schedule.classGroupId === row.id)
        .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime))
        .map(toScheduleDto),
      tags: tags.filter((tag) => tag.classGroupId === row.id).map((tag) => tag.label),
      students: links
        .filter((link) => link.classGroupId === row.id)
        .map((link) => ({ id: link.studentId, name: link.studentName })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }
}

function toScheduleDto(row: ScheduleRow): ClassGroup["schedules"][number] {
  return { id: row.id, weekday: row.weekday, startTime: row.startTime };
}

function parseStatus(value: string): "active" | "archived" {
  if (value === "active" || value === "archived") return value;
  throw new BadRequestException("Status de turma inválido.");
}
