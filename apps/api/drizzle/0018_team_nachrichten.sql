CREATE TABLE "aufgabe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titel" text NOT NULL,
	"notiz" text,
	"zustaendig_id" uuid,
	"klientin_id" uuid,
	"faellig_am" date,
	"erledigt_am" timestamp with time zone,
	"erledigt_von" uuid,
	"erstellt_von" uuid NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nachricht" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"von_id" uuid NOT NULL,
	"an_id" uuid,
	"klientin_id" uuid,
	"text" text NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nachricht_gelesen" (
	"nachricht_id" uuid NOT NULL,
	"benutzer_id" uuid NOT NULL,
	"gelesen_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nachricht_gelesen_nachricht_id_benutzer_id_pk" PRIMARY KEY("nachricht_id","benutzer_id")
);
--> statement-breakpoint
ALTER TABLE "aufgabe" ADD CONSTRAINT "aufgabe_zustaendig_id_benutzer_id_fk" FOREIGN KEY ("zustaendig_id") REFERENCES "public"."benutzer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aufgabe" ADD CONSTRAINT "aufgabe_klientin_id_klientin_id_fk" FOREIGN KEY ("klientin_id") REFERENCES "public"."klientin"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aufgabe" ADD CONSTRAINT "aufgabe_erledigt_von_benutzer_id_fk" FOREIGN KEY ("erledigt_von") REFERENCES "public"."benutzer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aufgabe" ADD CONSTRAINT "aufgabe_erstellt_von_benutzer_id_fk" FOREIGN KEY ("erstellt_von") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nachricht" ADD CONSTRAINT "nachricht_von_id_benutzer_id_fk" FOREIGN KEY ("von_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nachricht" ADD CONSTRAINT "nachricht_an_id_benutzer_id_fk" FOREIGN KEY ("an_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nachricht" ADD CONSTRAINT "nachricht_klientin_id_klientin_id_fk" FOREIGN KEY ("klientin_id") REFERENCES "public"."klientin"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nachricht_gelesen" ADD CONSTRAINT "nachricht_gelesen_nachricht_id_nachricht_id_fk" FOREIGN KEY ("nachricht_id") REFERENCES "public"."nachricht"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nachricht_gelesen" ADD CONSTRAINT "nachricht_gelesen_benutzer_id_benutzer_id_fk" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;