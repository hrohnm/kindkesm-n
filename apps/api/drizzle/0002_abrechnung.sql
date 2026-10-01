CREATE TABLE "versand" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nummer" text NOT NULL,
	"hebamme_id" uuid NOT NULL,
	"status" text DEFAULT 'vorbereitet' NOT NULL,
	"bis" date NOT NULL,
	"weg" text NOT NULL,
	"empfaenger_name" text,
	"empfaenger_anschrift" text,
	"anzahl_faelle" smallint NOT NULL,
	"anzahl_leistungen" smallint NOT NULL,
	"summe" numeric(10, 2) NOT NULL,
	"versendet_am" date,
	"einschreiben_nr" text,
	"bezahlt_am" date,
	"ausgezahlt" numeric(10, 2),
	"notiz" text,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leistung" ADD COLUMN "versand_id" uuid;--> statement-breakpoint
ALTER TABLE "leistung" ADD COLUMN "kuerzung_betrag" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "leistung" ADD COLUMN "kuerzung_grund" text;--> statement-breakpoint
ALTER TABLE "versand" ADD CONSTRAINT "versand_hebamme_id_benutzer_id_fk" FOREIGN KEY ("hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leistung" ADD CONSTRAINT "leistung_versand_id_versand_id_fk" FOREIGN KEY ("versand_id") REFERENCES "public"."versand"("id") ON DELETE set null ON UPDATE no action;