CREATE TABLE "selbstzahler_preis" (
	"benutzer_id" uuid NOT NULL,
	"leistung_id" text NOT NULL,
	"preis" numeric(10, 2) NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "selbstzahler_preis_benutzer_id_leistung_id_pk" PRIMARY KEY("benutzer_id","leistung_id")
);
--> statement-breakpoint
ALTER TABLE "selbstzahler_preis" ADD CONSTRAINT "selbstzahler_preis_benutzer_id_benutzer_id_fk" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selbstzahler_preis" ADD CONSTRAINT "selbstzahler_preis_leistung_id_selbstzahler_leistung_id_fk" FOREIGN KEY ("leistung_id") REFERENCES "public"."selbstzahler_leistung"("id") ON DELETE cascade ON UPDATE no action;