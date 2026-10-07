CREATE TABLE "hinweis_erledigt" (
	"benutzer_id" uuid NOT NULL,
	"hinweis_id" text NOT NULL,
	"erledigt_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hinweis_erledigt_benutzer_id_hinweis_id_pk" PRIMARY KEY("benutzer_id","hinweis_id")
);
--> statement-breakpoint
ALTER TABLE "hinweis_erledigt" ADD CONSTRAINT "hinweis_erledigt_benutzer_id_benutzer_id_fk" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;