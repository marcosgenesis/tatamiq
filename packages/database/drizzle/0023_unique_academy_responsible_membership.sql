DELETE FROM "member"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "organization_id", "user_id", "role"
        ORDER BY "created_at", "id"
      ) AS "duplicate_rank"
    FROM "member"
  ) AS "ranked_members"
  WHERE "duplicate_rank" > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "member_org_user_role_uniq" ON "member" ("organization_id", "user_id", "role");
