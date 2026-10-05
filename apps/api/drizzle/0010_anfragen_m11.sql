CREATE TABLE "abwesenheit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"benutzer_id" uuid NOT NULL,
	"von" date NOT NULL,
	"bis" date NOT NULL,
	"art" text NOT NULL,
	"notiz" text,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anfrage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quelle" text NOT NULL,
	"status" text DEFAULT 'neu' NOT NULL,
	"vorname" text NOT NULL,
	"nachname" text NOT NULL,
	"email" text,
	"telefon" text,
	"et" date NOT NULL,
	"strasse" text,
	"plz" text,
	"ort" text NOT NULL,
	"lat" double precision,
	"lon" double precision,
	"erstes_kind" boolean,
	"leistungen" text[] DEFAULT '{}'::text[] NOT NULL,
	"nachricht" text,
	"einwilligung_am" timestamp with time zone,
	"notiz" text,
	"hebamme_id" uuid,
	"klientin_id" uuid,
	"erfasst_von" uuid,
	"bearbeitet_am" timestamp with time zone,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "benutzer" ADD COLUMN "wochenbetten_pro_monat" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "abwesenheit" ADD CONSTRAINT "abwesenheit_benutzer_id_benutzer_id_fk" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anfrage" ADD CONSTRAINT "anfrage_hebamme_id_benutzer_id_fk" FOREIGN KEY ("hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anfrage" ADD CONSTRAINT "anfrage_klientin_id_klientin_id_fk" FOREIGN KEY ("klientin_id") REFERENCES "public"."klientin"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anfrage" ADD CONSTRAINT "anfrage_erfasst_von_benutzer_id_fk" FOREIGN KEY ("erfasst_von") REFERENCES "public"."benutzer"("id") ON DELETE set null ON UPDATE no action;