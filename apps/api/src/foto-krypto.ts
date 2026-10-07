/**
 * M17: Fotos werden mit AES-256-GCM verschlüsselt in der Datenbank gespeichert (Schlüssel aus FOTO_SCHLUESSEL).
 * So liegen sie weder im Dateisystem noch in der Galerie des Geräts, und ein Datenbank-Backup allein zeigt keine Bilder.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { config } from "./config";

let schluessel: Buffer | null | undefined;

/** Schlüssel (32 Byte) oder null, wenn im Betrieb keiner hinterlegt ist */
export function fotoSchluessel(): Buffer | null {
  if (schluessel !== undefined) return schluessel;
  if (config.fotoSchluessel) {
    const k = Buffer.from(config.fotoSchluessel, "base64");
    if (k.length !== 32) throw new Error("FOTO_SCHLUESSEL muss 32 Byte (Base64) lang sein – z. B. `openssl rand -base64 32`.");
    schluessel = k;
  } else {
    // Nur Entwicklung/Test: fester Schlüssel, damit Demo-Fotos funktionieren
    schluessel = config.produktion ? null : createHash("sha256").update("kindkesmoeoen-entwicklung-fotos").digest();
  }
  return schluessel;
}

/** Verschlüsselt: 12 Byte IV + 16 Byte Tag + Chiffrat */
export function fotoVerschluesseln(daten: Buffer): Buffer {
  const k = fotoSchluessel();
  if (!k) throw new Error("Kein Fotoschlüssel");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const chiffrat = Buffer.concat([c.update(daten), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), chiffrat]);
}

export function fotoEntschluesseln(paket: Buffer): Buffer {
  const k = fotoSchluessel();
  if (!k) throw new Error("Kein Fotoschlüssel");
  const d = createDecipheriv("aes-256-gcm", k, paket.subarray(0, 12));
  d.setAuthTag(paket.subarray(12, 28));
  return Buffer.concat([d.update(paket.subarray(28)), d.final()]);
}
