import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const zeitstempel = () => ({
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
  geaendertAm: timestamp("geaendert_am", { withTimezone: true }).notNull().defaultNow(),
});

/** Stammdaten der Praxis (genau eine Zeile). */
export const praxis = pgTable("praxis", {
  id: smallint("id").primaryKey().default(1),
  name: text("name").notNull(),
  anschrift: text("anschrift").notNull(),
  telefon: text("telefon"),
  email: text("email"),
  aktivesRegelwerkId: text("aktives_regelwerk_id"),
  einstellungen: jsonb("einstellungen").$type<Record<string, unknown>>().notNull().default({}),
  ...zeitstempel(),
});

/** Benutzerkonten. Jede Hebamme hat genau ein Konto (Rolle "hebamme"). */
export const benutzer = pgTable(
  "benutzer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwortHash: text("passwort_hash").notNull(),
    rolle: text("rolle", { enum: ["hebamme", "buero"] }).notNull().default("hebamme"),
    name: text("name").notNull(),
    kuerzel: text("kuerzel").notNull(),
    telefon: text("telefon"),
    ik: text("ik"),
    status: text("status", { enum: ["aktiv", "babypause", "ausgeschieden"] }).notNull().default("aktiv"),
    babypauseBis: date("babypause_bis"),
    aktiv: boolean("aktiv").notNull().default(true),
    letzteAnmeldung: timestamp("letzte_anmeldung", { withTimezone: true }),
    ...zeitstempel(),
  },
  (t) => [uniqueIndex("benutzer_email_idx").on(sql`lower(${t.email})`)],
);

export const sitzung = pgTable("sitzung", {
  id: text("id").primaryKey(), // SHA-256 des Sitzungs-Tokens
  benutzerId: uuid("benutzer_id").notNull().references(() => benutzer.id, { onDelete: "cascade" }),
  laeuftAbAm: timestamp("laeuft_ab_am", { withTimezone: true }).notNull(),
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
  userAgent: text("user_agent"),
});

/** Orte: private Anschrift, Schule, Kita … je Hebamme; benutzerId null = Praxisstandort. */
export const ort = pgTable("ort", {
  id: uuid("id").primaryKey().defaultRandom(),
  benutzerId: uuid("benutzer_id").references(() => benutzer.id, { onDelete: "cascade" }),
  bezeichnung: text("bezeichnung").notNull(),
  typ: text("typ", { enum: ["privat", "schule", "kita", "praxis", "sonstiges"] }).notNull(),
  anschrift: text("anschrift").notNull(),
  abholzeit: text("abholzeit"),
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lon: numeric("lon", { precision: 9, scale: 6 }),
  ...zeitstempel(),
});

export const tourvorlage = pgTable("tourvorlage", {
  id: uuid("id").primaryKey().defaultRandom(),
  benutzerId: uuid("benutzer_id").notNull().references(() => benutzer.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  wochentage: integer("wochentage").array().notNull(),
  startOrtId: uuid("start_ort_id").notNull().references(() => ort.id),
  endeOrtId: uuid("ende_ort_id").notNull().references(() => ort.id),
  endeSpaetestens: text("ende_spaetestens"),
  wegegeldAusgangsOrtId: uuid("wegegeld_ausgangs_ort_id").notNull().references(() => ort.id),
  ...zeitstempel(),
});

export const abrechnungseinstellung = pgTable("abrechnungseinstellung", {
  benutzerId: uuid("benutzer_id").primaryKey().references(() => benutzer.id, { onDelete: "cascade" }),
  weg: text("weg", { enum: ["hebset", "andere_abrechnungsstelle", "selbst"] }).notNull().default("hebset"),
  abrechnungsstelleName: text("abrechnungsstelle_name"),
  abrechnungsstelleAnschrift: text("abrechnungsstelle_anschrift"),
  belegart: text("belegart", { enum: ["eigendruck_amtliches_formular", "durchschreibesatz"] })
    .notNull()
    .default("eigendruck_amtliches_formular"),
  unterschrift: text("unterschrift", { enum: ["papier", "tablet"] }).notNull().default("papier"),
  versandRhythmus: text("versand_rhythmus", { enum: ["monatlich", "zweimonatlich", "quartalsweise", "halbjaehrlich"] })
    .notNull()
    .default("monatlich"),
  versandTag: smallint("versand_tag").notNull().default(1),
  erinnerungVorlaufTage: smallint("erinnerung_vorlauf_tage").notNull().default(2),
  ...zeitstempel(),
});

/** Regelwerk-Versionen aus dem Hebammenhilfevertrag; Gesamtinhalt als JSON, Positionen zusätzlich als Tabelle. */
export const regelwerk = pgTable("regelwerk", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  gueltigVon: date("gueltig_von").notNull(),
  gueltigBis: date("gueltig_bis"),
  status: text("status", { enum: ["entwurf", "aktiv", "archiviert"] }).notNull().default("entwurf"),
  daten: jsonb("daten").$type<Record<string, unknown>>().notNull(),
  importiertAm: timestamp("importiert_am", { withTimezone: true }).notNull().defaultNow(),
});

export const gebuehrenposition = pgTable(
  "gebuehrenposition",
  {
    regelwerkId: text("regelwerk_id").notNull().references(() => regelwerk.id, { onDelete: "cascade" }),
    gpos: text("gpos").notNull(),
    gruppe: text("gruppe").notNull(),
    bezeichnung: text("bezeichnung").notNull(),
    kurztext: text("kurztext").notNull(),
    kategorie: smallint("kategorie").notNull(),
    leistungsart: text("leistungsart").notNull(),
    zuschlag: boolean("zuschlag").notNull(),
    betrag: numeric("betrag", { precision: 10, scale: 2 }),
    einheit: text("einheit").notNull(),
    formular: text("formular"),
    quittierungspflichtig: boolean("quittierungspflichtig").notNull(),
    hinweis: text("hinweis"),
    befristetVon: date("befristet_von"),
    befristetBis: date("befristet_bis"),
  },
  (t) => [primaryKey({ columns: [t.regelwerkId, t.gpos] })],
);

export const selbstzahlerLeistung = pgTable("selbstzahler_leistung", {
  id: text("id").primaryKey(),
  bezeichnung: text("bezeichnung").notNull(),
  rechnungstext: text("rechnungstext").notNull(),
  einheit: text("einheit").notNull(),
  preis: numeric("preis", { precision: 10, scale: 2 }).notNull(),
  umsatzsteuer: text("umsatzsteuer").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  aktiv: boolean("aktiv").notNull().default(true),
  ...zeitstempel(),
});

export const protokoll = pgTable("protokoll", {
  id: uuid("id").primaryKey().defaultRandom(),
  benutzerId: uuid("benutzer_id").references(() => benutzer.id, { onDelete: "set null" }),
  aktion: text("aktion").notNull(),
  objekt: text("objekt").notNull(),
  objektId: text("objekt_id"),
  details: jsonb("details").$type<Record<string, unknown>>(),
  zeit: timestamp("zeit", { withTimezone: true }).notNull().defaultNow(),
});
