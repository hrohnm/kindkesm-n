CREATE TABLE "urkunde" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind_id" uuid NOT NULL,
	"hebamme_id" uuid NOT NULL,
	"daten" jsonb NOT NULL,
	"status" text DEFAULT 'entwurf' NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "urkunde_kind_id_unique" UNIQUE("kind_id")
);
--> statement-breakpoint
ALTER TABLE "urkunde" ADD CONSTRAINT "urkunde_kind_id_kind_id_fk" FOREIGN KEY ("kind_id") REFERENCES "public"."kind"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urkunde" ADD CONSTRAINT "urkunde_hebamme_id_benutzer_id_fk" FOREIGN KEY ("hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;