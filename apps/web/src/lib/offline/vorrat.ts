/**
 * „Für unterwegs laden“: legt alles, was für die Tour heute und morgen gebraucht wird, verschlüsselt auf dem Gerät ab.
 * Läuft auch automatisch (beim Start und höchstens stündlich), solange Verbindung besteht.
 */
import { isoDatum } from "@kindkesmoeoen/shared";
import { api } from "../api";
import { aktuellerBenutzer, offlineZustand } from "./zustand";

type TourTag = { termine: Array<{ status: string; typ: string; betreuungId: string; besuchId: string | null; klientin: { klientinId: string } }> };
type BetreuungDetail = { kinder: Array<{ id: string }> };

const merkKey = () => `kk:vorrat:${aktuellerBenutzer()}`;
export function letzterVorrat(): { zeit: number; anzahl: number } | null {
  try {
    return JSON.parse(localStorage.getItem(merkKey()) ?? "null");
  } catch {
    return null;
  }
}

async function parallel<T>(liste: T[], n: number, f: (x: T) => Promise<unknown>) {
  let i = 0;
  let fehler = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, liste.length) }, async () => {
      while (i < liste.length) {
        const x = liste[i++]!;
        await f(x).catch(() => fehler++);
      }
    }),
  );
  return fehler;
}

let laufend: Promise<{ anzahl: number; fehler: number }> | null = null;

export function fuerUnterwegsLaden(): Promise<{ anzahl: number; fehler: number }> {
  laufend ??= laden().finally(() => {
    laufend = null;
  });
  return laufend;
}

async function laden() {
  const heute = new Date();
  const morgen = new Date(heute.getTime() + 86_400_000);
  const tage = [isoDatum(heute), isoDatum(morgen)];
  const geladen = new Set<string>();
  const holen = async <T,>(pfad: string) => {
    geladen.add(pfad);
    return api<T>(pfad);
  };

  const grund = ["/api/heute", "/api/hinweise", "/api/team", "/api/ich/ansicht", "/api/ich/abrechnung", "/api/klientinnen?nur=meine", ...tage.map((t) => `/api/regelwerk-fuer?datum=${t}`)];
  let fehler = await parallel(grund, 4, (p) => holen(p));
  // Ohne Verbindung kämen die Antworten nur aus dem Gerätespeicher – das wäre kein neuer Stand
  if (!offlineZustand().verbunden) throw new Error("Keine Verbindung – „Für unterwegs laden“ ist nur mit Verbindung möglich.");

  const touren = await Promise.all(tage.map((t) => holen<TourTag>(`/api/touren/${t}`).then((x) => ({ tag: t, x }), () => null)));
  const betreuungen = new Set<string>();
  const weitere = new Set<string>();
  for (const t of touren) {
    if (!t) {
      fehler++;
      continue;
    }
    for (const termin of t.x.termine.filter((x) => x.status !== "abgesagt")) {
      betreuungen.add(termin.betreuungId);
      weitere.add(`/api/klientinnen/${termin.klientin.klientinId}`);
      weitere.add(`/api/material?datum=${t.tag}&typ=${termin.typ}`);
      if (termin.besuchId) weitere.add(`/api/besuche/${termin.besuchId}`);
    }
  }
  for (const b of betreuungen) for (const teil of ["", "/besuche", "/abrechnungskontext", "/kontingente"]) weitere.add(`/api/betreuungen/${b}${teil}`);
  fehler += await parallel([...weitere], 4, (p) => holen(p));

  // Gewichtsverläufe der Kinder (für die Perzentilkurve im Besuch)
  const kinder: string[] = [];
  for (const b of betreuungen) {
    try {
      const d = await api<BetreuungDetail>(`/api/betreuungen/${b}`); // kommt notfalls aus dem gerade gefüllten Speicher
      kinder.push(...d.kinder.map((k) => `/api/kinder/${k.id}/gewicht`));
    } catch {
      /* oben schon gezählt */
    }
  }
  fehler += await parallel(kinder, 4, (p) => holen(p));

  const ergebnis = { anzahl: geladen.size - fehler, fehler };
  try {
    localStorage.setItem(merkKey(), JSON.stringify({ zeit: Date.now(), anzahl: ergebnis.anzahl }));
  } catch {
    /* privat-Modus */
  }
  window.dispatchEvent(new Event("kk:vorrat"));
  return ergebnis;
}
