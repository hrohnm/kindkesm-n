import type {
  Abrechnungsweg,
  Belegart,
  HebammeStatus,
  OrtTyp,
  Unterschriftsverfahren,
  Versandrhythmus,
} from "@kindkesmoeoen/shared";

export type Ich = { id: string; email: string; name: string; kuerzel: string; rolle: "hebamme" | "buero"; status: HebammeStatus };

export type Ort = { id: string; benutzerId: string | null; bezeichnung: string; typ: OrtTyp; anschrift: string; abholzeit: string | null };

export type Tourvorlage = {
  id: string;
  name: string;
  wochentage: number[];
  startOrtId: string;
  endeOrtId: string;
  endeSpaetestens: string | null;
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

export type Hinweis = { id: string; titel: string; datum: string; tage: number; stufe: "info" | "warnung" | "dringend"; quelle: string };

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
};

export type Selbstzahler = { id: string; bezeichnung: string; rechnungstext: string; einheit: string; preis: string; umsatzsteuer: string; details: Record<string, unknown> };
