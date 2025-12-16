CREATE TABLE "abandoned_cart_emails" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"cart_item_id" varchar,
	"email_type" varchar(50) NOT NULL,
	"template_id" integer NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"opened" boolean DEFAULT false NOT NULL,
	"opened_at" timestamp,
	"clicked" boolean DEFAULT false NOT NULL,
	"clicked_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "abandoned_cart_emails" ADD CONSTRAINT "abandoned_cart_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_cart_emails" ADD CONSTRAINT "abandoned_cart_emails_cart_item_id_cart_items_id_fk" FOREIGN KEY ("cart_item_id") REFERENCES "public"."cart_items"("id") ON DELETE cascade ON UPDATE no action;