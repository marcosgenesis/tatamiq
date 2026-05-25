import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { UpdateBeltInput } from "@tatamiq/contracts";
import { belts, type Database } from "@tatamiq/database";
import { and, eq } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { seedIbjjfBelts } from "./seed-belts";

@Injectable()
export class BeltsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(organizationId: string) {
    const rows = await this.db
      .select()
      .from(belts)
      .where(eq(belts.organizationId, organizationId))
      .orderBy(belts.path, belts.position);

    return {
      belts: rows.map(toBeltDto),
    };
  }

  async seedIbjjfBelts(organizationId: string) {
    await seedIbjjfBelts(this.db, organizationId);
    return this.list(organizationId);
  }

  async findById(organizationId: string, beltId: string) {
    const [row] = await this.db
      .select()
      .from(belts)
      .where(and(eq(belts.id, beltId), eq(belts.organizationId, organizationId)))
      .limit(1);

    return row ? toBeltDto(row) : null;
  }

  async update(organizationId: string, beltId: string, input: UpdateBeltInput) {
    const existing = await this.findById(organizationId, beltId);
    if (!existing) {
      throw new NotFoundException("Faixa não encontrada.");
    }

    const [updated] = await this.db
      .update(belts)
      .set({
        ...(input.minMonthsForNextDegree !== undefined && {
          minMonthsForNextDegree: input.minMonthsForNextDegree,
        }),
        ...(input.minAttendancesForNextDegree !== undefined && {
          minAttendancesForNextDegree: input.minAttendancesForNextDegree,
        }),
        ...(input.minMonthsForNextBelt !== undefined && {
          minMonthsForNextBelt: input.minMonthsForNextBelt,
        }),
        ...(input.minAttendancesForNextBelt !== undefined && {
          minAttendancesForNextBelt: input.minAttendancesForNextBelt,
        }),
        ...(input.maxDegrees !== undefined && { maxDegrees: input.maxDegrees }),
      })
      .where(and(eq(belts.id, beltId), eq(belts.organizationId, organizationId)))
      .returning();

    return toBeltDto(updated);
  }
}

export function toBeltDto(row: typeof belts.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    path: row.path as "adult" | "child",
    position: row.position,
    maxDegrees: row.maxDegrees,
    minMonthsForNextDegree: row.minMonthsForNextDegree,
    minAttendancesForNextDegree: row.minAttendancesForNextDegree,
    minMonthsForNextBelt: row.minMonthsForNextBelt,
    minAttendancesForNextBelt: row.minAttendancesForNextBelt,
  };
}
