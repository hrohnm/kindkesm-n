/**
 * Änderungen am Regelwerk und an der Selbstzahler-Preisliste mit Vier-Augen-Freigabe (Meilenstein 5).
 *
 * Eine Änderung besteht aus Operationen. Jede Hebamme kann eine Änderung vorschlagen; wirksam wird sie
 * erst, wenn eine andere Hebamme sie freigibt. Beim Vorschlagen werden die bisherigen Werte festgehalten;
 * hat sich bis zur Freigabe etwas daran geändert, muss neu vorgeschlagen werden.
 */
import { z } from "zod";
import type { RegelwerkDaten } from "./plausi";

const uhrzeit = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Uhrzeit im Format HH:MM");
const leerZuNull = (v: unknown) => (v === "" || v === undefined ? null : v);
const optText = (max: number) => z.preprocess(leerZuNull, z.string().trim().max(max).nullable());
const grenze = z.preprocess((v) => (v === "" || v === undefined ? null : v), z.number().int().min(0).max(999).nullable());

/** Umsatzsteuer-Varianten der Selbstzahler-Preisliste (konfiguration/selbstzahler-preisliste.json) */
export const UMSATZSTEUER = ["steuerfrei_4_14", "kleinunternehmer_19", "regelsatz_19"] as const;
export const UMSATZSTEUER_LABEL: Record<(typeof UMSATZSTEUER)[number], string> = {
  steuerfrei_4_14: "steuerfrei (§ 4 Nr. 14 UStG, Heilbehandlung)",
  kleinunternehmer_19: "Kleinunternehmer (§ 19 UStG)",
  regelsatz_19: "19 % Umsatzsteuer",
};

export const POSITION_FELDER = ["betrag", "bezeichnung", "kurztext", "formular", "quittierungspflichtig", "hinweis"] as const;
export const KONTINGENT_FELDER = ["kontakte_pro_tag", "einheiten_pro_kontakt", "einheiten_pro_tag", "kontakte_gesamt", "kontakttage_gesamt", "einheiten_gesamt", "mehrling_zusatz_einheiten"] as const;
export const KONTINGENT_LABEL: Record<(typeof KONTINGENT_FELDER)[number], string> = {
  kontakte_pro_tag: "Kontakte je Tag",
  einheiten_pro_kontakt: "5-Min.-Einheiten je Kontakt",
  einheiten_pro_tag: "Einheiten je Tag",
  kontakte_gesamt: "Kontakte gesamt",
  kontakttage_gesamt: "Kontakttage gesamt",
  einheiten_gesamt: "Einheiten gesamt",
  mehrling_zusatz_einheiten: "Zusatzeinheiten je weiterem Kind",
};

