CREATE TABLE "foto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"klientin_id" uuid NOT NULL,
	"kind_id" uuid,
	"besuch_id" uuid,
	"bereich" text NOT NULL,
	"notiz" text,
	"mime" text NOT NULL,
	"groesse" integer NOT NULL,
	"daten" "bytea" NOT NULL,
	"aufgenommen_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "foto" ADD CONSTRAINT "foto_klientin_id_klientin_id_fk" FOREIGN KEY ("klientin_id") REFERENCES "public"."klientin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto" ADD CONSTRAINT "foto_kind_id_kind_id_fk" FOREIGN KEY ("kind_id") REFERENCES "public"."kind"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto" ADD CONSTRAINT "foto_besuch_id_besuch_id_fk" FOREIGN KEY ("besuch_id") REFERENCES "public"."besuch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto" ADD CONSTRAINT "foto_erstellt_von_benutzer_id_fk" FOREIGN KEY ("erstellt_von") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;