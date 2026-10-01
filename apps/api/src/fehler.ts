import type { FastifyReply } from "fastify";
import { z } from "zod";

/** Validiert einen Request-Body und antwortet bei Fehlern mit 400 und feldgenauen Meldungen. */
export function pruefen<T extends z.ZodType>(schema: T, daten: unknown, reply: FastifyReply): z.infer<T> | undefined {
  const ergebnis = schema.safeParse(daten);
  if (!ergebnis.success) {
    const felder: Record<string, string> = {};
    for (const issue of ergebnis.error.issues) felder[issue.path.join(".") || "_"] ??= issue.message;
    reply.code(400).send({ fehler: "Eingaben prüfen", felder });
    return undefined;
  }
  return ergebnis.data;
}
