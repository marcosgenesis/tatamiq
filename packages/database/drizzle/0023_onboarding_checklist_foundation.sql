ALTER TABLE "organization"
ADD COLUMN IF NOT EXISTS "onboarding_checklist_dismissed_at" timestamp with time zone;

ALTER TABLE "academy_pre_registration_links"
ADD COLUMN IF NOT EXISTS "copied_at" timestamp with time zone;
