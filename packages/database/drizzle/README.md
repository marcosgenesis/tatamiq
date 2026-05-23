# Database migrations

This project currently keeps Drizzle migrations as explicit SQL files. When a migration file is added manually, `meta/_journal.json` must also receive the matching entry; otherwise `drizzle-kit migrate` will skip the SQL file.

Before merging a migration change, run:

```bash
pnpm --filter @tatamiq/database db:migrate
```

The E2E setup depends on this journal being complete so local databases receive all migrations before seeds run.
