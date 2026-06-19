ALTER TABLE "pre_registration_requests"
  ADD COLUMN "cpf" text,
  ADD COLUMN "declared_belt_id" text REFERENCES "belts"("id") ON DELETE SET NULL,
  ADD COLUMN "declared_degree" integer;
