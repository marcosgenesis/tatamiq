CREATE TABLE IF NOT EXISTS "student_access_invites" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "student_id" text NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'pending',
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accepted_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "student_access_invites_organization_id_idx" ON "student_access_invites" ("organization_id");
CREATE INDEX IF NOT EXISTS "student_access_invites_student_id_idx" ON "student_access_invites" ("student_id");
CREATE UNIQUE INDEX IF NOT EXISTS "student_access_invites_one_pending_per_student"
  ON "student_access_invites" ("student_id")
  WHERE "status" = 'pending';

CREATE TABLE IF NOT EXISTS "student_access" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "student_id" text NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "auth_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'active',
  "revoked_at" timestamp with time zone,
  "revoked_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "student_access_organization_id_idx" ON "student_access" ("organization_id");
CREATE INDEX IF NOT EXISTS "student_access_student_id_idx" ON "student_access" ("student_id");
CREATE INDEX IF NOT EXISTS "student_access_auth_user_id_idx" ON "student_access" ("auth_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "student_access_one_active_per_student"
  ON "student_access" ("student_id")
  WHERE "status" = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS "student_access_one_active_per_user"
  ON "student_access" ("auth_user_id")
  WHERE "status" = 'active';

CREATE TABLE IF NOT EXISTS "student_acceptances" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "student_access_id" text NOT NULL REFERENCES "student_access"("id") ON DELETE CASCADE,
  "student_id" text NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "auth_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "terms_version" text NOT NULL,
  "accepted_at" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "student_acceptances_organization_id_idx" ON "student_acceptances" ("organization_id");
CREATE INDEX IF NOT EXISTS "student_acceptances_student_access_id_idx" ON "student_acceptances" ("student_access_id");
CREATE INDEX IF NOT EXISTS "student_acceptances_student_id_idx" ON "student_acceptances" ("student_id");