export const operationSchema = z.discriminatedUnion("art", [
  z.object({
    art: z.literal("position"),
    gpos: z.string().regex(/^\d{5}$/),
    felder: z
      .object({
        betrag: z.number().min(0).max(5000).nullable(),
        bezeichnung: z.string().trim().min(3).max(300),
        kurztext: z.string().trim().min(1).max(60),
        formular: optText(10),
        quittierungspflichtig: z.boolean(),
        hinweis: optText(500),
        material_fuer: z.array(z.enum(["schwangerschaft", "vorsorge", "aufklaerung", "stillvorbereitung", "wochenbett"])),
        einmalig: z.boolean(),
      })
      .partial(),
  }),
  /** Neue Gebührenposition (z. B. neue Variante oder Materialpauschale aus einem Vertragsnachtrag) */
  z.object({
    art: z.literal("position_neu"),
    position: z.object({
      gpos: z.string().regex(/^\d{5}$/, "5-stellige GPOS"),
      bezeichnung: z.string().trim().min(3).max(300),
      kurztext: z.string().trim().min(1).max(60),
      leistungsart: z.enum(["keine Spezifikation", "aufsuchend", "nicht-aufsuchend", "Videobetreuung", "Telefonkurzberatung", "Beleghebamme", "Selbstlerneinheit"]),
      betrag: z.number().min(0).max(5000).nullable(),
      einheit: z.enum(["5min", "pauschal", "km", "tatsaechlich"]),
      formular: optText(10),
      quittierungspflichtig: z.boolean(),
      hinweis: optText(500),
      material_fuer: z.array(z.enum(["schwangerschaft", "vorsorge", "aufklaerung", "stillvorbereitung", "wochenbett"])).optional(),
      einmalig: z.boolean().optional(),
    }),
  }),
  /** Neues Kontingent; die Abrechnung findet es über die Kennung = GPOS-Stamm (z. B. 107) */
  z.object({
    art: z.literal("kontingent_neu"),
    kontingent: z.object({
      id: z.string().regex(/^[0-9a-z-]{2,20}$/, "z. B. 107 oder 101-tel"),
      name: z.string().trim().min(3).max(200),
      positionen: z.array(z.string().trim().min(3).max(10)).min(1).max(30),
      verhalten_bei_ueberschreitung: z.enum(["anordnung", "sperre", "hinweis"]),
      kontakte_pro_tag: grenze.optional(),
      einheiten_pro_kontakt: grenze.optional(),
      einheiten_pro_tag: grenze.optional(),
      kontakte_gesamt: grenze.optional(),
      kontakttage_gesamt: grenze.optional(),
      einheiten_gesamt: grenze.optional(),
      mehrling_zusatz_einheiten: grenze.optional(),
    }),
  }),
  z.object({
    art: z.literal("kontingent"),
    id: z.string().min(1).max(40),
    felder: z.object(Object.fromEntries(KONTINGENT_FELDER.map((f) => [f, grenze])) as Record<(typeof KONTINGENT_FELDER)[number], typeof grenze>).partial(),
  }),
  z.object({
    art: z.literal("zuschlaege"),
    felder: z.object({ nacht_von: uhrzeit, nacht_bis: uhrzeit, samstag_ab: uhrzeit, sonntag: z.boolean(), feiertage: z.boolean() }).partial(),
  }),
  z.object({
    art: z.literal("wegegeld"),
    felder: z
      .object({
        satz_je_km: z.number().min(0).max(10),
        max_km_regel: z.number().int().min(1).max(200),
        max_km_mit_begruendung: z.number().int().min(1).max(400),
        hin_und_rueckweg: z.boolean(),
      })
      .partial(),
  }),
  z.object({
    art: z.literal("feiertage"),
    liste: z.array(z.object({ name: z.string().trim().min(2).max(80), regel: z.string().regex(/^(\d{2}-\d{2}|ostern([+-]\d{1,2})?)$/, "MM-TT oder ostern±Tage") })).max(30),
  }),
  z.object({ art: z.literal("frist"), id: z.string().min(1).max(40), felder: z.object({ regel: z.string().trim().min(3).max(500), app: z.string().trim().min(3).max(500) }).partial() }),
  /** Fachliche Freigabe der Fassung (Status entwurf → aktiv) */
  z.object({ art: z.literal("status"), status: z.enum(["aktiv", "archiviert"]) }),
  /** Neue Fassung als Kopie, z. B. bei einer neuen Vergütungsvereinbarung */
  z.object({
    art: z.literal("neue_fassung"),
    neueId: z.string().regex(/^[a-z0-9-]{3,40}$/, "nur Kleinbuchstaben, Ziffern und Bindestrich"),
    name: z.string().trim().min(3).max(200),
    gueltigVon: z.iso.date(),
  }),
  z.object({
    art: z.literal("selbstzahler"),
    id: z.string().min(1).max(60),
    felder: z
      .object({ preis: z.number().min(0).max(5000), bezeichnung: z.string().trim().min(2).max(120), rechnungstext: z.string().trim().min(2).max(300), aktiv: z.boolean() })
      .partial(),
  }),
  /** Eigener Preis einer Hebamme für eine Selbstzahler-Leistung (null = Praxispreis) */
  z.object({ art: z.literal("selbstzahler_eigen"), id: z.string().min(1).max(60), hebammeId: z.string().uuid(), preis: z.number().min(0).max(5000).nullable() }),
  z.object({
    art: z.literal("selbstzahler_neu"),
    id: z.string().regex(/^[a-z0-9-]{3,60}$/, "nur Kleinbuchstaben, Ziffern und Bindestrich"),
    bezeichnung: z.string().trim().min(2).max(120),
    rechnungstext: z.string().trim().min(2).max(300),
    einheit: z.string().trim().min(1).max(40),
    preis: z.number().min(0).max(5000),
    umsatzsteuer: z.enum(UMSATZSTEUER),
  }),
]);
export type Operation = z.infer<typeof operationSchema>;

