import { assertE2eDatabaseIsLocal, runDatabaseScript } from "./support/database";

export default async function globalSetup() {
  assertE2eDatabaseIsLocal();
  runDatabaseScript("db:migrate");
  runDatabaseScript("db:seed");
  runDatabaseScript("db:seed:e2e");
}
