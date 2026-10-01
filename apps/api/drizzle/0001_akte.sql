CREATE TABLE "besuch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"betreuung_id" uuid NOT NULL,
	"hebamme_id" uuid NOT NULL,
	"datum" date NOT NULL,
	"von" text NOT NULL,
	"bis" text NOT NULL,
	"typ" text NOT NULL,
	"art" smallint NOT NULL,
	"material" text[] DEFAULT '{}'::text[] NOT NULL,
	"dokumentation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"unterschrift" jsonb DEFAULT '{"art":"keine"}'::jsonb NOT NULL,
	"status" text DEFAULT 'entwurf' NOT NULL,
	"regelwerk_id" text,
	"stamm" text,
	"einheiten" smallint DEFAULT 0 NOT NULL,
	"einheiten_abrechenbar" smallint DEFAULT 0 NOT NULL,
	"summe" numeric(10, 2) DEFAULT '0' NOT NULL,
	"hinweise" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "besuch_historie" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"besuch_id" uuid NOT NULL,
	"geaendert_von" uuid,
	"stand" jsonb NOT NULL,
	"zeit" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "betreuung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"klientin_id" uuid NOT NULL,
	"status" text DEFAULT 'schwangerschaft' NOT NULL,
	"et" date,
	"gravida" smallint,
	"para" smallint,
	"geburtsort" text,
	"geburtsmodus" text,
	"zustaendige_hebamme_id" uuid,
	"notizen" text,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kind" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"betreuung_id" uuid NOT NULL,
	"vorname" text NOT NULL,
	"nachname" text,
	"geburtsdatum" date NOT NULL,
	"geburtszeit" text,
	"geschlecht" text,
	"geburtsgewicht" integer,
	"laenge" numeric(4, 1),
	"kopfumfang" numeric(4, 1),
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "klientin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vorname" text NOT NULL,
	"nachname" text NOT NULL,
	"geburtsdatum" date,
	"strasse" text,
	"plz" text,
	"ort" text,
	"telefon" text,
	"email" text,
	"krankenkasse" text,
	"kassen_ik" text,
	"versichertennummer" text,
	"hinweise" text,
	"zustaendige_hebamme_id" uuid NOT NULL,
	"archiviert" boolean DEFAULT false NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leistung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"besuch_id" uuid NOT NULL,
	"hebamme_id" uuid NOT NULL,
	"regelwerk_id" text NOT NULL,
	"gpos" text NOT NULL,
	"bezeichnung" text NOT NULL,
	"datum" date NOT NULL,
	"menge" smallint NOT NULL,
	"einheit" text NOT NULL,
	"einzelbetrag" numeric(10, 2) NOT NULL,
	"betrag" numeric(10, 2) NOT NULL,
	"zuschlag" boolean DEFAULT false NOT NULL,
	"formular" text,
	"quittierungspflichtig" boolean NOT NULL,
	"status" text DEFAULT 'erfasst' NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "besuch" ADD CONSTRAINT "besuch_betreuung_id_betreuung_id_fk" FOREIGN KEY ("betreuung_id") REFERENCES "public"."betreuung"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "besuch" ADD CONSTRAINT "besuch_hebamme_id_benutzer_id_fk" FOREIGN KEY ("hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "besuch_historie" ADD CONSTRAINT "besuch_historie_besuch_id_besuch_id_fk" FOREIGN KEY ("besuch_id") REFERENCES "public"."besuch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "besuch_historie" ADD CONSTRAINT "besuch_historie_geaendert_von_benutzer_id_fk" FOREIGN KEY ("geaendert_von") REFERENCES "public"."benutzer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betreuung" ADD CONSTRAINT "betreuung_klientin_id_klientin_id_fk" FOREIGN KEY ("klientin_id") REFERENCES "public"."klientin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betreuung" ADD CONSTRAINT "betreuung_zustaendige_hebamme_id_benutzer_id_fk" FOREIGN KEY ("zustaendige_hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kind" ADD CONSTRAINT "kind_betreuung_id_betreuung_id_fk" FOREIGN KEY ("betreuung_id") REFERENCES "public"."betreuung"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "klientin" ADD CONSTRAINT "klientin_zustaendige_hebamme_id_benutzer_id_fk" FOREIGN KEY ("zustaendige_hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leistung" ADD CONSTRAINT "leistung_besuch_id_besuch_id_fk" FOREIGN KEY ("besuch_id") REFERENCES "public"."besuch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leistung" ADD CONSTRAINT "leistung_hebamme_id_benutzer_id_fk" FOREIGN KEY ("hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;