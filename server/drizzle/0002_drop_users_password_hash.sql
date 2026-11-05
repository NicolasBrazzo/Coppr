ALTER TABLE "users" DROP CONSTRAINT "users_password_required";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_hash";