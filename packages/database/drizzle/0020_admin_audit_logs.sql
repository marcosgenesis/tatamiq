CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "admin_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" text,
  "result" text NOT NULL DEFAULT 'success',
  "reason" text,
  "metadata" jsonb,
  "academy_id" text REFERENCES "organization"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_admin_user_id_idx" ON "admin_audit_logs" ("admin_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_action_idx" ON "admin_audit_logs" ("action");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_target_type_idx" ON "admin_audit_logs" ("target_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_academy_id_idx" ON "admin_audit_logs" ("academy_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_at_idx" ON "admin_audit_logs" ("created_at");
