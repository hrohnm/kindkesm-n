/**
 * Zwei-Faktor-Anmeldung mit Einmalcodes aus einer Authenticator-App (TOTP nach RFC 6238: SHA-1, 30 s, 6 Ziffern)
 * und Wiederherstellungscodes für den Fall, dass das Handy verloren geht.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const SCHRITT = 30;

export function base32(daten: Buffer): string {
  let bits = 0;
  let wert = 0;
  let aus = "";
  for (const byte of daten) {
    wert = (wert << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      aus += ALPHABET[(wert >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) aus += ALPHABET[(wert << (5 - bits)) & 31];
  return aus;
}

export function base32Lesen(text: string): Buffer {
  const sauber = text.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let wert = 0;
  const bytes: number[] = [];
  for (const z of sauber) {
    const i = ALPHABET.indexOf(z);
    if (i < 0) throw new Error("Ungültiges Zeichen im Schlüssel");
    wert = (wert << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((wert >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Neues Geheimnis (160 Bit), Base32 wie von Authenticator-Apps erwartet */
export const totpGeheimnis = () => base32(randomBytes(20));

/** Code für einen Zeitschritt (Zähler) */
export function totpCode(geheimnis: string, schritt: number, stellen = 6): string {
  const zaehler = Buffer.alloc(8);
  zaehler.writeBigUInt64BE(BigInt(schritt));
  const h = createHmac("sha1", base32Lesen(geheimnis)).update(zaehler).digest();
  const versatz = h[h.length - 1]! & 15;
  const zahl = (h.readUInt32BE(versatz) & 0x7fffffff) % 10 ** stellen;
  return String(zahl).padStart(stellen, "0");
}

export const aktuellerSchritt = (jetzt = Date.now()) => Math.floor(jetzt / 1000 / SCHRITT);

/**
 * Prüft einen Code (±1 Zeitschritt Toleranz für ungenaue Uhren). Gibt den passenden Zeitschritt zurück,
 * damit derselbe Code nicht zweimal verwendet werden kann (letzterSchritt), sonst null.
 */
export function totpPruefen(geheimnis: string, code: string, letzterSchritt: number | null, jetzt = Date.now()): number | null {
  const eingabe = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(eingabe)) return null;
  const s = aktuellerSchritt(jetzt);
  for (const d of [0, -1, 1]) {
    const schritt = s + d;
    if (letzterSchritt !== null && schritt <= letzterSchritt) continue;
    const soll = Buffer.from(totpCode(geheimnis, schritt));
    if (timingSafeEqual(soll, Buffer.from(eingabe))) return schritt;
  }
  return null;
}

/** Adresse für den QR-Code der Authenticator-App */
export const totpUri = (geheimnis: string, konto: string) =>
  `otpauth://totp/${encodeURIComponent(`Kindkesmöön:${konto}`)}?secret=${geheimnis}&issuer=${encodeURIComponent("Kindkesmöön")}&algorithm=SHA1&digits=6&period=${SCHRITT}`;

// ------------------------------------------------------------ Wiederherstellungscodes
const codeHash = (code: string) => createHash("sha256").update(code.toUpperCase().replace(/[\s-]/g, "")).digest("hex");

/** 8 Codes im Format XXXX-XXXX (je 40 Bit); gespeichert werden nur die Hashes */
export function wiederherstellungscodes(anzahl = 8): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: anzahl }, () => {
    const t = base32(randomBytes(5));
    return `${t.slice(0, 4)}-${t.slice(4, 8)}`;
  });
  return { codes, hashes: codes.map(codeHash) };
}

/** Prüft einen Wiederherstellungscode; gibt die verbleibenden Hashes zurück (Code verbraucht) oder null */
export function wiederherstellungEinloesen(hashes: string[], code: string): string[] | null {
  const h = codeHash(code);
  return hashes.includes(h) ? hashes.filter((x) => x !== h) : null;
}

export const istWiederherstellungscode = (code: string) => /^[A-Z2-7]{4}-?[A-Z2-7]{4}$/i.test(code.trim());
