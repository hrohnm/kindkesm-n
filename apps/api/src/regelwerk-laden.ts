import type { RegelwerkDaten } from "@kindkesmoeoen/shared";
import { and, desc, gte, isNull, lte, or } from "drizzle-orm";
import type { Datenbank } from "./db/client";
import { regelwerk } from "./db/schema";

/** Regelwerk, das am Leistungsdatum gilt (Fassungen nach Gültigkeitszeitraum). */
export async function regelwerkFuer(db: Datenbank, datum: string): Promise<RegelwerkDaten | undefined> {
  const [r] = await db
    .select({ daten: regelwerk.daten })
    .from(regelwerk)
    .where(and(lte(regelwerk.gueltigVon, datum), or(isNull(regelwerk.gueltigBis), gte(regelwerk.gueltigBis, datum))))
    .orderBy(desc(regelwerk.gueltigVon))
    .limit(1);
  return r?.daten as RegelwerkDaten | undefined;
}
