import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgres://tatamiq:tatamiq@localhost:5432/tatamiq');

try {
  const tables = await sql.unsafe("select table_schema, table_name from information_schema.tables where table_schema not in ('pg_catalog','information_schema') order by table_schema, table_name");
  console.log(JSON.stringify(tables, null, 2));
} finally {
  await sql.end();
}
