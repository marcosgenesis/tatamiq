ALTER TABLE "payment_receipts" ADD COLUMN "file_key" text;
ALTER TABLE "payment_receipts" ADD COLUMN "note" text;
ALTER TABLE "payment_receipts" ADD COLUMN "replaced_at" timestamp with time zone;

UPDATE "payment_receipts"
SET "file_key" = "file_url"
WHERE "file_key" IS NULL;

ALTER TABLE "payment_receipts" ALTER COLUMN "file_key" SET NOT NULL;
ALTER TABLE "payment_receipts" ALTER COLUMN "file_url" DROP NOT NULL;