export const aenderungSchema = z
  .object({
    regelwerkId: z.preprocess(leerZuNull, z.string().nullable()).default(null),
    titel: z.string().trim().min(3, "Bitte kurz beschreiben, was geändert wird.").max(200),
    begruendung: z.string().trim().min(3, "Bitte eine Begründung bzw. Quelle angeben (z. B. Vertragsstelle).").max(2000),
    operationen: z.array(operationSchema).min(1).max(50),
  })
  .superRefine((a, ctx) => {
    const nurSelbstzahler = a.operationen.every((o) => o.art.startsWith("selbstzahler"));
    if (!nurSelbstzahler && !a.regelwerkId) ctx.addIssue({ code: "custom", path: ["regelwerkId"], message: "Regelwerk fehlt." });
  });
export type AenderungEingabe = z.infer<typeof aenderungSchema>;

export const STATUS_AENDERUNG = ["offen", "freigegeben", "abgelehnt", "zurueckgezogen"] as const;
export const STATUS_AENDERUNG_LABEL: Record<(typeof STATUS_AENDERUNG)[number], string> = {
  offen: "wartet auf Freigabe",
  freigegeben: "freigegeben",
  abgelehnt: "abgelehnt",
  zurueckgezogen: "zurückgezogen",
};

// ------------------------------------------------------------------ Anwenden
type Daten = RegelwerkDaten & Record<string, unknown>;
const kopie = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export class AenderungFehler extends Error {}

/** Aktuelle Werte der Felder, die eine Operation ändert (für Anzeige vorher/nachher und Konfliktprüfung). */
export function vorherWerte(daten: Daten | null, op: Operation, selbstzahler?: Record<string, Record<string, unknown>>): Record<string, unknown> {
  const auswahl = (quelle: Record<string, unknown> | undefined, felder: string[]) => Object.fromEntries(felder.map((f) => [f, quelle?.[f] ?? null]));
  switch (op.art) {
    case "position": {
      const p = daten?.positionen.find((x) => x.gpos === op.gpos) as Record<string, unknown> | undefined;
      if (!p) throw new AenderungFehler(`Position ${op.gpos} gibt es in diesem Regelwerk nicht.`);
      return auswahl(p, Object.keys(op.felder));
    }
    case "kontingent": {
      const k = daten?.kontingente.find((x) => x.id === op.id) as Record<string, unknown> | undefined;
      if (!k) throw new AenderungFehler(`Kontingent ${op.id} gibt es in diesem Regelwerk nicht.`);
      return auswahl(k, Object.keys(op.felder));
    }
    case "zuschlaege": {
      const z = daten!.zuschlaege;
      const flach: Record<string, unknown> = { nacht_von: z.nacht.von, nacht_bis: z.nacht.bis, samstag_ab: z.samstag_ab, sonntag: z.sonntag, feiertage: z.feiertage };
      return auswahl(flach, Object.keys(op.felder));
    }
    case "wegegeld":
      return auswahl(daten!.wegegeld as unknown as Record<string, unknown>, Object.keys(op.felder));
    case "feiertage":
      return { liste: daten!.feiertage };
    case "frist": {
      const f = (daten!.fristen_und_hinweise as Array<Record<string, unknown>> | undefined)?.find((x) => x.id === op.id);
      if (!f) throw new AenderungFehler(`Frist ${op.id} gibt es in diesem Regelwerk nicht.`);
      return auswahl(f, Object.keys(op.felder));
    }
    case "position_neu":
      if (daten?.positionen.some((x) => x.gpos === op.position.gpos)) throw new AenderungFehler(`Position ${op.position.gpos} gibt es schon.`);
      return {};
    case "kontingent_neu":
      if (daten?.kontingente.some((x) => x.id === op.kontingent.id)) throw new AenderungFehler(`Kontingent ${op.kontingent.id} gibt es schon.`);
      return {};
    case "selbstzahler_eigen": {
      if (!selbstzahler?.[op.id]) throw new AenderungFehler(`Selbstzahler-Leistung ${op.id} gibt es nicht.`);
      const eigene = (selbstzahler[op.id]!.eigenePreise ?? {}) as Record<string, unknown>;
      return { preis: eigene[op.hebammeId] ?? null };
    }
    case "status":
      return {};
    case "neue_fassung":
      return {};
    case "selbstzahler": {
      const s = selbstzahler?.[op.id];
      if (!s) throw new AenderungFehler(`Selbstzahler-Leistung ${op.id} gibt es nicht.`);
      return auswahl(s, Object.keys(op.felder));
    }
    case "selbstzahler_neu":
      if (selbstzahler?.[op.id]) throw new AenderungFehler(`Selbstzahler-Leistung ${op.id} gibt es schon.`);
      return {};
  }
}

