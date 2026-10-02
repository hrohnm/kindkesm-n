import type {
  Abrechnungsweg,
  Belegart,
  HebammeStatus,
  OrtTyp,
  Unterschriftsverfahren,
  Versandrhythmus,
} from "@kindkesmoeoen/shared";

export type Ich = { id: string; email: string; name: string; kuerzel: string; rolle: "hebamme" | "buero"; status: HebammeStatus };

export type Ort = { id: string; benutzerId: string | null; bezeichnung: string; typ: OrtTyp; anschrift: string; abholzeit: string | null; lat?: string | null; lon?: string | null };

export type Tourvorlage = {
  id: string;
  name: string;
  wochentage: number[];
  startOrtId: string;
  endeOrtId: string;
  endeSpaetestens: string | null;
  startZeit: string;
  wegegeldAusgangsOrtId: string;
};

export type Abrechnung = {
  weg: Abrechnungsweg;
  abrechnungsstelleName: string | null;
  abrechnungsstelleAnschrift: string | null;
  belegart: Belegart;
  unterschrift: Unterschriftsverfahren;
  versandRhythmus: Versandrhythmus;
  versandTag: number;
  erinnerungVorlaufTage: number;
};

export type Profil = { name: string; kuerzel: string; email: string; telefon: string | null; ik: string | null; status: HebammeStatus; babypauseBis: string | null };

export type TeamMitglied = { id: string; name: string; kuerzel: string; email: string; telefon: string | null; rolle: string; status: HebammeStatus; babypauseBis: string | null; ikHinterlegt: boolean };

export type Praxis = { name: string; anschrift: string; telefon: string | null; email: string | null; aktivesRegelwerkId: string | null };

export type Hinweis = { id: string; titel: string; datum: string; tage: number; stufe: "info" | "warnung" | "dringend"; quelle: string; link?: string };

export type RegelwerkKurz = { id: string; name: string; gueltigVon: string; gueltigBis: string | null; status: string; anzahlPositionen: number };

export type Position = {
  gpos: string;
  gruppe: string;
  bezeichnung: string;
  kurztext: string;
  kategorie: number;
  leistungsart: string;
  zuschlag: boolean;
  betrag: string | null;
  einheit: string;
  formular: string | null;
  quittierungspflichtig: boolean;
  hinweis: string | null;
  befristetBis: string | null;
  material_fuer?: string[];
  einmalig?: boolean;
};

export type Selbstzahler = { id: string; bezeichnung: string; rechnungstext: string; einheit: string; preis: string; umsatzsteuer: string; aktiv: boolean; details: Record<string, unknown>; meinPreis?: string | null; eigenePreise?: Array<{ benutzerId: string; kuerzel: string; name: string; preis: string }> };

// ------------------------------------------------------------------ Akte
export type KlientinListe = {
  id: string;
  vorname: string;
  nachname: string;
  ort: string | null;
  telefon: string | null;
  zustaendig: string;
  zustaendigeHebammeId: string;
  betreuung: { id: string; status: string; et: string | null; geburtsdatum: string | null; lebenstag: number | null; ssw: string | null; kinder: string[] } | null;
};

export type Kind = {
  id: string;
  betreuungId: string;
  vorname: string;
  nachname: string | null;
  geburtsdatum: string;
  geburtszeit: string | null;
  geschlecht: "weiblich" | "maennlich" | "divers" | null;
  geburtsgewicht: number | null;
  laenge: string | null;
  kopfumfang: string | null;
};

export type Betreuung = {
  id: string;
  klientinId: string;
  status: "anfrage" | "schwangerschaft" | "wochenbett" | "abgeschlossen";
  et: string | null;
  gravida: number | null;
  para: number | null;
  geburtsort: string | null;
  geburtsmodus: string | null;
  zustaendigeHebammeId: string | null;
  notizen: string | null;
  kinder: Kind[];
};

export type Klientin = {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  telefon: string | null;
  email: string | null;
  krankenkasse: string | null;
  kassenIk: string | null;
  versichertennummer: string | null;
  hinweise: string | null;
  zustaendigeHebammeId: string;
  lat: number | null;
  lon: number | null;
  geoQuelle: "adresse" | "strasse" | "manuell" | null;
  betreuungen: Betreuung[];
};

export type BesuchKurz = {
  id: string;
  datum: string;
  von: string;
  bis: string;
  typ: string;
  art: number;
  status: "entwurf" | "abgeschlossen";
  stamm: string | null;
  summe: string;
  einheiten: number;
  einheitenAbrechenbar: number;
  hinweise: Array<{ stufe: string; text: string }>;
  unterschrift: { art: string };
  hebamme: string;
  hebammeId: string;
};

export type KontingentStand = { id: string; name: string; genutzt: number; maximum: number; einheit: string };
