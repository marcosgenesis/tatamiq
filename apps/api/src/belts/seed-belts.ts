import { belts, type Database } from "@tatamiq/database";
import { eq } from "drizzle-orm";

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
    // dans 1-9 cobrem coral e vermelha, entao essas faixas nao existem mais
    maxDegrees: 9,
    minMonthsForNextDegree: 36,
    minAttendancesForNextDegree: 30,
    minMonthsForNextBelt: 120,
    minAttendancesForNextBelt: 360,
  },
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

export async function seedIbjjfBelts(db: Database, organizationId: string) {
  const existing = await db
    .select({ id: belts.id })
    .from(belts)
    .where(eq(belts.organizationId, organizationId))
    .limit(1);

  if (existing.length > 0) return;

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

  await db.insert(belts).values(values);
}
