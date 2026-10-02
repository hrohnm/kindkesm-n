CREATE TABLE "einwilligung" (
	"klientin_id" uuid NOT NULL,
	"art" text NOT NULL,
	"erteilt" boolean NOT NULL,
	"form" text NOT NULL,
	"datum" date NOT NULL,
	"widerrufen_am" date,
	"unterschrift" jsonb,
	"notiz" text,
	"erfasst_von" uuid,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "einwilligung_klientin_id_art_pk" PRIMARY KEY("klientin_id","art")
);
--> statement-breakpoint
CREATE TABLE "kontakt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"klientin_id" uuid NOT NULL,
	"art" text NOT NULL,
	"name" text NOT NULL,
	"telefon" text,
	"email" text,
	"anschrift" text,
	"notiz" text,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "betreuung" ADD COLUMN "vertretung_hebamme_id" uuid;--> statement-breakpoint
ALTER TABLE "klientin" ADD COLUMN "flaggen" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "klientin" ADD COLUMN "sprache" text;--> statement-breakpoint
ALTER TABLE "klientin" ADD COLUMN "allergien" text;--> statement-breakpoint
ALTER TABLE "einwilligung" ADD CONSTRAINT "einwilligung_klientin_id_klientin_id_fk" FOREIGN KEY ("klientin_id") REFERENCES "public"."klientin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "einwilligung" ADD CONSTRAINT "einwilligung_erfasst_von_benutzer_id_fk" FOREIGN KEY ("erfasst_von") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kontakt" ADD CONSTRAINT "kontakt_klientin_id_klientin_id_fk" FOREIGN KEY ("klientin_id") REFERENCES "public"."klientin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betreuung" ADD CONSTRAINT "betreuung_vertretung_hebamme_id_benutzer_id_fk" FOREIGN KEY ("vertretung_hebamme_id") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;