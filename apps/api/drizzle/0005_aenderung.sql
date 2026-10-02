CREATE TABLE "aenderung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nummer" integer GENERATED ALWAYS AS IDENTITY (sequence name "aenderung_nummer_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"regelwerk_id" text,
	"titel" text NOT NULL,
	"begruendung" text NOT NULL,
	"operationen" jsonb NOT NULL,
	"vorher" jsonb NOT NULL,
	"status" text DEFAULT 'offen' NOT NULL,
	"erstellt_von" uuid NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"entschieden_von" uuid,
	"entschieden_am" timestamp with time zone,
	"kommentar" text
);
--> statement-breakpoint
ALTER TABLE "aenderung" ADD CONSTRAINT "aenderung_regelwerk_id_regelwerk_id_fk" FOREIGN KEY ("regelwerk_id") REFERENCES "public"."regelwerk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aenderung" ADD CONSTRAINT "aenderung_erstellt_von_benutzer_id_fk" FOREIGN KEY ("erstellt_von") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aenderung" ADD CONSTRAINT "aenderung_entschieden_von_benutzer_id_fk" FOREIGN KEY ("entschieden_von") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;