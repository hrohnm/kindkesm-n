import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { and, eq, gt, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config";
import type { Datenbank } from "./db/client";
import { benutzer, sitzung } from "./db/schema";

export const SITZUNG_COOKIE = "kk_sitzung";

export type AngemeldeterBenutzer = {
  id: string;
  email: string;
  name: string;
  kuerzel: string;
  rolle: "hebamme" | "buero";
  status: "aktiv" | "babypause" | "ausgeschieden";
  /** Zwei-Faktor-Anmeldung eingerichtet */
  zweiFaktor: boolean;
};

declare module "fastify" {
  interface FastifyRequest {
    benutzer?: AngemeldeterBenutzer;
    /** SHA-256 des Sitzungs-Tokens der aktuellen Anfrage (für „dieses Gerät“) */
    sitzungId?: string;
  }
}

export const passwortHashen = (passwort: string) => hash(passwort);
export const passwortPruefen = (passwortHash: string, passwort: string) => verify(passwortHash, passwort);

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export function zufallsPasswort(): string {
  // 16 Zeichen aus einem gut lesbaren Alphabet (ohne 0/O/1/l)
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(16), (b) => alphabet[b % alphabet.length]).join("");
}

export async function sitzungAnlegen(db: Datenbank, benutzerId: string, userAgent?: string) {
  const token = randomBytes(32).toString("base64url");
  const laeuftAbAm = new Date(Date.now() + config.sitzungStunden * 3600_000);
  await db.insert(sitzung).values({ id: tokenHash(token), benutzerId, laeuftAbAm, userAgent: userAgent?.slice(0, 300) });
  await db.update(benutzer).set({ letzteAnmeldung: new Date() }).where(eq(benutzer.id, benutzerId));
  return { token, laeuftAbAm };
}

export async function sitzungLaden(db: Datenbank, token: string): Promise<AngemeldeterBenutzer | undefined> {
  const id = tokenHash(token);
  const [zeile] = await db
    .select({
      id: benutzer.id,
      email: benutzer.email,
      name: benutzer.name,
      kuerzel: benutzer.kuerzel,
      rolle: benutzer.rolle,
      status: benutzer.status,
      zweiFaktor: benutzer.totpAktiv,
      letzteAktivitaet: sitzung.letzteAktivitaet,
    })
    .from(sitzung)
    .innerJoin(benutzer, eq(benutzer.id, sitzung.benutzerId))
    .where(and(eq(sitzung.id, id), gt(sitzung.laeuftAbAm, sql`now()`), eq(benutzer.aktiv, true)));
  if (!zeile) return undefined;
  const { letzteAktivitaet, ...ich } = zeile;
  // Für die Geräteliste: höchstens alle 5 Minuten schreiben
  if (!letzteAktivitaet || Date.now() - letzteAktivitaet.getTime() > 5 * 60_000) {
    await db.update(sitzung).set({ letzteAktivitaet: new Date() }).where(eq(sitzung.id, id));
  }
  return ich;
}

export async function sitzungBeenden(db: Datenbank, token: string) {
  await db.delete(sitzung).where(eq(sitzung.id, tokenHash(token)));
}

export function cookieSetzen(reply: FastifyReply, token: string, laeuftAbAm: Date) {
  reply.setCookie(SITZUNG_COOKIE, token, {
    httpOnly: true,
    secure: config.produktion,
    sameSite: "strict",
    path: "/",
    expires: laeuftAbAm,
  });
}

export function nurHebamme(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (request.benutzer?.rolle !== "hebamme") {
    reply.code(403).send({ fehler: "Nur für Hebammen" });
    return;
  }
  done();
}
