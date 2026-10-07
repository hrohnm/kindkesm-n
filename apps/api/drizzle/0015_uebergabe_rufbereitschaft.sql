CREATE TABLE "rufbereitschaft" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hebamme_id" uuid NOT NULL,
	"von" date NOT NULL,
	"bis" date NOT NULL,
	"notiz" text,
	"erstellt_von" uuid,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "betreuung" ADD COLUMN "uebergabe" text;--> statement-breakpoint
ALTER TABLE "betreuung" ADD COLUMN "uebergabe_am" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "betreuung" ADD COLUMN "uebergabe_von" uuid;--> statement-breakpoint
ALTER TABLE "rufbereitschaft" ADD CONSTRAINT "rufbereitschaft_hebamme_id_benutzer_id_fk" FOREIGN KEY ("hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rufbereitschaft" ADD CONSTRAINT "rufbereitschaft_erstellt_von_benutzer_id_fk" FOREIGN KEY ("erstellt_von") REFERENCES "public"."benutzer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betreuung" ADD CONSTRAINT "betreuung_uebergabe_von_benutzer_id_fk" FOREIGN KEY ("uebergabe_von") REFERENCES "public"."benutzer"("id") ON DELETE set null ON UPDATE no action;