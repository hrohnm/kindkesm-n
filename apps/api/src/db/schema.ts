import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
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
    /** Persönliche Ansicht der Besuchsdokumentation (sichtbare Felder, Vergleich, Kacheln) */
    ansicht: jsonb("ansicht").$type<Record<string, unknown>>().notNull().default({}),
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
  startZeit: text("start_zeit").notNull().default("08:00"),
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

// ------------------------------------------------------------------ Akte (Meilenstein 2)

/** Klientin (Versicherte) mit Stamm- und Versichertendaten. */
export const klientin = pgTable("klientin", {
  id: uuid("id").primaryKey().defaultRandom(),
  vorname: text("vorname").notNull(),
  nachname: text("nachname").notNull(),
  geburtsdatum: date("geburtsdatum"),
  strasse: text("strasse"),
  plz: text("plz"),
  ort: text("ort"),
  telefon: text("telefon"),
  email: text("email"),
  krankenkasse: text("krankenkasse"),
  kassenIk: text("kassen_ik"),
  versichertennummer: text("versichertennummer"),
  hinweise: text("hinweise"),
  /** Position der Wohnung für Tourenplanung und Wegegeld (aus dem Adressverzeichnis oder von Hand gesetzt) */
  lat: numeric("lat", { precision: 9, scale: 6, mode: "number" }),
  lon: numeric("lon", { precision: 9, scale: 6, mode: "number" }),
  geoQuelle: text("geo_quelle", { enum: ["adresse", "strasse", "manuell"] }),
  zustaendigeHebammeId: uuid("zustaendige_hebamme_id").notNull().references(() => benutzer.id),
  archiviert: boolean("archiviert").notNull().default(false),
  ...zeitstempel(),
});

/** Betreuungsfall: eine Schwangerschaft mit Geburt und Wochenbett. */
export const betreuung = pgTable("betreuung", {
  id: uuid("id").primaryKey().defaultRandom(),
  klientinId: uuid("klientin_id").notNull().references(() => klientin.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["anfrage", "schwangerschaft", "wochenbett", "abgeschlossen"] }).notNull().default("schwangerschaft"),
  et: date("et"),
  gravida: smallint("gravida"),
  para: smallint("para"),
  geburtsort: text("geburtsort"),
  geburtsmodus: text("geburtsmodus"),
  zustaendigeHebammeId: uuid("zustaendige_hebamme_id").references(() => benutzer.id),
  notizen: text("notizen"),
  ...zeitstempel(),
});

export const kind = pgTable("kind", {
  id: uuid("id").primaryKey().defaultRandom(),
  betreuungId: uuid("betreuung_id").notNull().references(() => betreuung.id, { onDelete: "cascade" }),
  vorname: text("vorname").notNull(),
  nachname: text("nachname"),
  geburtsdatum: date("geburtsdatum").notNull(),
  geburtszeit: text("geburtszeit"),
  geschlecht: text("geschlecht", { enum: ["weiblich", "maennlich", "divers"] }),
  geburtsgewicht: integer("geburtsgewicht"),
  laenge: numeric("laenge", { precision: 4, scale: 1 }),
  kopfumfang: numeric("kopfumfang", { precision: 4, scale: 1 }),
  ...zeitstempel(),
});

/** Besuch bzw. Kontakt mit Dokumentation, Unterschrift und berechneten Leistungen. */
export const besuch = pgTable("besuch", {
  id: uuid("id").primaryKey().defaultRandom(),
  betreuungId: uuid("betreuung_id").notNull().references(() => betreuung.id, { onDelete: "cascade" }),
  hebammeId: uuid("hebamme_id").notNull().references(() => benutzer.id),
  datum: date("datum").notNull(),
  von: text("von").notNull(),
  bis: text("bis").notNull(),
  typ: text("typ", { enum: ["schwangerschaft", "vorsorge", "aufklaerung", "stillvorbereitung", "wochenbett"] }).notNull(),
  art: smallint("art").notNull(),
  material: text("material").array().notNull().default(sql`'{}'::text[]`),
  dokumentation: jsonb("dokumentation").$type<Record<string, unknown>>().notNull().default({}),
  unterschrift: jsonb("unterschrift").$type<Record<string, unknown>>().notNull().default({ art: "keine" }),
  status: text("status", { enum: ["entwurf", "abgeschlossen"] }).notNull().default("entwurf"),
  /** Ergebnis der Abrechnungsprüfung zum Zeitpunkt des Speicherns */
  regelwerkId: text("regelwerk_id"),
  stamm: text("stamm"),
  einheiten: smallint("einheiten").notNull().default(0),
  einheitenAbrechenbar: smallint("einheiten_abrechenbar").notNull().default(0),
  summe: numeric("summe", { precision: 10, scale: 2 }).notNull().default("0"),
  hinweise: jsonb("hinweise").$type<Array<{ stufe: string; text: string }>>().notNull().default([]),
  ...zeitstempel(),
});

