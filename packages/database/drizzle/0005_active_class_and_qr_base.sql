ALTER TABLE "class_sessions" DROP CONSTRAINT IF EXISTS "class_sessions_kind_check";
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_kind_check" CHECK ("kind" IN ('ad_hoc', 'recurring'));

ALTER TABLE "class_sessions" DROP CONSTRAINT IF EXISTS "class_sessions_status_check";
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_status_check" CHECK ("status" IN ('scheduled', 'active', 'ended', 'cancelled'));

CREATE INDEX IF NOT EXISTS "class_sessions_status_idx" ON "class_sessions" ("status");
