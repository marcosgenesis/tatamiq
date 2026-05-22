CREATE TABLE IF NOT EXISTS "class_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "class_group_id" text NOT NULL,
  "kind" text NOT NULL,
  "scheduled_start_at" timestamp with time zone NOT NULL,
  "actual_start_at" timestamp with time zone,
  "duration_minutes" integer NOT NULL,
  "ended_at" timestamp with time zone,
  "status" text DEFAULT 'scheduled' NOT NULL,
  "cancelled_at" timestamp with time zone,
  "cancelled_by_user_id" text,
  "created_by_user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "class_sessions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "class_sessions_class_group_id_class_groups_id_fk" FOREIGN KEY ("class_group_id") REFERENCES "class_groups"("id") ON DELETE cascade,
  CONSTRAINT "class_sessions_cancelled_by_user_id_user_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "user"("id") ON DELETE set null,
  CONSTRAINT "class_sessions_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE cascade,
  CONSTRAINT "class_sessions_kind_check" CHECK ("kind" IN ('ad_hoc')),
  CONSTRAINT "class_sessions_status_check" CHECK ("status" IN ('scheduled', 'cancelled')),
  CONSTRAINT "class_sessions_duration_check" CHECK ("duration_minutes" >= 15 AND "duration_minutes" <= 300)
);

CREATE TABLE IF NOT EXISTS "class_cancellations" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "class_group_id" text NOT NULL,
  "class_group_schedule_id" text NOT NULL,
  "occurrence_date" date NOT NULL,
  "created_by_user_id" text NOT NULL,
  "cancelled_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reverted_at" timestamp with time zone,
  "reverted_by_user_id" text,
  CONSTRAINT "class_cancellations_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "class_cancellations_class_group_id_class_groups_id_fk" FOREIGN KEY ("class_group_id") REFERENCES "class_groups"("id") ON DELETE cascade,
  CONSTRAINT "class_cancellations_class_group_schedule_id_class_group_schedules_id_fk" FOREIGN KEY ("class_group_schedule_id") REFERENCES "class_group_schedules"("id") ON DELETE cascade,
  CONSTRAINT "class_cancellations_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE cascade,
  CONSTRAINT "class_cancellations_reverted_by_user_id_user_id_fk" FOREIGN KEY ("reverted_by_user_id") REFERENCES "user"("id") ON DELETE set null
);

CREATE INDEX IF NOT EXISTS "class_sessions_organization_id_idx" ON "class_sessions" ("organization_id");
CREATE INDEX IF NOT EXISTS "class_sessions_class_group_id_idx" ON "class_sessions" ("class_group_id");
CREATE INDEX IF NOT EXISTS "class_sessions_scheduled_start_at_idx" ON "class_sessions" ("scheduled_start_at");
CREATE INDEX IF NOT EXISTS "class_cancellations_organization_id_idx" ON "class_cancellations" ("organization_id");
CREATE INDEX IF NOT EXISTS "class_cancellations_class_group_schedule_id_idx" ON "class_cancellations" ("class_group_schedule_id");
CREATE INDEX IF NOT EXISTS "class_cancellations_occurrence_date_idx" ON "class_cancellations" ("occurrence_date");
