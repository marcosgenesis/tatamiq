ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "daily_amount_in_cents" integer;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "billing_method" text NOT NULL DEFAULT 'monthly';
ALTER TABLE "students" ADD CONSTRAINT "students_billing_method_check" CHECK ("billing_method" IN ('monthly', 'daily'));

CREATE TABLE IF NOT EXISTS "daily_fees" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "student_id" text NOT NULL REFERENCES "students"("id") ON DELETE cascade,
  "attendance_date" date NOT NULL,
  "amount_in_cents" integer NOT NULL CHECK ("amount_in_cents" > 0),
  "status" text NOT NULL DEFAULT 'open' CHECK ("status" IN ('open', 'under_review', 'paid', 'waived')),
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "daily_fees_student_day_uniq" UNIQUE ("student_id", "attendance_date")
);

CREATE INDEX IF NOT EXISTS "daily_fees_organization_id_idx" ON "daily_fees" ("organization_id");
CREATE INDEX IF NOT EXISTS "daily_fees_student_id_idx" ON "daily_fees" ("student_id");
CREATE INDEX IF NOT EXISTS "daily_fees_status_idx" ON "daily_fees" ("status");

CREATE TABLE IF NOT EXISTS "student_billing_periods" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "student_id" text NOT NULL REFERENCES "students"("id") ON DELETE cascade,
  "method" text NOT NULL CHECK ("method" IN ('monthly', 'daily')),
  "starts_on" date NOT NULL,
  "ends_on" date,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "student_billing_periods_student_id_idx" ON "student_billing_periods" ("student_id");
CREATE UNIQUE INDEX IF NOT EXISTS "student_billing_periods_one_open_uniq" ON "student_billing_periods" ("student_id") WHERE "ends_on" IS NULL;
INSERT INTO "student_billing_periods" ("id", "organization_id", "student_id", "method", "starts_on")
SELECT 'billing-' || "id", "organization_id", "id", "billing_method", "enrollment_date"
FROM "students"
ON CONFLICT DO NOTHING;
