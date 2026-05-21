CREATE TABLE "academies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"address" text,
	"phone_whatsapp" text,
	"instagram" text,
	"pix_key" text,
	"pix_copy_paste" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
