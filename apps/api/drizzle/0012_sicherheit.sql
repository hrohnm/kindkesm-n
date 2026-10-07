ALTER TABLE "benutzer" ADD COLUMN "totp_geheimnis" text;--> statement-breakpoint
ALTER TABLE "benutzer" ADD COLUMN "totp_aktiv" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "benutzer" ADD COLUMN "totp_neu" text;--> statement-breakpoint
ALTER TABLE "benutzer" ADD COLUMN "totp_letzter_schritt" integer;--> statement-breakpoint
ALTER TABLE "benutzer" ADD COLUMN "wiederherstellung" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "benutzer" ADD COLUMN "sperre_minuten" smallint DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "sitzung" ADD COLUMN "letzte_aktivitaet" timestamp with time zone;