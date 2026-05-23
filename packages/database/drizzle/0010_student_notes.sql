CREATE TABLE IF NOT EXISTS "student_notes" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "student_id" text NOT NULL,
  "content" text NOT NULL,
  "is_visible" boolean DEFAULT true NOT NULL,
  "archived_at" timestamp with time zone,
  "created_by_user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "student_notes_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "student_notes_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade,
  CONSTRAINT "student_notes_created_by_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "student_notes_organization_id_idx" ON "student_notes" ("organization_id");
CREATE INDEX IF NOT EXISTS "student_notes_student_id_idx" ON "student_notes" ("student_id");
