CREATE TABLE IF NOT EXISTS "class_groups" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "default_duration_minutes" integer NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "class_groups_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "class_groups_status_check" CHECK ("status" IN ('active', 'archived')),
  CONSTRAINT "class_groups_duration_check" CHECK ("default_duration_minutes" >= 15 AND "default_duration_minutes" <= 300)
);

CREATE TABLE IF NOT EXISTS "class_group_schedules" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "class_group_id" text NOT NULL,
  "weekday" integer NOT NULL,
  "start_time" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "class_group_schedules_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "class_group_schedules_class_group_id_class_groups_id_fk" FOREIGN KEY ("class_group_id") REFERENCES "class_groups"("id") ON DELETE cascade,
  CONSTRAINT "class_group_schedules_weekday_check" CHECK ("weekday" >= 0 AND "weekday" <= 6),
  CONSTRAINT "class_group_schedules_start_time_check" CHECK ("start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

CREATE TABLE IF NOT EXISTS "class_group_tags" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "class_group_id" text NOT NULL,
  "label" text NOT NULL,
  CONSTRAINT "class_group_tags_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "class_group_tags_class_group_id_class_groups_id_fk" FOREIGN KEY ("class_group_id") REFERENCES "class_groups"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "student_class_groups" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "student_id" text NOT NULL,
  "class_group_id" text NOT NULL,
  "active_from" date NOT NULL,
  "active_until" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "student_class_groups_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "student_class_groups_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade,
  CONSTRAINT "student_class_groups_class_group_id_class_groups_id_fk" FOREIGN KEY ("class_group_id") REFERENCES "class_groups"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "class_groups_organization_id_idx" ON "class_groups" ("organization_id");
CREATE INDEX IF NOT EXISTS "class_groups_status_idx" ON "class_groups" ("status");
CREATE INDEX IF NOT EXISTS "class_group_schedules_organization_id_idx" ON "class_group_schedules" ("organization_id");
CREATE INDEX IF NOT EXISTS "class_group_schedules_class_group_id_idx" ON "class_group_schedules" ("class_group_id");
CREATE INDEX IF NOT EXISTS "class_group_tags_organization_id_idx" ON "class_group_tags" ("organization_id");
CREATE INDEX IF NOT EXISTS "class_group_tags_class_group_id_idx" ON "class_group_tags" ("class_group_id");
CREATE INDEX IF NOT EXISTS "student_class_groups_organization_id_idx" ON "student_class_groups" ("organization_id");
CREATE INDEX IF NOT EXISTS "student_class_groups_student_id_idx" ON "student_class_groups" ("student_id");
CREATE INDEX IF NOT EXISTS "student_class_groups_class_group_id_idx" ON "student_class_groups" ("class_group_id");
