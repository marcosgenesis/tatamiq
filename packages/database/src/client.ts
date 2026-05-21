import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const defaultDatabaseUrl = "postgres://tatamiq:tatamiq@localhost:5432/tatamiq";

export function createDatabase(databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl) {
  const client = postgres(databaseUrl, { max: 10 });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabase>;
