CREATE TABLE IF NOT EXISTS "monthly_fees" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "student_id" text NOT NULL,
  "reference_year" integer NOT NULL,
  "reference_month" integer NOT NULL,
  "amount_in_cents" integer NOT NULL,
  "original_amount_in_cents" integer,
  "due_date" date NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "monthly_fees_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "monthly_fees_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade,
  CONSTRAINT "monthly_fees_status_check" CHECK ("status" IN ('open', 'under_review', 'paid', 'waived')),
  CONSTRAINT "monthly_fees_reference_month_check" CHECK ("reference_month" >= 1 AND "reference_month" <= 12),
  CONSTRAINT "monthly_fees_amount_check" CHECK ("amount_in_cents" > 0)
);

CREATE TABLE IF NOT EXISTS "monthly_fee_events" (
  "id" text PRIMARY KEY NOT NULL,
  "monthly_fee_id" text NOT NULL,
  "organization_id" text NOT NULL,
  "type" text NOT NULL,
  "reason" text,
  "metadata" jsonb,
  "created_by_user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "monthly_fee_events_monthly_fee_id_fk" FOREIGN KEY ("monthly_fee_id") REFERENCES "monthly_fees"("id") ON DELETE cascade,
  CONSTRAINT "monthly_fee_events_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "monthly_fee_events_created_by_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE cascade,
  CONSTRAINT "monthly_fee_events_type_check" CHECK ("type" IN ('waived', 'adjusted', 'receipt_approved', 'receipt_rejected', 'manual_payment'))
);

CREATE TABLE IF NOT EXISTS "payment_receipts" (
  "id" text PRIMARY KEY NOT NULL,
  "monthly_fee_id" text NOT NULL,
  "organization_id" text NOT NULL,
  "student_id" text NOT NULL,
  "file_url" text NOT NULL,
  "file_type" text NOT NULL,
  "file_size_bytes" integer NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "rejection_reason" text,
  "created_by_user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "payment_receipts_monthly_fee_id_fk" FOREIGN KEY ("monthly_fee_id") REFERENCES "monthly_fees"("id") ON DELETE cascade,
  CONSTRAINT "payment_receipts_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "payment_receipts_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade,
  CONSTRAINT "payment_receipts_created_by_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE cascade,
  CONSTRAINT "payment_receipts_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "monthly_fees_student_month_uniq" ON "monthly_fees" ("student_id", "reference_year", "reference_month");
CREATE INDEX IF NOT EXISTS "monthly_fees_organization_id_idx" ON "monthly_fees" ("organization_id");
CREATE INDEX IF NOT EXISTS "monthly_fees_student_id_idx" ON "monthly_fees" ("student_id");
CREATE INDEX IF NOT EXISTS "monthly_fees_status_idx" ON "monthly_fees" ("status");
CREATE INDEX IF NOT EXISTS "monthly_fees_due_date_idx" ON "monthly_fees" ("due_date");
CREATE INDEX IF NOT EXISTS "monthly_fee_events_monthly_fee_id_idx" ON "monthly_fee_events" ("monthly_fee_id");
CREATE INDEX IF NOT EXISTS "monthly_fee_events_organization_id_idx" ON "monthly_fee_events" ("organization_id");
CREATE INDEX IF NOT EXISTS "payment_receipts_monthly_fee_id_idx" ON "payment_receipts" ("monthly_fee_id");
CREATE INDEX IF NOT EXISTS "payment_receipts_organization_id_idx" ON "payment_receipts" ("organization_id");
CREATE INDEX IF NOT EXISTS "payment_receipts_student_id_idx" ON "payment_receipts" ("student_id");
CREATE INDEX IF NOT EXISTS "payment_receipts_status_idx" ON "payment_receipts" ("status");
