ALTER TABLE "besuch" ADD COLUMN "anordnung_vorhanden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "besuch" ADD COLUMN "anordnung_notiz" text;