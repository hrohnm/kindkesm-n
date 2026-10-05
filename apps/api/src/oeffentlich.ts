import type { FastifyInstance } from "fastify";
import { config } from "./config";

/**
 * Öffentliche Schnittstellen (/api/oeffentlich/…) für die Praxis-Website: Der Browser darf sie nur
 * von den freigegebenen Website-Adressen (WEBSITE_URL) aus abrufen. Antworten enthalten keine Personendaten.
 */
export function oeffentlicheSchnittstellen(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/api/oeffentlich/")) return;
    const herkunft = request.headers.origin;
    if (herkunft && config.websiteUrls.includes(herkunft)) {
      reply.header("Access-Control-Allow-Origin", herkunft).header("Vary", "Origin");
    }
  });
  // Preflight für POST mit JSON (Kursanmeldung, Betreuungsanfrage)
  app.options("/api/oeffentlich/*", async (_request, reply) =>
    reply.header("Access-Control-Allow-Methods", "GET, POST").header("Access-Control-Allow-Headers", "Content-Type").header("Access-Control-Max-Age", "86400").code(204).send(),
  );
}
