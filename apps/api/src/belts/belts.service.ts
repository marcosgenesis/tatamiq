import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { UpdateBeltInput } from "@tatamiq/contracts";
import { belts, type Database } from "@tatamiq/database";
import { and, eq } from "drizzle-orm";
import { DATABASE } from "../database/database.module";

type BeltSeed = {
  name: string;
  slug: string;
  path: "adult" | "child";
  position: number;
  maxDegrees: number;
  minMonthsForNextDegree: number;
  minAttendancesForNextDegree: number;
  minMonthsForNextBelt: number;
  minAttendancesForNextBelt: number;
};

const IBJJF_BELTS: BeltSeed[] = [
  // Adult belts
  {
    name: "Branca",
    slug: "white",
    path: "adult",
    position: 0,
    maxDegrees: 4,
    minMonthsForNextDegree: 6,
    minAttendancesForNextDegree: 30,
    minMonthsForNextBelt: 24,
    minAttendancesForNextBelt: 120,
  },
  {
    name: "Azul",
    slug: "blue",
    path: "adult",
    position: 1,
    maxDegrees: 4,
    minMonthsForNextDegree: 6,
    minAttendancesForNextDegree: 30,
    minMonthsForNextBelt: 24,
    minAttendancesForNextBelt: 120,
  },
  {
    name: "Roxa",
    slug: "purple",
    path: "adult",
    position: 2,
    maxDegrees: 4,
    minMonthsForNextDegree: 6,
    minAttendancesForNextDegree: 30,
    minMonthsForNextBelt: 18,
    minAttendancesForNextBelt: 90,
  },
  {
    name: "Marrom",
    slug: "brown",
    path: "adult",
    position: 3,
    maxDegrees: 4,
    minMonthsForNextDegree: 6,
    minAttendancesForNextDegree: 30,
    minMonthsForNextBelt: 12,
    minAttendancesForNextBelt: 60,
  },
  {
    name: "Preta",
    slug: "black",
    path: "adult",
    position: 4,
    maxDegrees: 6,
    minMonthsForNextDegree: 36,
    minAttendancesForNextDegree: 30,
    minMonthsForNextBelt: 120,
    minAttendancesForNextBelt: 360,
  },
  {
    name: "Coral",
    slug: "coral",
    path: "adult",
    position: 5,
    maxDegrees: 0,
    minMonthsForNextDegree: 0,
    minAttendancesForNextDegree: 0,
    minMonthsForNextBelt: 0,
    minAttendancesForNextBelt: 0,
  },
  {
    name: "Vermelha",
    slug: "red",
    path: "adult",
    position: 6,
    maxDegrees: 0,
    minMonthsForNextDegree: 0,
    minAttendancesForNextDegree: 0,
    minMonthsForNextBelt: 0,
    minAttendancesForNextBelt: 0,
  },
  // Child belts
  {
    name: "Branca",
    slug: "white",
    path: "child",
    position: 0,
    maxDegrees: 4,
    minMonthsForNextDegree: 4,
    minAttendancesForNextDegree: 30,
    minMonthsForNextBelt: 12,
    minAttendancesForNextBelt: 120,
  },
  {
    name: "Cinza",
    slug: "gray",
    path: "child",
    position: 1,
    maxDegrees: 4,
    minMonthsForNextDegree: 4,
    minAttendancesForNextDegree: 30,
    minMonthsForNextBelt: 12,
    minAttendancesForNextBelt: 120,
  },
  {
    name: "Amarela",
    slug: "yellow",
    path: "child",
    position: 2,
    maxDegrees: 4,
    minMonthsForNextDegree: 4,
    minAttendancesForNextDegree: 30,
    minMonthsForNextBelt: 12,
    minAttendancesForNextBelt: 120,
  },
  {
    name: "Laranja",
    slug: "orange",
    path: "child",
    position: 3,
    maxDegrees: 4,
    minMonthsForNextDegree: 4,
    minAttendancesForNextDegree: 30,
    minMonthsForNextBelt: 12,
    minAttendancesForNextBelt: 120,
  },
  {
    name: "Verde",
    slug: "green",
    path: "child",
    position: 4,
    maxDegrees: 4,
    minMonthsForNextDegree: 4,
    minAttendancesForNextDegree: 30,
    minMonthsForNextBelt: 12,
    minAttendancesForNextBelt: 120,
  },
];

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
    const existing = await this.db
      .select()
      .from(belts)
      .where(eq(belts.organizationId, organizationId))
      .limit(1);

    if (existing.length > 0) {
      return this.list(organizationId);
    }

    const values = IBJJF_BELTS.map((seed) => ({
      id: crypto.randomUUID(),
      organizationId,
      name: seed.name,
      slug: `${seed.path}-${seed.slug}`,
      path: seed.path,
      position: seed.position,
      maxDegrees: seed.maxDegrees,
      minMonthsForNextDegree: seed.minMonthsForNextDegree,
      minAttendancesForNextDegree: seed.minAttendancesForNextDegree,
      minMonthsForNextBelt: seed.minMonthsForNextBelt,
      minAttendancesForNextBelt: seed.minAttendancesForNextBelt,
    }));

    await this.db.insert(belts).values(values);

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

function toBeltDto(row: typeof belts.$inferSelect) {
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
