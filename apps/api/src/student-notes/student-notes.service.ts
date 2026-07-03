import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateStudentNoteInput,
  ListStudentNotesResponse,
  StudentNoteDto,
  UpdateStudentNoteInput,
} from "@tatamiq/contracts";
import { type Database, studentNotes } from "@tatamiq/database";
import { and, desc, eq, isNull } from "drizzle-orm";
import { AcademiaScope } from "../academy-scope/academia-scope.service";
import { DATABASE } from "../database/database.module";

type NoteRow = typeof studentNotes.$inferSelect;

@Injectable()
export class StudentNotesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(AcademiaScope) private readonly academiaScope: AcademiaScope,
  ) {}

  async create(
    organizationId: string,
    studentId: string,
    createdByUserId: string,
    input: CreateStudentNoteInput,
  ): Promise<StudentNoteDto> {
    // Without this the path studentId is trusted blindly, letting an instructor
    // attach notes to another academy's student (cross-tenant IDOR write).
    await this.academiaScope.assertStudentBelongsToAcademia(organizationId, studentId);

    const id = crypto.randomUUID();
    const now = new Date();

    await this.db.insert(studentNotes).values({
      id,
      organizationId,
      studentId,
      content: input.content,
      isVisible: input.isVisible,
      createdByUserId,
      createdAt: now,
      updatedAt: now,
    });

    return this.getOrThrow(organizationId, id);
  }

  async update(
    organizationId: string,
    noteId: string,
    input: UpdateStudentNoteInput,
  ): Promise<StudentNoteDto> {
    const existing = await this.db
      .select()
      .from(studentNotes)
      .where(and(eq(studentNotes.id, noteId), eq(studentNotes.organizationId, organizationId)))
      .then((rows) => rows[0]);

    if (!existing) throw new NotFoundException("Anotação não encontrada.");

    const updates: Partial<NoteRow> = { updatedAt: new Date() };
    if (input.content !== undefined) updates.content = input.content;
    if (input.isVisible !== undefined) updates.isVisible = input.isVisible;

    await this.db
      .update(studentNotes)
      .set(updates)
      .where(and(eq(studentNotes.id, noteId), eq(studentNotes.organizationId, organizationId)));

    return this.getOrThrow(organizationId, noteId);
  }

  async archive(organizationId: string, noteId: string): Promise<StudentNoteDto> {
    const existing = await this.db
      .select()
      .from(studentNotes)
      .where(and(eq(studentNotes.id, noteId), eq(studentNotes.organizationId, organizationId)))
      .then((rows) => rows[0]);

    if (!existing) throw new NotFoundException("Anotação não encontrada.");

    await this.db
      .update(studentNotes)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(studentNotes.id, noteId), eq(studentNotes.organizationId, organizationId)));

    return this.getOrThrow(organizationId, noteId);
  }

  async listAll(organizationId: string, studentId: string): Promise<ListStudentNotesResponse> {
    await this.academiaScope.assertStudentBelongsToAcademia(organizationId, studentId);

    const rows = await this.db
      .select()
      .from(studentNotes)
      .where(
        and(eq(studentNotes.organizationId, organizationId), eq(studentNotes.studentId, studentId)),
      )
      .orderBy(desc(studentNotes.createdAt));

    return { notes: rows.map(toNoteDto) };
  }

  async listVisibleNotes(studentId: string): Promise<ListStudentNotesResponse> {
    const rows = await this.db
      .select()
      .from(studentNotes)
      .where(
        and(
          eq(studentNotes.studentId, studentId),
          eq(studentNotes.isVisible, true),
          isNull(studentNotes.archivedAt),
        ),
      )
      .orderBy(desc(studentNotes.createdAt));

    return { notes: rows.map(toNoteDto) };
  }

  private async getOrThrow(organizationId: string, noteId: string): Promise<StudentNoteDto> {
    const row = await this.db
      .select()
      .from(studentNotes)
      .where(and(eq(studentNotes.id, noteId), eq(studentNotes.organizationId, organizationId)))
      .then((rows) => rows[0]);

    if (!row) throw new NotFoundException("Anotação não encontrada.");
    return toNoteDto(row);
  }
}

function toNoteDto(row: NoteRow): StudentNoteDto {
  return {
    id: row.id,
    studentId: row.studentId,
    content: row.content,
    isVisible: row.isVisible,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
