CREATE TABLE IF NOT EXISTS "attendances" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "class_session_id" text NOT NULL REFERENCES "class_sessions"("id") ON DELETE CASCADE,
  "student_id" text NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "source" text NOT NULL,
  "invalidated_at" timestamp with time zone,
  "invalidated_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "invalidation_reason" text,
  "created_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "attendances_organization_id_idx" ON "attendances" ("organization_id");
CREATE INDEX IF NOT EXISTS "attendances_class_session_id_idx" ON "attendances" ("class_session_id");
CREATE INDEX IF NOT EXISTS "attendances_student_id_idx" ON "attendances" ("student_id");

CREATE UNIQUE INDEX IF NOT EXISTS "attendances_one_valid_per_student_session"
  ON "attendances" ("class_session_id", "student_id")
  WHERE "invalidated_at" IS NULL;