/** Wendet die Regelwerk-Operationen auf eine Kopie der Daten an (Selbstzahler-, Status- und Fassungs-Operationen ändern die Daten nicht). */
export function operationenAnwenden<T extends Daten>(daten: T, ops: Operation[]): T {
  const d = kopie(daten);
  for (const op of ops) {
    switch (op.art) {
      case "position": {
        const p = d.positionen.find((x) => x.gpos === op.gpos) as unknown as Record<string, unknown> | undefined;
        if (!p) throw new AenderungFehler(`Position ${op.gpos} gibt es in diesem Regelwerk nicht.`);
        Object.assign(p, op.felder);
        break;
      }
      case "kontingent": {
        const k = d.kontingente.find((x) => x.id === op.id) as unknown as Record<string, unknown> | undefined;
        if (!k) throw new AenderungFehler(`Kontingent ${op.id} gibt es in diesem Regelwerk nicht.`);
        Object.assign(k, op.felder);
        break;
      }
      case "zuschlaege": {
        const f = op.felder;
        if (f.nacht_von) d.zuschlaege.nacht.von = f.nacht_von;
        if (f.nacht_bis) d.zuschlaege.nacht.bis = f.nacht_bis;
        if (f.samstag_ab) d.zuschlaege.samstag_ab = f.samstag_ab;
        if (f.sonntag !== undefined) d.zuschlaege.sonntag = f.sonntag;
        if (f.feiertage !== undefined) d.zuschlaege.feiertage = f.feiertage;
        break;
      }
      case "wegegeld":
        if (!d.wegegeld) throw new AenderungFehler("Im Regelwerk fehlen die Angaben zum Wegegeld.");
        Object.assign(d.wegegeld, op.felder);
        break;
      case "feiertage":
        d.feiertage = op.liste;
        break;
      case "position_neu": {
        if (d.positionen.some((x) => x.gpos === op.position.gpos)) throw new AenderungFehler(`Position ${op.position.gpos} gibt es schon.`);
        const g = op.position.gpos;
        (d.positionen as unknown as Array<Record<string, unknown>>).push({
          ...op.position,
          gruppe: `${g.slice(0, 3)}${g[3] === "1" ? "1" : "0"}X`,
          kategorie: Number(g[0]),
          zuschlag: g[3] === "1",
        });
        d.positionen.sort((a, b) => a.gpos.localeCompare(b.gpos));
        break;
      }
      case "kontingent_neu":
        if (d.kontingente.some((x) => x.id === op.kontingent.id)) throw new AenderungFehler(`Kontingent ${op.kontingent.id} gibt es schon.`);
        d.kontingente.push({ zeitraum: null, bezug: "Versicherte", ...op.kontingent } as unknown as (typeof d.kontingente)[number]);
        break;
      case "frist": {
        const f = (d.fristen_und_hinweise as Array<Record<string, unknown>> | undefined)?.find((x) => x.id === op.id);
        if (!f) throw new AenderungFehler(`Frist ${op.id} gibt es in diesem Regelwerk nicht.`);
        Object.assign(f, op.felder);
        break;
      }
      default:
        break;
    }
  }
  return d;
}

