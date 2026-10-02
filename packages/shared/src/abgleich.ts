/**
 * Offline-Abgleich: Dreiwege-Zusammenführung eines Besuchs (Ausgangsfassung, Fassung dieses Geräts, Fassung des Servers).
 * Felder, die nur auf einer Seite geändert wurden, werden übernommen; nur echte Konflikte (dasselbe Feld auf beiden
 * Seiten unterschiedlich geändert) muss die Hebamme entscheiden.
 */
export type KonfliktFeld = { feld: string; mein: string; anderes: string };

const LEISTUNG = ["datum", "von", "bis", "typ", "art", "material", "unterschrift"] as const;
/** JSON mit sortierten Schlüsseln, damit gleiche Objekte gleich verglichen werden */
const stabil = (v: unknown): string =>
  v && typeof v === "object" && !Array.isArray(v)
    ? `{${Object.keys(v)
        .sort()
        .map((k) => `${JSON.stringify(k)}:${stabil((v as Record<string, unknown>)[k])}`)
        .join(",")}}`
    : JSON.stringify(v ?? null);
const text = (v: unknown) => (v === null || v === undefined ? "" : String(v));

type Doku = { mutter?: Record<string, unknown>; kinder?: Record<string, Record<string, unknown>>; notiz?: unknown };
function flach(b: Record<string, unknown>): Record<string, string> {
  const r: Record<string, string> = {};
  for (const k of LEISTUNG) r[k] = stabil(b[k]);
  const d = (b.dokumentation ?? {}) as Doku;
  r.notiz = JSON.stringify(text(d.notiz));
  for (const [f, v] of Object.entries(d.mutter ?? {})) r[`mutter.${f}`] = JSON.stringify(text(v));
  for (const [kind, felder] of Object.entries(d.kinder ?? {})) for (const [f, v] of Object.entries(felder ?? {})) r[`kinder.${kind}.${f}`] = JSON.stringify(text(v));
  return r;
}

function aufbauen(f: Record<string, string>, vorlage: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = { ...vorlage };
  const dok: { mutter: Record<string, string>; kinder: Record<string, Record<string, string>>; notiz: string } = { mutter: {}, kinder: {}, notiz: "" };
  for (const [k, v] of Object.entries(f)) {
    const wert = JSON.parse(v) as unknown;
    if ((LEISTUNG as readonly string[]).includes(k)) body[k] = wert;
    else if (k === "notiz") dok.notiz = wert as string;
    else if (k.startsWith("mutter.")) dok.mutter[k.slice(7)] = wert as string;
    else if (k.startsWith("kinder.")) {
      const [, kind, feld] = k.split(".");
      (dok.kinder[kind!] ??= {})[feld!] = wert as string;
    }
  }
  body.dokumentation = dok;
  return body;
}

const leer = new Set(['""', "null"]);
/** Dreiwege-Zusammenführung: Ausgangsfassung, eigene Fassung, Fassung des Servers. */
export function zusammenfuehren(basis: Record<string, unknown> | null, mein: Record<string, unknown>, server: Record<string, unknown>) {
  const b = basis ? flach(basis) : {};
  const m = flach(mein);
  const s = flach(server);
  const ergebnis: Record<string, string> = {};
  const konflikte: KonfliktFeld[] = [];
  for (const k of new Set([...Object.keys(m), ...Object.keys(s)])) {
    const mv = m[k] ?? '""';
    const sv = s[k] ?? '""';
    const bv = b[k] ?? '""';
    const gleich = (x: string, y: string) => x === y || (leer.has(x) && leer.has(y));
    if (gleich(mv, sv) || gleich(sv, bv)) ergebnis[k] = mv;
    else if (gleich(mv, bv)) ergebnis[k] = sv;
    else {
      ergebnis[k] = mv;
      konflikte.push({ feld: k, mein: lesbar(mv), anderes: lesbar(sv) });
    }
  }
  const body = aufbauen(ergebnis, mein);
  body.abschliessen = Boolean(mein.abschliessen) || server.status === "abgeschlossen";
  return { body, konflikte };
}

function lesbar(json: string): string {
  const v = JSON.parse(json) as unknown;
  if (v === null || v === "") return "–";
  if (typeof v === "object") return (v as { art?: string }).art ? `Unterschrift: ${(v as { art: string }).art}` : JSON.stringify(v);
  return String(v);
}
