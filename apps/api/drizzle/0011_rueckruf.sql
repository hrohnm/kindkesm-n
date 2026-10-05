CREATE TABLE "rueckruf" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'offen' NOT NULL,
	"name" text NOT NULL,
	"telefon" text NOT NULL,
	"anliegen" text NOT NULL,
	"zeitfenster" text NOT NULL,
	"hebamme_id" uuid,
	"nachricht" text,
	"einwilligung_am" timestamp with time zone NOT NULL,
	"versuche" integer DEFAULT 0 NOT NULL,
	"letzter_versuch_am" timestamp with time zone,
	"notiz" text,
	"erledigt_von" uuid,
	"erledigt_am" timestamp with time zone,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rueckruf" ADD CONSTRAINT "rueckruf_hebamme_id_benutzer_id_fk" FOREIGN KEY ("hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rueckruf" ADD CONSTRAINT "rueckruf_erledigt_von_benutzer_id_fk" FOREIGN KEY ("erledigt_von") REFERENCES "public"."benutzer"("id") ON DELETE set null ON UPDATE no action;