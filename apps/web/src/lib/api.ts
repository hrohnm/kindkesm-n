/**
 * Schlanker Fetch-Wrapper für die API (Cookie-Sitzung, JSON, Fehler mit Feldmeldungen).
 * Offline: Lesezugriffe kommen aus dem Gerätespeicher, freigegebene Änderungen (Besuche) in die Warteschlange.
 */
import { abgleichen, einreihen, type OfflineAuftrag } from "./offline/ausgang";
import { cacheLesen, cacheSchreiben } from "./offline/cache";
import { offlineZustand, zustandSetzen } from "./offline/zustand";

export class ApiFehler extends Error {
  constructor(
    /** 0 = keine Verbindung zum Server */
    public status: number,
    message: string,
    public felder: Record<string, string> = {},
  ) {
    super(message);
  }
}

export const istOffline = (e: unknown) => e instanceof ApiFehler && e.status === 0;
export type OfflineErgebnis = { offline: true };
export const wurdeEingereiht = (r: unknown): r is OfflineErgebnis => Boolean(r && typeof r === "object" && (r as OfflineErgebnis).offline === true);

function verbindungDa() {
  const vorher = offlineZustand().verbunden;
  zustandSetzen({ verbunden: true, cacheStand: null });
  if (!vorher) void abgleichen();
}

export async function api<T = unknown>(pfad: string, opts: { method?: string; body?: unknown; offline?: OfflineAuftrag } = {}): Promise<T> {
  const methode = opts.method ?? "GET";
  // Keine Verbindung (oder Zeitüberschreitung, oder der Server hinter dem Proxy ist nicht erreichbar)
  const ohneVerbindung = async (): Promise<T> => {
    zustandSetzen({ verbunden: false });
    if (methode === "GET") {
      const c = await cacheLesen<T>(pfad);
      if (c) {
        const alt = offlineZustand().cacheStand;
        zustandSetzen({ cacheStand: alt === null ? c.zeit : Math.min(alt, c.zeit) });
        return c.daten;
      }
      throw new ApiFehler(0, "Keine Verbindung – diese Daten sind auf dem Gerät nicht gespeichert. Tipp: vor der Tour „Für unterwegs laden“ (Einstellungen → Offline).");
    }
    if (opts.offline && (methode === "POST" || methode === "PUT")) {
      await einreihen(opts.offline, methode, pfad, opts.body as Record<string, unknown>);
      return { offline: true } as T;
    }
    throw new ApiFehler(0, "Keine Verbindung – das ist nur mit Verbindung möglich.");
  };
  let res: Response;
  try {
    res = await fetch(pfad, {
      method: methode,
      credentials: "same-origin",
      headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(methode === "GET" ? 15_000 : 30_000),
    });
  } catch {
    return ohneVerbindung();
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) return ohneVerbindung();
  verbindungDa();
  const text = await res.text();
  let daten: { fehler?: string; felder?: Record<string, string> } | null = null;
  try {
    daten = text ? JSON.parse(text) : null;
  } catch {
    if (!res.ok) daten = null;
    else throw new ApiFehler(res.status, "Unerwartete Antwort vom Server");
  }
  if (!res.ok) {
    if (res.status === 401 && !pfad.endsWith("/anmelden")) window.dispatchEvent(new Event("kk:abgemeldet"));
    const meldung = res.status === 429 ? "Zu viele Versuche in kurzer Zeit. Bitte einige Minuten warten und dann erneut versuchen." : `Fehler ${res.status}`;
    throw new ApiFehler(res.status, daten?.fehler ?? meldung, daten?.felder ?? {});
  }
  if (methode === "GET") void cacheSchreiben(pfad, daten);
  return daten as T;
}
