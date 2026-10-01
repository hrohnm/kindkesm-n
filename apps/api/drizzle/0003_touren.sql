CREATE TABLE "adresse" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "adresse_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"plz" text NOT NULL,
	"ort" text NOT NULL,
	"strasse" text NOT NULL,
	"strasse_norm" text NOT NULL,
	"hausnummer" text NOT NULL,
	"lat" numeric(9, 6) NOT NULL,
	"lon" numeric(9, 6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fahrt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hebamme_id" uuid NOT NULL,
	"datum" date NOT NULL,
	"tour_id" uuid,
	"km_stand_beginn" integer,
	"km_stand_ende" integer,
	"strecke" text NOT NULL,
	"zweck" text NOT NULL,
	"km_dienstlich" numeric(7, 1) DEFAULT 0 NOT NULL,
	"km_wohnung_betrieb" numeric(7, 1) DEFAULT 0 NOT NULL,
	"km_privat" numeric(7, 1) DEFAULT 0 NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "termin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hebamme_id" uuid NOT NULL,
	"betreuung_id" uuid NOT NULL,
	"datum" date NOT NULL,
	"zeit" text NOT NULL,
	"uhrzeit" text,
	"fruehestens" text,
	"spaetestens" text,
	"dauer_min" smallint NOT NULL,
	"typ" text NOT NULL,
	"wichtig" boolean DEFAULT false NOT NULL,
	"notiz" text,
	"reihenfolge" smallint,
	"ankunft" text,
	"besuch_id" uuid,
	"status" text DEFAULT 'geplant' NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hebamme_id" uuid NOT NULL,
	"datum" date NOT NULL,
	"start_ort_id" uuid NOT NULL,
	"ende_ort_id" uuid NOT NULL,
	"wegegeld_ausgangs_ort_id" uuid NOT NULL,
	"start_zeit" text NOT NULL,
	"ende_spaetestens" text,
	"puffer_min" smallint DEFAULT 5 NOT NULL,
	"status" text DEFAULT 'entwurf' NOT NULL,
	"meter" integer,
	"fahr_sek" integer,
	"ankunft_ende" text,
	"geometrie" jsonb,
	"quelle" text,
	"hinweise" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wegegeld_tag" (
	"hebamme_id" uuid NOT NULL,
	"datum" date NOT NULL,
	"ausgangs_ort_id" uuid,
	"gesamt_meter" integer,
	"quelle" text,
	"manuell_km" numeric(7, 1),
	"getrennte_wege" boolean DEFAULT false NOT NULL,
	"begruendungen" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hinweise" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"berechnet_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wegegeld_tag_hebamme_id_datum_pk" PRIMARY KEY("hebamme_id","datum")
);
--> statement-breakpoint
ALTER TABLE "leistung" ALTER COLUMN "menge" SET DATA TYPE numeric(8, 1);--> statement-breakpoint
ALTER TABLE "klientin" ADD COLUMN "lat" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "klientin" ADD COLUMN "lon" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "klientin" ADD COLUMN "geo_quelle" text;--> statement-breakpoint
ALTER TABLE "leistung" ADD COLUMN "quelle" text DEFAULT 'besuch' NOT NULL;--> statement-breakpoint
ALTER TABLE "leistung" ADD COLUMN "txt" text;--> statement-breakpoint
ALTER TABLE "tourvorlage" ADD COLUMN "start_zeit" text DEFAULT '08:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "fahrt" ADD CONSTRAINT "fahrt_hebamme_id_benutzer_id_fk" FOREIGN KEY ("hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fahrt" ADD CONSTRAINT "fahrt_tour_id_tour_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tour"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termin" ADD CONSTRAINT "termin_hebamme_id_benutzer_id_fk" FOREIGN KEY ("hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termin" ADD CONSTRAINT "termin_betreuung_id_betreuung_id_fk" FOREIGN KEY ("betreuung_id") REFERENCES "public"."betreuung"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termin" ADD CONSTRAINT "termin_besuch_id_besuch_id_fk" FOREIGN KEY ("besuch_id") REFERENCES "public"."besuch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour" ADD CONSTRAINT "tour_hebamme_id_benutzer_id_fk" FOREIGN KEY ("hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour" ADD CONSTRAINT "tour_start_ort_id_ort_id_fk" FOREIGN KEY ("start_ort_id") REFERENCES "public"."ort"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour" ADD CONSTRAINT "tour_ende_ort_id_ort_id_fk" FOREIGN KEY ("ende_ort_id") REFERENCES "public"."ort"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour" ADD CONSTRAINT "tour_wegegeld_ausgangs_ort_id_ort_id_fk" FOREIGN KEY ("wegegeld_ausgangs_ort_id") REFERENCES "public"."ort"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wegegeld_tag" ADD CONSTRAINT "wegegeld_tag_hebamme_id_benutzer_id_fk" FOREIGN KEY ("hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wegegeld_tag" ADD CONSTRAINT "wegegeld_tag_ausgangs_ort_id_ort_id_fk" FOREIGN KEY ("ausgangs_ort_id") REFERENCES "public"."ort"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "adresse_suche_idx" ON "adresse" USING btree ("plz","strasse_norm","hausnummer");--> statement-breakpoint
CREATE INDEX "adresse_ort_idx" ON "adresse" USING btree ("strasse_norm","ort");--> statement-breakpoint
CREATE UNIQUE INDEX "tour_tag_idx" ON "tour" USING btree ("hebamme_id","datum");