/** Abrechenbare Leistungszeilen eines Besuchs (je GPOS und Zuschlagsabschnitt). */
export const leistung = pgTable("leistung", {
  id: uuid("id").primaryKey().defaultRandom(),
  besuchId: uuid("besuch_id").notNull().references(() => besuch.id, { onDelete: "cascade" }),
  hebammeId: uuid("hebamme_id").notNull().references(() => benutzer.id),
  regelwerkId: text("regelwerk_id").notNull(),
  gpos: text("gpos").notNull(),
  bezeichnung: text("bezeichnung").notNull(),
  datum: date("datum").notNull(),
  menge: numeric("menge", { precision: 8, scale: 1, mode: "number" }).notNull(),
  einheit: text("einheit").notNull(),
  einzelbetrag: numeric("einzelbetrag", { precision: 10, scale: 2 }).notNull(),
  betrag: numeric("betrag", { precision: 10, scale: 2 }).notNull(),
  zuschlag: boolean("zuschlag").notNull().default(false),
  formular: text("formular"),
  quittierungspflichtig: boolean("quittierungspflichtig").notNull(),
  /** besuch = aus der Besuchsdokumentation, wegegeld = aus der Tagesstrecke (wird bei Änderungen neu berechnet) */
  quelle: text("quelle", { enum: ["besuch", "wegegeld"] }).notNull().default("besuch"),
  /** Zusatzangabe für die Abrechnung, z. B. Anzahl der Versicherten bei 50200 oder Begründung */
  txt: text("txt"),
  status: text("status", { enum: ["erfasst", "versendet", "bezahlt", "gekuerzt"] }).notNull().default("erfasst"),
  versandId: uuid("versand_id").references(() => versand.id, { onDelete: "set null" }),
  kuerzungBetrag: numeric("kuerzung_betrag", { precision: 10, scale: 2 }),
  kuerzungGrund: text("kuerzung_grund"),
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
});

/** Versionen eines Besuchs: jede Änderung nach dem Abschluss bleibt nachvollziehbar (Dokumentationspflicht). */
export const besuchHistorie = pgTable("besuch_historie", {
  id: uuid("id").primaryKey().defaultRandom(),
  besuchId: uuid("besuch_id").notNull().references(() => besuch.id, { onDelete: "cascade" }),
  geaendertVon: uuid("geaendert_von").references(() => benutzer.id, { onDelete: "set null" }),
  stand: jsonb("stand").$type<Record<string, unknown>>().notNull(),
  zeit: timestamp("zeit", { withTimezone: true }).notNull().defaultNow(),
});

// ------------------------------------------------------------------ Abrechnung (Meilenstein 3)

/** Ein Versand an die Abrechnungsstelle (je Hebamme; jede rechnet einzeln ab). */
export const versand = pgTable("versand", {
  id: uuid("id").primaryKey().defaultRandom(),
  nummer: text("nummer").notNull(),
  hebammeId: uuid("hebamme_id").notNull().references(() => benutzer.id),
  status: text("status", { enum: ["vorbereitet", "versendet", "bezahlt"] }).notNull().default("vorbereitet"),
  bis: date("bis").notNull(),
  weg: text("weg").notNull(),
  empfaengerName: text("empfaenger_name"),
  empfaengerAnschrift: text("empfaenger_anschrift"),
  anzahlFaelle: smallint("anzahl_faelle").notNull(),
  anzahlLeistungen: smallint("anzahl_leistungen").notNull(),
  summe: numeric("summe", { precision: 10, scale: 2 }).notNull(),
  versendetAm: date("versendet_am"),
  einschreibenNr: text("einschreiben_nr"),
  bezahltAm: date("bezahlt_am"),
  ausgezahlt: numeric("ausgezahlt", { precision: 10, scale: 2 }),
  notiz: text("notiz"),
  ...zeitstempel(),
});

