ALTER TABLE "pre_registration_requests"
  ADD COLUMN "first_access_token_hash" text,
  ADD COLUMN "first_access_token_expires_at" timestamp with time zone,
  ADD COLUMN "first_access_consumed_at" timestamp with time zone;

CREATE UNIQUE INDEX IF NOT EXISTS "pre_registration_requests_first_access_token_hash_uniq"
  ON "pre_registration_requests" ("first_access_token_hash")
  WHERE "first_access_token_hash" IS NOT NULL;
