/**
 * App-Sperre (M25): Nach einer einstellbaren Zeit ohne Bedienung verdeckt die App ihren Inhalt, bis das Passwort
 * erneut eingegeben wird. Mit Verbindung prüft der Server das Passwort; ohne Verbindung ein auf dem Gerät
 * gespeicherter, gesalzener PBKDF2-Wert (wird bei jeder Anmeldung bzw. Entsperrung erneuert, beim Abmelden gelöscht).
 */
const PRUEF_KEY = "kk:sperre-pruefwert";
const AKTIV_KEY = "kk:zuletzt-aktiv";
const RUNDEN = 210_000;

function lesen(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function schreiben(key: string, wert: string | null) {
  try {
    if (wert === null) localStorage.removeItem(key);
    else localStorage.setItem(key, wert);
  } catch {
    /* privat-Modus */
  }
}

const hex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
const bytes = (h: string) => new Uint8Array(h.match(/../g)!.map((x) => parseInt(x, 16)));

async function ableiten(passwort: string, salz: Uint8Array) {
  const roh = await crypto.subtle.importKey("raw", new TextEncoder().encode(passwort), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salz as BufferSource, iterations: RUNDEN }, roh, 256));
}

/** Prüfwert für das Entsperren ohne Verbindung merken (nach erfolgreicher Anmeldung/Entsperrung) */
export async function pruefwertMerken(passwort: string, benutzerId: string) {
  if (!crypto?.subtle) return;
  const salz = crypto.getRandomValues(new Uint8Array(16));
  schreiben(PRUEF_KEY, JSON.stringify({ benutzerId, salz: hex(salz), wert: await ableiten(passwort, salz) }));
}

/** Passwort gegen den gemerkten Prüfwert prüfen (ohne Verbindung); null = kein Prüfwert vorhanden */
export async function pruefwertPruefen(passwort: string, benutzerId: string): Promise<boolean | null> {
  try {
    const p = JSON.parse(lesen(PRUEF_KEY) ?? "null") as { benutzerId: string; salz: string; wert: string } | null;
    if (!p || p.benutzerId !== benutzerId) return null;
    return (await ableiten(passwort, bytes(p.salz))) === p.wert;
  } catch {
    return null;
  }
}

export function sperreVergessen() {
  schreiben(PRUEF_KEY, null);
  schreiben(AKTIV_KEY, null);
}

/** Zeitpunkt der letzten Bedienung – auch über Neuladen und mehrere Tabs hinweg */
export const zuletztAktiv = () => Number(lesen(AKTIV_KEY)) || Date.now();
export const aktivMerken = (zeit = Date.now()) => schreiben(AKTIV_KEY, String(zeit));
