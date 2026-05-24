-- 0011_belt_schema.sql
-- Belt schema, IBJJF seed support, and student migration (additive only)

-- 1. Create belts table
CREATE TABLE IF NOT EXISTS "belts" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "path" text NOT NULL,
  "position" integer NOT NULL,
  "max_degrees" integer NOT NULL,
  "min_months_for_next_degree" integer NOT NULL DEFAULT 0,
  "min_attendances_for_next_degree" integer NOT NULL DEFAULT 0,
  "min_months_for_next_belt" integer NOT NULL DEFAULT 0,
  "min_attendances_for_next_belt" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "belts_organization_id_idx" ON "belts" ("organization_id");
CREATE UNIQUE INDEX IF NOT EXISTS "belts_org_slug_uniq" ON "belts" ("organization_id", "slug");

-- 2. Add child_to_adult_age to organization
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "child_to_adult_age" integer NOT NULL DEFAULT 16;

-- 3. Add current_belt_id to students (nullable for now, data migration happens at runtime after seeding)
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "current_belt_id" text REFERENCES "belts"("id") ON DELETE RESTRICT;

-- 4. Add dismissal columns to students
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "dismissed_degree_at" timestamp with time zone;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "dismissed_belt_at" timestamp with time zone;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "dismissed_transition_at" timestamp with time zone;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "dismissed_degree_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "dismissed_belt_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL;
