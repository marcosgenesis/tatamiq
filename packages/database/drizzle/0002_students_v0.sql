CREATE TABLE IF NOT EXISTS "students" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "birth_date" date NOT NULL,
  "enrollment_date" date NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "inactive_at" timestamp with time zone,
  "phone" text,
  "email" text,
  "monthly_amount_in_cents" integer,
  "monthly_due_day" integer,
  "current_belt" text NOT NULL,
  "current_degree" integer DEFAULT 0 NOT NULL,
  "graduation_path" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "students_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "students_status_check" CHECK ("status" IN ('active', 'inactive')),
  CONSTRAINT "students_monthly_due_day_check" CHECK ("monthly_due_day" IS NULL OR ("monthly_due_day" >= 1 AND "monthly_due_day" <= 31)),
  CONSTRAINT "students_current_degree_check" CHECK ("current_degree" >= 0 AND "current_degree" <= 4),
  CONSTRAINT "students_graduation_path_check" CHECK ("graduation_path" IN ('adult', 'child')),
  CONSTRAINT "students_monthly_amount_check" CHECK ("monthly_amount_in_cents" IS NULL OR "monthly_amount_in_cents" >= 0)
);

CREATE TABLE IF NOT EXISTS "student_guardians" (
  "id" text PRIMARY KEY NOT NULL,
  "student_id" text NOT NULL,
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "email" text,
  "relationship" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "student_guardians_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "students_organization_id_idx" ON "students" ("organization_id");
CREATE INDEX IF NOT EXISTS "students_status_idx" ON "students" ("status");
CREATE INDEX IF NOT EXISTS "student_guardians_student_id_idx" ON "student_guardians" ("student_id");
