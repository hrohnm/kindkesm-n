/**
 * Warteschlange für Änderungen ohne Verbindung (Besuche dokumentieren).
 * Je Besuch gibt es höchstens einen Eintrag; er wird bei erneutem Speichern ersetzt.
 * Beim Abgleich werden Änderungen eines anderen Geräts feldweise zusammengeführt; nur wenn dasselbe Feld
 * auf beiden Geräten unterschiedlich geändert wurde, entscheidet die Hebamme.
 */
import { zusammenfuehren, type KonfliktFeld } from "@kindkesmoeoen/shared";
import { alle, entfernen, lesen, schreiben } from "./speicher";
import { aktuellerBenutzer, zustandSetzen } from "./zustand";

export type AusgangEintrag = {
  /** Kennung des Besuchs (bei neuen Besuchen auf dem Gerät vergeben) */
  id: string;
  methode: "POST" | "PUT";
  pfad: string;
  body: Record<string, unknown>;
  /** Fassung vor der Änderung (Grundlage für das Zusammenführen) */
  basis: Record<string, unknown> | null;
  titel: string;
  betreuungId: string;
  terminId: string | null;
  erstellt: number;
  status: "wartet" | "fehler" | "konflikt";
  fehler?: string;
  aktuell?: Record<string, unknown>;
  konfliktFelder?: KonfliktFeld[];
};
export type OfflineAuftrag = Pick<AusgangEintrag, "id" | "titel" | "betreuungId" | "terminId" | "basis">;

export async function eigeneEintraege(): Promise<AusgangEintrag[]> {
  const b = aktuellerBenutzer();
  if (!b) return [];
  return (await alle<AusgangEintrag>("ausgang", b)).map((d) => d.wert).sort((a, c) => a.erstellt - c.erstellt);
}

export async function eintragLesen(id: string): Promise<AusgangEintrag | undefined> {
  const b = aktuellerBenutzer();
  const d = await lesen<AusgangEintrag>("ausgang", id);
  return d && d.benutzer === b ? d.wert : undefined;
}

async function eintragSchreiben(e: AusgangEintrag) {
  await schreiben("ausgang", e.id, aktuellerBenutzer()!, e);
}

export async function zaehlen() {
  const liste = await eigeneEintraege().catch(() => []);
  zustandSetzen({
    ausstehend: liste.length,
    konflikte: liste.filter((e) => e.status === "konflikt").length,
    fehler: liste.filter((e) => e.status === "fehler").length,
  });
  window.dispatchEvent(new Event("kk:ausgang"));
}

export async function einreihen(auftrag: OfflineAuftrag, methode: "POST" | "PUT", pfad: string, body: Record<string, unknown>) {
  if (!aktuellerBenutzer()) throw new Error("Nicht angemeldet");
  const alt = await eintragLesen(auftrag.id);
  await eintragSchreiben({
    ...auftrag,
    // Ein offline neu angelegter Besuch bleibt ein POST; Stand und Ausgangsfassung bleiben die der ersten Änderung
    methode: alt?.methode ?? methode,
    pfad: alt?.pfad ?? pfad,
    body: { ...body, ...(alt?.body.stand ? { stand: alt.body.stand } : {}) },
    basis: alt ? alt.basis : auftrag.basis,
    erstellt: alt?.erstellt ?? Date.now(),
    status: "wartet",
  });
  await zaehlen();
}

export async function verwerfen(id: string) {
  await entfernen("ausgang", id);
  await zaehlen();
}

export async function erneutVersuchen(id: string) {
  const e = await eintragLesen(id);
  if (!e) return;
  await eintragSchreiben({ ...e, status: "wartet", fehler: undefined });
  await zaehlen();
  void abgleichen();
}

/** Konflikt: die eigene Fassung gewinnt (wird auf den aktuellen Stand des Servers gesetzt). */
export async function eigeneFassungUebernehmen(id: string) {
  const e = await eintragLesen(id);
  if (!e?.aktuell) return;
  await eintragSchreiben({ ...e, body: { ...e.body, stand: e.aktuell.geaendertAm }, status: "wartet", aktuell: undefined, konfliktFelder: undefined });
  await zaehlen();
  void abgleichen();
}

// ------------------------------------------------------------------ Abgleich
let laufend: Promise<number> | null = null;

/** Überträgt wartende Einträge der Reihe nach. Gibt die Zahl erfolgreich übertragener Einträge zurück. */
export function abgleichen(): Promise<number> {
  laufend ??= abgleichDurchfuehren().finally(() => {
    laufend = null;
  });
  return laufend;
}

async function senden(e: AusgangEintrag) {
  const res = await fetch(e.pfad, {
    method: e.methode,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(e.body),
    signal: AbortSignal.timeout(30_000),
  });
  const t = await res.text();
  let daten: Record<string, unknown> = {};
  try {
    daten = t ? JSON.parse(t) : {};
  } catch {
    /* keine JSON-Antwort */
  }
  return { status: res.status, ok: res.ok, daten };
}

async function abgleichDurchfuehren(): Promise<number> {
  if (!aktuellerBenutzer()) return 0;
  const liste = (await eigeneEintraege().catch(() => [])).filter((e) => e.status === "wartet");
  if (!liste.length) {
    await zaehlen();
    return 0;
  }
  zustandSetzen({ synchronisiert: true });
  let uebertragen = 0;
  try {
    for (let e of liste) {
      let r;
      try {
        r = await senden(e);
      } catch {
        zustandSetzen({ verbunden: false });
        break; // keine Verbindung: später erneut
      }
      zustandSetzen({ verbunden: true });
      if (r.status === 409 && r.daten.konflikt && r.daten.aktuell) {
        const aktuell = r.daten.aktuell as Record<string, unknown>;
        const z = zusammenfuehren(e.basis, e.body, aktuell);
        if (!z.konflikte.length) {
          // Änderungen betreffen verschiedene Felder: zusammengeführt erneut senden
          e = { ...e, body: { ...z.body, stand: aktuell.geaendertAm } };
          try {
            r = await senden(e);
          } catch {
            await eintragSchreiben(e);
            break;
          }
        } else {
          await eintragSchreiben({ ...e, status: "konflikt", aktuell, konfliktFelder: z.konflikte });
          continue;
        }
      }
      if (r.ok) {
        await entfernen("ausgang", e.id);
        uebertragen++;
      } else if (r.status === 401) {
        window.dispatchEvent(new Event("kk:abgemeldet"));
        break;
      } else if (r.status >= 500) {
        break; // Server gerade gestört: später erneut
      } else {
        await eintragSchreiben({ ...e, status: "fehler", fehler: String(r.daten.fehler ?? `Fehler ${r.status}`) });
      }
    }
  } finally {
    zustandSetzen({ synchronisiert: false });
    await zaehlen();
  }
  if (uebertragen) window.dispatchEvent(new Event("kk:synchronisiert"));
  return uebertragen;
}