const wert = (v: unknown) => (v === null || v === undefined || v === "" ? "–" : typeof v === "boolean" ? (v ? "ja" : "nein") : typeof v === "number" ? v.toLocaleString("de-DE") : String(v));

/** Lesbare Beschreibung einer Operation mit Vorher-/Nachher-Werten. */
export function operationBeschreiben(op: Operation, vorher: Record<string, unknown> = {}): string[] {
  const felder = (f: Record<string, unknown>, label: (k: string) => string = (k) => k) =>
    Object.entries(f).map(([k, v]) => `${label(k)}: ${wert(vorher[k])} → ${wert(v)}`);
  switch (op.art) {
    case "position":
      return felder(op.felder, (k) => `GPOS ${op.gpos} ${k === "betrag" ? "Betrag (€)" : k}`);
    case "kontingent":
      return felder(op.felder, (k) => `Kontingent ${op.id}: ${KONTINGENT_LABEL[k as keyof typeof KONTINGENT_LABEL] ?? k}`);
    case "zuschlaege":
      return felder(op.felder, (k) => `Zuschlag ${k.replace("_", " ")}`);
    case "wegegeld":
      return felder(op.felder, (k) => `Wegegeld ${k.replace(/_/g, " ")}`);
    case "feiertage":
      return [`Feiertage: ${op.liste.map((f) => f.name).join(", ")}`];
    case "position_neu":
      return [`Neue Position ${op.position.gpos} „${op.position.bezeichnung}“: ${wert(op.position.betrag)} € ${op.position.einheit === "5min" ? "je 5 Min." : op.position.einheit}`];
    case "kontingent_neu":
      return [`Neues Kontingent ${op.kontingent.id} „${op.kontingent.name}“ für ${op.kontingent.positionen.join(", ")}`];
    case "selbstzahler_eigen":
      return [`Eigener Preis für ${op.id}: ${wert(vorher.preis ?? "Praxispreis")} → ${op.preis === null ? "Praxispreis" : `${wert(op.preis)} €`}`];
    case "frist":
      return felder(op.felder, (k) => `Frist ${op.id} ${k}`);
    case "status":
      return [op.status === "aktiv" ? "Fassung fachlich geprüft und freigegeben" : "Fassung archivieren"];
    case "neue_fassung":
      return [`Neue Fassung „${op.name}“ (${op.neueId}) gültig ab ${op.gueltigVon}`];
    case "selbstzahler":
      return felder(op.felder, (k) => `Selbstzahler ${op.id} ${k === "preis" ? "Preis (€)" : k}`);
    case "selbstzahler_neu":
      return [`Neue Selbstzahler-Leistung „${op.bezeichnung}“ für ${wert(op.preis)} € je ${op.einheit}`];
  }
}

/** Operationen, die nicht den Inhalt des Regelwerk-JSON ändern */
export const OHNE_REGELWERK_INHALT = new Set<Operation["art"]>(["status", "neue_fassung", "selbstzahler", "selbstzahler_neu", "selbstzahler_eigen"]);

/** Ist ein festgehaltener Vorher-Wert noch aktuell? */
export function gleich(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