// ------------------------------------------------------------------ Touren (Meilenstein 4)

/** Adressverzeichnis aus OpenStreetMap (Mecklenburg-Vorpommern) für die Geokodierung ohne externe Dienste. */
export const adresse = pgTable(
  "adresse",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    plz: text("plz").notNull(),
    ort: text("ort").notNull(),
    strasse: text("strasse").notNull(),
    strasseNorm: text("strasse_norm").notNull(),
    hausnummer: text("hausnummer").notNull(),
    lat: numeric("lat", { precision: 9, scale: 6, mode: "number" }).notNull(),
    lon: numeric("lon", { precision: 9, scale: 6, mode: "number" }).notNull(),
  },
  (t) => [index("adresse_suche_idx").on(t.plz, t.strasseNorm, t.hausnummer), index("adresse_ort_idx").on(t.strasseNorm, t.ort)],
);

/** Tagestour einer Hebamme. */
export const tour = pgTable(
  "tour",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hebammeId: uuid("hebamme_id").notNull().references(() => benutzer.id, { onDelete: "cascade" }),
    datum: date("datum").notNull(),
    startOrtId: uuid("start_ort_id").notNull().references(() => ort.id),
    endeOrtId: uuid("ende_ort_id").notNull().references(() => ort.id),
    wegegeldAusgangsOrtId: uuid("wegegeld_ausgangs_ort_id").notNull().references(() => ort.id),
    startZeit: text("start_zeit").notNull(),
    endeSpaetestens: text("ende_spaetestens"),
    pufferMin: smallint("puffer_min").notNull().default(5),
    status: text("status", { enum: ["entwurf", "bestaetigt"] }).notNull().default("entwurf"),
    meter: integer("meter"),
    fahrSek: integer("fahr_sek"),
    ankunftEnde: text("ankunft_ende"),
    geometrie: jsonb("geometrie").$type<Array<[number, number]>>(),
    quelle: text("quelle", { enum: ["osrm", "luftlinie"] }),
    hinweise: jsonb("hinweise").$type<string[]>().notNull().default([]),
    ...zeitstempel(),
  },
  (t) => [uniqueIndex("tour_tag_idx").on(t.hebammeId, t.datum)],
);

/** Geplanter Besuch (Termin) mit festem Zeitpunkt oder Zeitfenster. */
export const termin = pgTable("termin", {
  id: uuid("id").primaryKey().defaultRandom(),
  hebammeId: uuid("hebamme_id").notNull().references(() => benutzer.id, { onDelete: "cascade" }),
  betreuungId: uuid("betreuung_id").notNull().references(() => betreuung.id, { onDelete: "cascade" }),
  datum: date("datum").notNull(),
  zeit: text("zeit", { enum: ["fix", "ganztags", "vormittags", "nachmittags", "fenster"] }).notNull(),
  uhrzeit: text("uhrzeit"),
  fruehestens: text("fruehestens"),
  spaetestens: text("spaetestens"),
  dauerMin: smallint("dauer_min").notNull(),
  typ: text("typ", { enum: ["schwangerschaft", "vorsorge", "aufklaerung", "stillvorbereitung", "wochenbett"] }).notNull(),
  wichtig: boolean("wichtig").notNull().default(false),
  notiz: text("notiz"),
  reihenfolge: smallint("reihenfolge"),
  ankunft: text("ankunft"),
  besuchId: uuid("besuch_id").references(() => besuch.id, { onDelete: "set null" }),
  status: text("status", { enum: ["geplant", "erledigt", "abgesagt"] }).notNull().default("geplant"),
  ...zeitstempel(),
});

/** Wegegeld eines Tages: Gesamtstrecke, Aufteilung und Abweichungen von Hand. */
export const wegegeldTag = pgTable(
  "wegegeld_tag",
  {
    hebammeId: uuid("hebamme_id").notNull().references(() => benutzer.id, { onDelete: "cascade" }),
    datum: date("datum").notNull(),
    ausgangsOrtId: uuid("ausgangs_ort_id").references(() => ort.id, { onDelete: "set null" }),
    gesamtMeter: integer("gesamt_meter"),
    quelle: text("quelle", { enum: ["osrm", "luftlinie", "manuell"] }),
    manuellKm: numeric("manuell_km", { precision: 7, scale: 1, mode: "number" }),
    getrennteWege: boolean("getrennte_wege").notNull().default(false),
    begruendungen: jsonb("begruendungen").$type<Record<string, string>>().notNull().default({}),
    hinweise: jsonb("hinweise").$type<Array<{ stufe: string; text: string }>>().notNull().default([]),
    berechnetAm: timestamp("berechnet_am", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.hebammeId, t.datum] })],
);

