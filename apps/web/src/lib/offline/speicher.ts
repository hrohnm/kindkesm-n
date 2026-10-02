/**
 * Verschlüsselter Gerätespeicher (IndexedDB + AES-GCM).
 *
 * Der Schlüssel wird im Browser erzeugt, ist nicht exportierbar und liegt nur als CryptoKey-Objekt in der
 * IndexedDB. Gespeicherte Datensätze sind damit für andere Programme auf dem Gerät nicht im Klartext lesbar.
 * Beim Abmelden wird die gesamte Datenbank samt Schlüssel gelöscht.
 */
const DB_NAME = "kindkes-offline";
export type Bereich = "cache" | "ausgang";

type Roh = { benutzer: string; zeit: number; iv: Uint8Array; daten: ArrayBuffer };
export type Datensatz<T> = { schluessel: string; benutzer: string; zeit: number; wert: T };

/** Ohne sicheren Kontext (HTTPS/localhost) gibt es keine Web-Crypto – dann wird nichts auf dem Gerät gespeichert. */
export const speicherVerfuegbar = typeof indexedDB !== "undefined" && typeof crypto !== "undefined" && Boolean(crypto.subtle);

let dbVersprechen: Promise<IDBDatabase> | null = null;
let schluesselVersprechen: Promise<CryptoKey> | null = null;

function anfrage<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((ok, fehler) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fehler(r.error);
  });
}

function oeffnen(): Promise<IDBDatabase> {
  dbVersprechen ??= new Promise((ok, fehler) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      for (const s of ["schluessel", "cache", "ausgang"]) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s);
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => {
      dbVersprechen = null;
      fehler(r.error);
    };
  });
  return dbVersprechen;
}

async function store(name: string, modus: IDBTransactionMode) {
  return (await oeffnen()).transaction(name, modus).objectStore(name);
}

function schluessel(): Promise<CryptoKey> {
  schluesselVersprechen ??= (async () => {
    const vorhanden = (await anfrage((await store("schluessel", "readonly")).get("aes"))) as CryptoKey | undefined;
    if (vorhanden) return vorhanden;
    const neu = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    await anfrage((await store("schluessel", "readwrite")).put(neu, "aes"));
    return neu;
  })().catch((e) => {
    schluesselVersprechen = null;
    throw e;
  });
  return schluesselVersprechen;
}

const kodierer = new TextEncoder();
const dekodierer = new TextDecoder();

export async function schreiben(bereich: Bereich, key: string, benutzer: string, wert: unknown) {
  if (!speicherVerfuegbar) return;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const daten = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await schluessel(), kodierer.encode(JSON.stringify(wert)));
  const roh: Roh = { benutzer, zeit: Date.now(), iv, daten };
  await anfrage((await store(bereich, "readwrite")).put(roh, key));
}

async function entschluesseln<T>(roh: Roh): Promise<T> {
  const klar = await crypto.subtle.decrypt({ name: "AES-GCM", iv: roh.iv as Uint8Array<ArrayBuffer> }, await schluessel(), roh.daten);
  return JSON.parse(dekodierer.decode(klar)) as T;
}

export async function lesen<T>(bereich: Bereich, key: string): Promise<Datensatz<T> | undefined> {
  if (!speicherVerfuegbar) return undefined;
  try {
    const roh = (await anfrage((await store(bereich, "readonly")).get(key))) as Roh | undefined;
    if (!roh) return undefined;
    return { schluessel: key, benutzer: roh.benutzer, zeit: roh.zeit, wert: await entschluesseln<T>(roh) };
  } catch {
    return undefined; // z. B. Schlüssel verloren: Datensatz unbrauchbar
  }
}

export async function alle<T>(bereich: Bereich, benutzer?: string): Promise<Datensatz<T>[]> {
  if (!speicherVerfuegbar) return [];
  const s = await store(bereich, "readonly");
  const [keys, werte] = await Promise.all([anfrage(s.getAllKeys()), anfrage(s.getAll() as IDBRequest<Roh[]>)]);
  const liste: Datensatz<T>[] = [];
  for (let i = 0; i < keys.length; i++) {
    const roh = werte[i]!;
    if (benutzer && roh.benutzer !== benutzer) continue;
    try {
      liste.push({ schluessel: String(keys[i]), benutzer: roh.benutzer, zeit: roh.zeit, wert: await entschluesseln<T>(roh) });
    } catch {
      /* unlesbar – überspringen */
    }
  }
  return liste;
}

export async function entfernen(bereich: Bereich, key: string) {
  if (!speicherVerfuegbar) return;
  await anfrage((await store(bereich, "readwrite")).delete(key));
}

/** Löscht Datensätze, die älter als `maxAlterMs` sind oder einem anderen Benutzer gehören (nur Lesecache). */
export async function cacheAufraeumen(benutzer: string, maxAlterMs: number) {
  if (!speicherVerfuegbar) return;
  const s = await store("cache", "readwrite");
  const grenze = Date.now() - maxAlterMs;
  await new Promise<void>((ok, fehler) => {
    const r = s.openCursor();
    r.onsuccess = () => {
      const c = r.result;
      if (!c) return ok();
      const roh = c.value as Roh;
      if (roh.benutzer !== benutzer || roh.zeit < grenze) c.delete();
      c.continue();
    };
    r.onerror = () => fehler(r.error);
  });
}

/** Alles löschen (Abmelden): Daten, Warteschlange und Schlüssel. */
export async function geraetLoeschen() {
  if (!speicherVerfuegbar) return;
  const db = await dbVersprechen?.catch(() => null);
  db?.close();
  dbVersprechen = null;
  schluesselVersprechen = null;
  await new Promise<void>((ok) => {
    const r = indexedDB.deleteDatabase(DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => ok();
  });
}
