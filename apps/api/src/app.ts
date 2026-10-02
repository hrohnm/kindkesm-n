import { existsSync } from "node:fs";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { SITZUNG_COOKIE, sitzungLaden } from "./auth";
import { config } from "./config";
import type { Datenbank } from "./db/client";
import { benutzer } from "./db/schema";
import { DEMO_EMAILS, DEMO_PASSWORT } from "./demo";
import { inArray } from "drizzle-orm";
import { abrechnungRouten } from "./routes/abrechnung";
import { aenderungRouten } from "./routes/aenderungen";
import { akteRouten } from "./routes/akte";
import { urkundeRouten } from "./routes/urkunde";
import { authRouten } from "./routes/auth";
import { hinweisRouten } from "./routes/hinweise";
import { ichRouten } from "./routes/ich";
import { praxisRouten } from "./routes/praxis";
import { regelwerkRouten } from "./routes/regelwerk";
import { teamRouten } from "./routes/team";
import { tourenRouten } from "./routes/touren";

const OEFFENTLICH = new Set(["/api/auth/anmelden", "/api/gesundheit", "/api/demo"]);

export async function appBauen(db: Datenbank, opts: { logger?: boolean } = {}) {
  const app = Fastify({ logger: opts.logger ?? false, trustProxy: true, bodyLimit: 2_000_000 });

  await app.register(cookie);
  await app.register(rateLimit, { global: false });

  // Sicherheits-Header (Caddy ergänzt HSTS)
  app.addHook("onSend", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "same-origin");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Permissions-Policy", "geolocation=(self), camera=(self), microphone=()");
  });

  // Anmeldung prüfen für alle API-Routen außer den öffentlichen
  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/api/")) return;
    const pfad = request.url.split("?")[0]!;
    const token = request.cookies[SITZUNG_COOKIE];
    if (token) request.benutzer = await sitzungLaden(db, token);
    if (!OEFFENTLICH.has(pfad) && !request.benutzer) {
      return reply.code(401).send({ fehler: "Bitte anmelden" });
    }
  });

  app.get("/api/gesundheit", async () => ({ ok: true }));

  // Demo-Konten für die Schnellanmeldung (nur im Demo-Modus, nur vorhandene und aktive Konten)
  app.get("/api/demo", async () => {
    if (!config.demoModus) return { aktiv: false, konten: [] };
    const konten = await db
      .select({ email: benutzer.email, name: benutzer.name, status: benutzer.status, aktiv: benutzer.aktiv })
      .from(benutzer)
      .where(inArray(benutzer.email, DEMO_EMAILS));
    const sortiert = DEMO_EMAILS.map((e) => konten.find((k) => k.email === e && k.aktiv)).filter((k) => k !== undefined);
    return { aktiv: sortiert.length > 0, passwort: DEMO_PASSWORT, konten: sortiert.map(({ email, name, status }) => ({ email, name, status })) };
  });

  await authRouten(app, db);
  await praxisRouten(app, db);
  await teamRouten(app, db);
  await ichRouten(app, db);
  await regelwerkRouten(app, db);
  await hinweisRouten(app, db);
  await akteRouten(app, db);
  await urkundeRouten(app, db);
  await abrechnungRouten(app, db);
  await tourenRouten(app, db);
  await aenderungRouten(app, db);

  // Gebautes Frontend ausliefern (Single-Page-App)
  if (config.webDist && existsSync(config.webDist)) {
    await app.register(fastifyStatic, { root: config.webDist, wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/")) return reply.code(404).send({ fehler: "Nicht gefunden" });
      return reply.sendFile("index.html");
    });
  }

  return app;
}
