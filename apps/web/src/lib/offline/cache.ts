/** Lesecache für API-Antworten, die unterwegs gebraucht werden (je Person, verschlüsselt, höchstens 14 Tage alt). */
import { cacheAufraeumen, lesen, schreiben } from "./speicher";
import { aktuellerBenutzer } from "./zustand";

export const CACHE_MAX_ALTER = 14 * 24 * 60 * 60 * 1000;

/** Nur was für Hausbesuche unterwegs nötig ist – keine Abrechnungs-, Team- oder Regelwerksverwaltung. */
const ZWISCHENSPEICHERN = [
  /^\/api\/heute$/,
  /^\/api\/team$/,
  /^\/api\/hinweise(\?.*)?$/,
  /^\/api\/touren\/\d{4}-\d{2}-\d{2}$/,
  /^\/api\/klientinnen(\?.*)?$/,
  /^\/api\/klientinnen\/[\w-]+$/,
  /^\/api\/betreuungen\/[\w-]+$/,
  /^\/api\/betreuungen\/[\w-]+\/(besuche|abrechnungskontext|kontingente)$/,
  /^\/api\/besuche\/[\w-]+$/,
  /^\/api\/kinder\/[\w-]+\/gewicht$/,
  /^\/api\/material\?.*$/,
  /^\/api\/regelwerk-fuer\?.*$/,
  /^\/api\/ich\/(ansicht|abrechnung)$/,
];

export const zwischenspeicherbar = (pfad: string) => ZWISCHENSPEICHERN.some((r) => r.test(pfad));
const key = (benutzer: string, pfad: string) => `${benutzer}|${pfad}`;

export async function cacheSchreiben(pfad: string, daten: unknown) {
  const b = aktuellerBenutzer();
  if (!b || !zwischenspeicherbar(pfad)) return;
  await schreiben("cache", key(b, pfad), b, daten).catch(() => {});
}

export async function cacheLesen<T>(pfad: string): Promise<{ daten: T; zeit: number } | undefined> {
  const b = aktuellerBenutzer();
  if (!b || !zwischenspeicherbar(pfad)) return undefined;
  const d = await lesen<T>("cache", key(b, pfad));
  if (!d || d.benutzer !== b || Date.now() - d.zeit > CACHE_MAX_ALTER) return undefined;
  return { daten: d.wert, zeit: d.zeit };
}

export const cachePflegen = (benutzer: string) => cacheAufraeumen(benutzer, CACHE_MAX_ALTER).catch(() => {});
