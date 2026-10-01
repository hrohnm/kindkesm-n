CREATE TABLE "abrechnungseinstellung" (
	"benutzer_id" uuid PRIMARY KEY NOT NULL,
	"weg" text DEFAULT 'hebset' NOT NULL,
	"abrechnungsstelle_name" text,
	"abrechnungsstelle_anschrift" text,
	"belegart" text DEFAULT 'eigendruck_amtliches_formular' NOT NULL,
	"unterschrift" text DEFAULT 'papier' NOT NULL,
	"versand_rhythmus" text DEFAULT 'monatlich' NOT NULL,
	"versand_tag" smallint DEFAULT 1 NOT NULL,
	"erinnerung_vorlauf_tage" smallint DEFAULT 2 NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benutzer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"passwort_hash" text NOT NULL,
	"rolle" text DEFAULT 'hebamme' NOT NULL,
	"name" text NOT NULL,
	"kuerzel" text NOT NULL,
	"telefon" text,
	"ik" text,
	"status" text DEFAULT 'aktiv' NOT NULL,
	"babypause_bis" date,
	"aktiv" boolean DEFAULT true NOT NULL,
	"letzte_anmeldung" timestamp with time zone,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gebuehrenposition" (
	"regelwerk_id" text NOT NULL,
	"gpos" text NOT NULL,
	"gruppe" text NOT NULL,
	"bezeichnung" text NOT NULL,
	"kurztext" text NOT NULL,
	"kategorie" smallint NOT NULL,
	"leistungsart" text NOT NULL,
	"zuschlag" boolean NOT NULL,
	"betrag" numeric(10, 2),
	"einheit" text NOT NULL,
	"formular" text,
	"quittierungspflichtig" boolean NOT NULL,
	"hinweis" text,
	"befristet_von" date,
	"befristet_bis" date,
	CONSTRAINT "gebuehrenposition_regelwerk_id_gpos_pk" PRIMARY KEY("regelwerk_id","gpos")
);
--> statement-breakpoint
CREATE TABLE "ort" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"benutzer_id" uuid,
	"bezeichnung" text NOT NULL,
	"typ" text NOT NULL,
	"anschrift" text NOT NULL,
	"abholzeit" text,
	"lat" numeric(9, 6),
	"lon" numeric(9, 6),
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "praxis" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"anschrift" text NOT NULL,
	"telefon" text,
	"email" text,
	"aktives_regelwerk_id" text,
	"einstellungen" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protokoll" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"benutzer_id" uuid,
	"aktion" text NOT NULL,
	"objekt" text NOT NULL,
	"objekt_id" text,
	"details" jsonb,
	"zeit" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regelwerk" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"gueltig_von" date NOT NULL,
	"gueltig_bis" date,
	"status" text DEFAULT 'entwurf' NOT NULL,
	"daten" jsonb NOT NULL,
	"importiert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selbstzahler_leistung" (
	"id" text PRIMARY KEY NOT NULL,
	"bezeichnung" text NOT NULL,
	"rechnungstext" text NOT NULL,
	"einheit" text NOT NULL,
	"preis" numeric(10, 2) NOT NULL,
	"umsatzsteuer" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"aktiv" boolean DEFAULT true NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sitzung" (
	"id" text PRIMARY KEY NOT NULL,
	"benutzer_id" uuid NOT NULL,
	"laeuft_ab_am" timestamp with time zone NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "tourvorlage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"benutzer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"wochentage" integer[] NOT NULL,
	"start_ort_id" uuid NOT NULL,
	"ende_ort_id" uuid NOT NULL,
	"ende_spaetestens" text,
	"wegegeld_ausgangs_ort_id" uuid NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abrechnungseinstellung" ADD CONSTRAINT "abrechnungseinstellung_benutzer_id_benutzer_id_fk" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gebuehrenposition" ADD CONSTRAINT "gebuehrenposition_regelwerk_id_regelwerk_id_fk" FOREIGN KEY ("regelwerk_id") REFERENCES "public"."regelwerk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ort" ADD CONSTRAINT "ort_benutzer_id_benutzer_id_fk" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protokoll" ADD CONSTRAINT "protokoll_benutzer_id_benutzer_id_fk" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitzung" ADD CONSTRAINT "sitzung_benutzer_id_benutzer_id_fk" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourvorlage" ADD CONSTRAINT "tourvorlage_benutzer_id_benutzer_id_fk" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourvorlage" ADD CONSTRAINT "tourvorlage_start_ort_id_ort_id_fk" FOREIGN KEY ("start_ort_id") REFERENCES "public"."ort"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourvorlage" ADD CONSTRAINT "tourvorlage_ende_ort_id_ort_id_fk" FOREIGN KEY ("ende_ort_id") REFERENCES "public"."ort"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourvorlage" ADD CONSTRAINT "tourvorlage_wegegeld_ausgangs_ort_id_ort_id_fk" FOREIGN KEY ("wegegeld_ausgangs_ort_id") REFERENCES "public"."ort"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "benutzer_email_idx" ON "benutzer" USING btree (lower("email"));