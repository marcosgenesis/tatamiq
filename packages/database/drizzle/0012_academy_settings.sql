ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "instagram" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "pix_key_type" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "pix_key" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "pix_copy_paste" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "child_to_adult_age" integer NOT NULL DEFAULT 16;
