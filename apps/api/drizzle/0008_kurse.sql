CREATE TABLE "kurs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titel" text NOT NULL,
	"art" text NOT NULL,
	"einzel" boolean DEFAULT false NOT NULL,
	"abrechnung" text NOT NULL,
	"ort" text DEFAULT 'Praxis' NOT NULL,
	"max_teilnehmer" smallint DEFAULT 10 NOT NULL,
	"preis" numeric(10, 2),
	"partner_preis" numeric(10, 2),
	"beschreibung" text,
	"leitung" uuid[] NOT NULL,
	"anmeldung_offen" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'geplant' NOT NULL,
	"erstellt_von" uuid,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kurs_anwesenheit" (
	"termin_id" uuid NOT NULL,
	"teilnahme_id" uuid NOT NULL,
	"anwesend" boolean NOT NULL,
	"unterschrift" jsonb DEFAULT '{"art":"keine"}'::jsonb NOT NULL,
	"besuch_id" uuid,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kurs_anwesenheit_termin_id_teilnahme_id_pk" PRIMARY KEY("termin_id","teilnahme_id")
);
--> statement-breakpoint
CREATE TABLE "kurs_teilnahme" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurs_id" uuid NOT NULL,
	"klientin_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"telefon" text,
	"stichtag" date,
	"krankenkasse" text,
	"partner" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'bestaetigt' NOT NULL,
	"quelle" text DEFAULT 'praxis' NOT NULL,
	"bezahlt" boolean DEFAULT false NOT NULL,
	"nachricht" text,
	"notiz" text,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kurstermin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurs_id" uuid NOT NULL,
	"datum" date NOT NULL,
	"von" text NOT NULL,
	"bis" text NOT NULL,
	"format" smallint DEFAULT 2 NOT NULL,
	"hebamme_id" uuid NOT NULL,
	"thema" text,
	"abgeschlossen" boolean DEFAULT false NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kurs" ADD CONSTRAINT "kurs_erstellt_von_benutzer_id_fk" FOREIGN KEY ("erstellt_von") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kurs_anwesenheit" ADD CONSTRAINT "kurs_anwesenheit_termin_id_kurstermin_id_fk" FOREIGN KEY ("termin_id") REFERENCES "public"."kurstermin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kurs_anwesenheit" ADD CONSTRAINT "kurs_anwesenheit_teilnahme_id_kurs_teilnahme_id_fk" FOREIGN KEY ("teilnahme_id") REFERENCES "public"."kurs_teilnahme"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kurs_anwesenheit" ADD CONSTRAINT "kurs_anwesenheit_besuch_id_besuch_id_fk" FOREIGN KEY ("besuch_id") REFERENCES "public"."besuch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kurs_teilnahme" ADD CONSTRAINT "kurs_teilnahme_kurs_id_kurs_id_fk" FOREIGN KEY ("kurs_id") REFERENCES "public"."kurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kurs_teilnahme" ADD CONSTRAINT "kurs_teilnahme_klientin_id_klientin_id_fk" FOREIGN KEY ("klientin_id") REFERENCES "public"."klientin"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kurstermin" ADD CONSTRAINT "kurstermin_kurs_id_kurs_id_fk" FOREIGN KEY ("kurs_id") REFERENCES "public"."kurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kurstermin" ADD CONSTRAINT "kurstermin_hebamme_id_benutzer_id_fk" FOREIGN KEY ("hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;