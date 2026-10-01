import type { Datenbank } from "./db/client";
import { protokoll } from "./db/schema";

export async function protokollieren(
  db: Datenbank,
  benutzerId: string | undefined,
  aktion: string,
  objekt: string,
  objektId?: string,
  details?: Record<string, unknown>,
) {
  await db.insert(protokoll).values({ benutzerId, aktion, objekt, objektId, details });
}
