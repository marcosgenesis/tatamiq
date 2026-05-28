CREATE TABLE IF NOT EXISTS "platform_support_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "admin_user_id" text NOT NULL,
  "target_user_id" text NOT NULL,
  "academy_id" text,
  "reason" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "impersonation_session_id" text,
  "ip_address" text,
  "user_agent" text,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "activated_at" timestamp with time zone,
  "ended_at" timestamp with time zone,
  "expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_support_sessions" ADD CONSTRAINT "platform_support_sessions_admin_user_id_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "platform_support_sessions" ADD CONSTRAINT "platform_support_sessions_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "platform_support_sessions" ADD CONSTRAINT "platform_support_sessions_academy_id_organization_id_fk" FOREIGN KEY ("academy_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "platform_support_sessions_admin_user_id_idx" ON "platform_support_sessions" USING btree ("admin_user_id");
--> statement-breakpoint
CREATE INDEX "platform_support_sessions_target_user_id_idx" ON "platform_support_sessions" USING btree ("target_user_id");
--> statement-breakpoint
CREATE INDEX "platform_support_sessions_status_idx" ON "platform_support_sessions" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "platform_support_sessions_impersonation_session_id_idx" ON "platform_support_sessions" USING btree ("impersonation_session_id");