/** Fahrtenbuch: ein Eintrag je Fahrt bzw. Tagestour. */
export const fahrt = pgTable("fahrt", {
  id: uuid("id").primaryKey().defaultRandom(),
  hebammeId: uuid("hebamme_id").notNull().references(() => benutzer.id, { onDelete: "cascade" }),
  datum: date("datum").notNull(),
  tourId: uuid("tour_id").references(() => tour.id, { onDelete: "set null" }),
  kmStandBeginn: integer("km_stand_beginn"),
  kmStandEnde: integer("km_stand_ende"),
  strecke: text("strecke").notNull(),
  zweck: text("zweck").notNull(),
  kmDienstlich: numeric("km_dienstlich", { precision: 7, scale: 1, mode: "number" }).notNull().default(0),
  kmWohnungBetrieb: numeric("km_wohnung_betrieb", { precision: 7, scale: 1, mode: "number" }).notNull().default(0),
  kmPrivat: numeric("km_privat", { precision: 7, scale: 1, mode: "number" }).notNull().default(0),
  ...zeitstempel(),
});

// ------------------------------------------------------------------ Regelwerk-Administration (Meilenstein 5)

/** Vorgeschlagene Änderung am Regelwerk bzw. an der Selbstzahler-Preisliste (Vier-Augen-Freigabe). */
export const aenderung = pgTable("aenderung", {
  id: uuid("id").primaryKey().defaultRandom(),
  nummer: integer("nummer").generatedAlwaysAsIdentity(),
  regelwerkId: text("regelwerk_id").references(() => regelwerk.id, { onDelete: "cascade" }),
  titel: text("titel").notNull(),
  begruendung: text("begruendung").notNull(),
  operationen: jsonb("operationen").$type<Array<Record<string, unknown>>>().notNull(),
  /** bisherige Werte je Operation zum Zeitpunkt des Vorschlags */
  vorher: jsonb("vorher").$type<Array<Record<string, unknown>>>().notNull(),
  status: text("status", { enum: ["offen", "freigegeben", "abgelehnt", "zurueckgezogen"] }).notNull().default("offen"),
  erstelltVon: uuid("erstellt_von").notNull().references(() => benutzer.id),
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
  entschiedenVon: uuid("entschieden_von").references(() => benutzer.id),
  entschiedenAm: timestamp("entschieden_am", { withTimezone: true }),
  kommentar: text("kommentar"),
});

/** Eigener Preis einer Hebamme für eine Selbstzahler-Leistung (überschreibt den Praxispreis; jede rechnet selbst ab). */
export const selbstzahlerPreis = pgTable(
  "selbstzahler_preis",
  {
    benutzerId: uuid("benutzer_id").notNull().references(() => benutzer.id, { onDelete: "cascade" }),
    leistungId: text("leistung_id").notNull().references(() => selbstzahlerLeistung.id, { onDelete: "cascade" }),
    preis: numeric("preis", { precision: 10, scale: 2 }).notNull(),
    geaendertAm: timestamp("geaendert_am", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.benutzerId, t.leistungId] })],
);

// ------------------------------------------------------------------ Kinderurkunde (M10)

/** Kinderurkunde: eine je Kind; Inhalt (Text, Tabelle, Meilensteine, Optionen) als JSON, das PDF wird daraus erzeugt. */
export const urkunde = pgTable("urkunde", {
  id: uuid("id").primaryKey().defaultRandom(),
  kindId: uuid("kind_id").notNull().unique().references(() => kind.id, { onDelete: "cascade" }),
  hebammeId: uuid("hebamme_id").notNull().references(() => benutzer.id),
  daten: jsonb("daten").$type<Record<string, unknown>>().notNull(),
  status: text("status", { enum: ["entwurf", "fertig"] }).notNull().default("entwurf"),
  ...zeitstempel(),
});
