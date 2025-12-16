CREATE TYPE "public"."affiliate_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "affiliates" ALTER COLUMN "commission_rate" SET DEFAULT '10.00';--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "status" "affiliate_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "approved_by" varchar;--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "rejection_reason" varchar(500);--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "website_url" varchar(500);--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "social_media" varchar(500);--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "promotion_method" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "affiliate_commission_rate" numeric(5, 2) DEFAULT '10.00';--> statement-breakpoint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;