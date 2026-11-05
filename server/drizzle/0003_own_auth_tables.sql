-- Scritta a mano: passaggio da Better Auth ad autenticazione nostra (docs/auth/SPEC.md).
-- I dati di sviluppo si scartano: gli hash di Better Auth non sono compatibili e non ci sono utenti reali.
-- La cascata svuota anche sessions, accounts, categories, transactions e budgets
DELETE FROM "users";--> statement-breakpoint
DROP TABLE "accounts";--> statement-breakpoint
DROP TABLE "verifications";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_token_unique";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "token";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "ip_address";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "user_agent";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email_verified";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "image";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_password_required" CHECK ("users"."is_demo" OR "users"."password_hash" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_name_length" CHECK ("users"."name" IS NULL OR char_length("users"."name") BETWEEN 1 AND 50);
