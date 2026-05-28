ALTER TABLE "user"
  ADD COLUMN "role" text,
  ADD COLUMN "banned" boolean NOT NULL DEFAULT false,
  ADD COLUMN "ban_reason" text,
  ADD COLUMN "ban_expires" timestamp with time zone;

ALTER TABLE "session"
  ADD COLUMN "impersonated_by" text;
