CREATE TABLE IF NOT EXISTS "totem_pairing_codes" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "code_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_by_user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "totem_pairing_codes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "totem_pairing_codes_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS "totem_pairing_codes_organization_id_idx" ON "totem_pairing_codes" ("organization_id");
CREATE INDEX IF NOT EXISTS "totem_pairing_codes_expires_at_idx" ON "totem_pairing_codes" ("expires_at");

CREATE TABLE IF NOT EXISTS "totem_devices" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "paired_by_user_id" text,
  "revoked_at" timestamp with time zone,
  "last_seen_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "totem_devices_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "totem_devices_paired_by_user_id_user_id_fk" FOREIGN KEY ("paired_by_user_id") REFERENCES "user"("id") ON DELETE set null
);
CREATE INDEX IF NOT EXISTS "totem_devices_organization_id_idx" ON "totem_devices" ("organization_id");
CREATE INDEX IF NOT EXISTS "totem_devices_revoked_at_idx" ON "totem_devices" ("revoked_at");
