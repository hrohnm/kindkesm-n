/**
 * Fahrzeiten und Strecken für Tourenplanung, Wegegeld und Fahrtenbuch.
 *
 * Mit OSRM_URL (eigener OSRM-Server mit der Karte von Mecklenburg-Vorpommern, siehe docs/BETRIEB.md)
 * werden echte Straßenstrecken berechnet. Ohne OSRM oder bei einem Ausfall schätzt die App
 * aus der Luftlinie (Umwegfaktor 1,3, im Schnitt 50 km/h). Es werden nur Koordinaten übertragen, keine Namen.
 */
import type { Matrix } from "@kindkesmoeoen/shared";

export type Punkt = { lat: number; lon: number };
export type Quelle = "osrm" | "luftlinie";

export type Strecke = {
  meter: number;
  sek: number;
  /** je Abschnitt zwischen zwei aufeinanderfolgenden Punkten */
  abschnitte: Array<{ meter: number; sek: number }>;
  /** Verlauf für die Karte als [lat, lon] */
  geometrie: Array<[number, number]>;
};

export type Routing = {
  matrix(punkte: Punkt[]): Promise<Matrix & { quelle: Quelle }>;
  strecke(punkte: Punkt[]): Promise<Strecke & { quelle: Quelle }>;
};

const UMWEG = 1.3;
const KMH = 50;

export function luftlinieMeter(a: Punkt, b: Punkt): number {
  const r = 6_371_000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function geschaetzt(a: Punkt, b: Punkt) {
  const meter = Math.round(luftlinieMeter(a, b) * UMWEG);
  return { meter, sek: Math.round(meter / (KMH / 3.6)) };
}

export const luftlinie: Routing = {
  async matrix(punkte) {
    const z = punkte.map((a) => punkte.map((b) => geschaetzt(a, b)));
    return { quelle: "luftlinie", meter: z.map((r) => r.map((x) => x.meter)), sek: z.map((r) => r.map((x) => x.sek)) };
  },
  async strecke(punkte) {
    const abschnitte = punkte.slice(1).map((b, i) => geschaetzt(punkte[i]!, b));
    return {
      quelle: "luftlinie",
      meter: abschnitte.reduce((s, x) => s + x.meter, 0),
      sek: abschnitte.reduce((s, x) => s + x.sek, 0),
      abschnitte,
      geometrie: punkte.map((p) => [p.lat, p.lon]),
    };
  },
};

const koordinaten = (punkte: Punkt[]) => punkte.map((p) => `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`).join(";");

async function holen<T>(url: string): Promise<T> {
  const antwort = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!antwort.ok) throw new Error(`OSRM antwortet mit ${antwort.status}`);
  const daten = (await antwort.json()) as T & { code?: string; message?: string };
  if (daten.code && daten.code !== "Ok") throw new Error(`OSRM: ${daten.code} ${daten.message ?? ""}`);
  return daten;
}

export function osrm(basis: string): Routing {
  const url = basis.replace(/\/$/, "");
  return {
    async matrix(punkte) {
      const d = await holen<{ durations: number[][]; distances: number[][] }>(`${url}/table/v1/driving/${koordinaten(punkte)}?annotations=duration,distance`);
      return { quelle: "osrm", sek: d.durations.map((r) => r.map((x) => Math.round(x ?? 0))), meter: d.distances.map((r) => r.map((x) => Math.round(x ?? 0))) };
    },
    async strecke(punkte) {
      const d = await holen<{ routes: Array<{ distance: number; duration: number; legs: Array<{ distance: number; duration: number }>; geometry: { coordinates: Array<[number, number]> } }> }>(
        `${url}/route/v1/driving/${koordinaten(punkte)}?overview=simplified&geometries=geojson&steps=false`,
      );
      const r = d.routes[0]!;
      return {
        quelle: "osrm",
        meter: Math.round(r.distance),
        sek: Math.round(r.duration),
        abschnitte: r.legs.map((l) => ({ meter: Math.round(l.distance), sek: Math.round(l.duration) })),
        geometrie: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
      };
    },
  };
}

/** OSRM, falls eingerichtet; bei Fehlern automatisch Luftlinien-Schätzung. */
export function routingFuer(osrmUrl: string | undefined, protokoll?: (text: string) => void): Routing {
  if (!osrmUrl) return luftlinie;
  const o = osrm(osrmUrl);
  const mitErsatz =
    <K extends keyof Routing>(k: K) =>
    async (punkte: Punkt[]) => {
      if (punkte.length < 2) return luftlinie[k](punkte);
      try {
        return await o[k](punkte);
      } catch (e) {
        protokoll?.(`OSRM nicht erreichbar, Luftlinie wird verwendet: ${(e as Error).message}`);
        return luftlinie[k](punkte);
      }
    };
  return { matrix: mitErsatz("matrix"), strecke: mitErsatz("strecke") } as Routing;
}
