CREATE TABLE IF NOT EXISTS "academy_pre_registration_links" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "token" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "regenerated_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "academy_pre_registration_links_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "academy_pre_registration_links_status_check" CHECK ("status" IN ('active', 'paused')),
  CONSTRAINT "academy_pre_registration_links_token_unique" UNIQUE("token")
);

CREATE TABLE IF NOT EXISTS "pre_registration_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "link_id" text NOT NULL,
  "status" text DEFAULT 'pending_review' NOT NULL,
  "name" text NOT NULL,
  "birth_date" date NOT NULL,
  "phone" text NOT NULL,
  "email" text NOT NULL,
  "guardian_name" text,
  "guardian_phone" text,
  "note" text,
  "consent_accepted_at" timestamp with time zone NOT NULL,
  "reviewed_by_user_id" text,
  "reviewed_at" timestamp with time zone,
  "rejection_reason" text,
  "approved_student_id" text,
  "approved_student_access_id" text,
  "duplicate_student_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pre_registration_requests_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "pre_registration_requests_link_id_fk" FOREIGN KEY ("link_id") REFERENCES "academy_pre_registration_links"("id") ON DELETE cascade,
  CONSTRAINT "pre_registration_requests_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "user"("id") ON DELETE set null,
  CONSTRAINT "pre_registration_requests_approved_student_id_fk" FOREIGN KEY ("approved_student_id") REFERENCES "students"("id") ON DELETE set null,
  CONSTRAINT "pre_registration_requests_approved_student_access_id_fk" FOREIGN KEY ("approved_student_access_id") REFERENCES "student_access"("id") ON DELETE set null,
  CONSTRAINT "pre_registration_requests_duplicate_student_id_fk" FOREIGN KEY ("duplicate_student_id") REFERENCES "students"("id") ON DELETE set null,
  CONSTRAINT "pre_registration_requests_status_check" CHECK ("status" IN ('pending_review', 'approved', 'rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "academy_pre_registration_links_org_uniq" ON "academy_pre_registration_links" ("organization_id");
CREATE INDEX IF NOT EXISTS "academy_pre_registration_links_token_idx" ON "academy_pre_registration_links" ("token");
CREATE INDEX IF NOT EXISTS "pre_registration_requests_organization_id_idx" ON "pre_registration_requests" ("organization_id");
CREATE INDEX IF NOT EXISTS "pre_registration_requests_link_id_idx" ON "pre_registration_requests" ("link_id");
CREATE INDEX IF NOT EXISTS "pre_registration_requests_email_idx" ON "pre_registration_requests" ("email");
CREATE INDEX IF NOT EXISTS "pre_registration_requests_status_idx" ON "pre_registration_requests" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "pre_registration_requests_one_open_email_per_org" ON "pre_registration_requests" ("organization_id", lower("email")) WHERE "status" IN ('pending_review', 'approved');
