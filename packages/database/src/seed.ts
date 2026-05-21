import { eq } from "drizzle-orm";
import { createDatabase } from "./client";
import { academies } from "./schema";

const db = createDatabase();

const existing = await db
  .select({ id: academies.id })
  .from(academies)
  .where(eq(academies.name, "Academia Demo"))
  .limit(1);

if (existing.length === 0) {
  await db.insert(academies).values({
    name: "Academia Demo",
    phoneWhatsapp: "+55 11 99999-9999",
    instagram: "@tatamiq.demo",
  });

  console.log("Seeded Academia Demo");
} else {
  console.log("Academia Demo already exists");
}

process.exit(0);
