-- 0013_promotions_and_portal.sql
-- Promotions table, student contact changes, student access indicators, dismissal column update

-- 1. Create promotions table
CREATE TABLE IF NOT EXISTS "promotions" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "student_id" text NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "previous_belt_id" text REFERENCES "belts"("id") ON DELETE SET NULL,
  "previous_degree" integer NOT NULL,
  "new_belt_id" text NOT NULL REFERENCES "belts"("id") ON DELETE RESTRICT,
  "new_degree" integer NOT NULL,
  "promoted_at" date NOT NULL,
  "promoted_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "note" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "promotions_organization_id_idx" ON "promotions" ("organization_id");
CREATE INDEX IF NOT EXISTS "promotions_student_id_idx" ON "promotions" ("student_id");

-- 2. Create student contact changes table
CREATE TABLE IF NOT EXISTS "student_contact_changes" (
  "id" text PRIMARY KEY NOT NULL,
  "student_id" text NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "field" text NOT NULL,
  "previous_value" text,
  "new_value" text,
  "changed_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "student_contact_changes_student_id_idx" ON "student_contact_changes" ("student_id");

-- 3. Add lastSeen columns to student_access for indicators
ALTER TABLE "student_access" ADD COLUMN IF NOT EXISTS "last_seen_fees_at" timestamp with time zone;
ALTER TABLE "student_access" ADD COLUMN IF NOT EXISTS "last_seen_notes_at" timestamp with time zone;
ALTER TABLE "student_access" ADD COLUMN IF NOT EXISTS "last_seen_graduation_at" timestamp with time zone;
ALTER TABLE "student_access" ADD COLUMN IF NOT EXISTS "last_seen_schedule_at" timestamp with time zone;

-- 4. Update dismissal columns: rename to "until" semantics and add reason columns
ALTER TABLE "students" DROP COLUMN IF EXISTS "dismissed_degree_at";
ALTER TABLE "students" DROP COLUMN IF EXISTS "dismissed_belt_at";
ALTER TABLE "students" DROP COLUMN IF EXISTS "dismissed_transition_at";
ALTER TABLE "students" DROP COLUMN IF EXISTS "dismissed_degree_by_user_id";
ALTER TABLE "students" DROP COLUMN IF EXISTS "dismissed_belt_by_user_id";

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "degree_eligibility_dismissed_until" timestamp with time zone;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "degree_eligibility_dismissal_reason" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "belt_eligibility_dismissed_until" timestamp with time zone;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "belt_eligibility_dismissal_reason" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "transition_dismissed_until" timestamp with time zone;
