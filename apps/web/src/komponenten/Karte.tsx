import type * as L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export type GeoStatus = { routing: "osrm" | "luftlinie"; adressen: number; kacheln: string | null; kartenHinweis: string };

let statusCache: Promise<GeoStatus> | null = null;
export function geoStatus(): Promise<GeoStatus> {
  statusCache ??= api<GeoStatus>("/api/geo/status").catch((e) => {
    statusCache = null;
    throw e;
  });
  return statusCache;
}

export function useGeoStatus() {
  const [s, setS] = useState<GeoStatus | null>(null);
  useEffect(() => {
    void geoStatus().then(setS, () => setS(null));
  }, []);
  return s;
}

export type KartenPunkt = { lat: number; lon: number; text: string; titel?: string; art?: "start" | "ende" | "besuch" | "erledigt" | "neu" };

const FARBE: Record<NonNullable<KartenPunkt["art"]>, string> = {
  start: "#575d3f",
  ende: "#8a7a5c",
  besuch: "#c2410c",
  erledigt: "#94a3b8",
  neu: "#c2410c",
};

/**
 * Kartenansicht mit OpenStreetMap-Kacheln (Leaflet, erst bei Bedarf geladen).
 * Es werden nur Kartenkacheln geladen; Namen und Anschriften bleiben im Browser.
 */
export function Karte({
  punkte,
  linie,
  setzen,
  hoehe = "h-72",
}: {
  punkte: KartenPunkt[];
  linie?: Array<[number, number]> | null;
  /** Klick auf die Karte setzt eine Position (z. B. Wohnung einer Familie) */
  setzen?: (lat: number, lon: number) => void;
  hoehe?: string;
}) {
  const status = useGeoStatus();
  const element = useRef<HTMLDivElement>(null);
  const karte = useRef<{ L: typeof L; map: L.Map; ebene: L.LayerGroup } | null>(null);
  const setzenRef = useRef(setzen);
  setzenRef.current = setzen;

  // Karte einmalig aufbauen
  useEffect(() => {
    if (!status?.kacheln || !element.current || karte.current) return;
    let abgebrochen = false;
    void Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(([mod]) => {
      if (abgebrochen || !element.current) return;
      const Lf = (mod as unknown as { default: typeof L }).default ?? (mod as unknown as typeof L);
      const map = Lf.map(element.current, { zoomControl: true, attributionControl: true }).setView([54.1, 11.85], 11);
      Lf.tileLayer(status.kacheln!, {
        maxZoom: 19,
        attribution: status.kartenHinweis,
        // OpenStreetMap verlangt einen Referer; übertragen wird nur die Adresse der App, kein Pfad
        referrerPolicy: "strict-origin-when-cross-origin",
      }).addTo(map);
      map.on("click", (e: L.LeafletMouseEvent) => setzenRef.current?.(e.latlng.lat, e.latlng.lng));
      karte.current = { L: Lf, map, ebene: Lf.layerGroup().addTo(map) };
      zeichnen();
    });
    return () => {
      abgebrochen = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.kacheln]);

  useEffect(
    () => () => {
      karte.current?.map.off();
      karte.current?.map.remove();
      karte.current = null;
    },
    [],
  );

  function zeichnen() {
    const k = karte.current;
    if (!k) return;
    k.ebene.clearLayers();
    const grenzen: Array<[number, number]> = [];
    if (linie && linie.length > 1) {
      k.L.polyline(linie, { color: "#575d3f", weight: 4, opacity: 0.8 }).addTo(k.ebene);
      grenzen.push(...linie);
    }
    for (const p of punkte) {
      const farbe = FARBE[p.art ?? "besuch"];
      const icon = k.L.divIcon({
        className: "",
        html: `<div style="background:${farbe};color:#fff;border:2px solid #fff;border-radius:9999px;min-width:28px;height:28px;padding:0 6px;display:flex;align-items:center;justify-content:center;font:600 13px system-ui;box-shadow:0 1px 4px rgba(0,0,0,.35)">${escapeHtml(p.text)}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const m = k.L.marker([p.lat, p.lon], { icon, keyboard: false }).addTo(k.ebene);
      if (p.titel) m.bindTooltip(p.titel);
      grenzen.push([p.lat, p.lon]);
    }
    if (grenzen.length === 1) k.map.setView(grenzen[0]!, 15, { animate: false });
    else if (grenzen.length > 1) k.map.fitBounds(grenzen, { padding: [30, 30], maxZoom: 15, animate: false });
  }

  useEffect(zeichnen, [punkte, linie]);

  if (status && !status.kacheln) return null;
  return (
    <div className={`relative z-0 overflow-hidden rounded-2xl border border-sand-200 bg-sand-100 dark:border-salbei-700 ${hoehe}`}>
      <div ref={element} className="size-full" style={setzen ? { cursor: "crosshair" } : undefined} />
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Links zur Navigations-App auf dem Gerät (übergibt nur das Ziel). */
export function navigationsLinks(ziel: { lat: number | null; lon: number | null; anschrift: string }) {
  const q = ziel.lat != null && ziel.lon != null ? `${ziel.lat},${ziel.lon}` : encodeURIComponent(ziel.anschrift);
  return {
    apple: `https://maps.apple.com/?daddr=${q}&dirflg=d`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`,
  };
}
