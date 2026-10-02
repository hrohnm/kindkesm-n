import {
  LEISTUNGSTYPEN,
  LEISTUNGSTYP_LABEL,
  TERMIN_FENSTER,
  TERMIN_ZEITEN,
  TERMIN_ZEIT_LABEL,
  isoDatum,
  type Leistungstyp,
  type TerminZeit,
} from "@kindkesmoeoen/shared";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Feld, Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { IconMuell, IconOrt, IconPlus, IconStift } from "../komponenten/Icons";
import { Karte, navigationsLinks, useGeoStatus, type KartenPunkt } from "../komponenten/Karte";
import { ApiFehler, api } from "../lib/api";
import { datum as datumDe, euro } from "../lib/format";
import type { Ort } from "../lib/typen";
import { useAusgang } from "../lib/offline/hooks";
import type { AusgangEintrag } from "../lib/offline/ausgang";
import { useDaten } from "../lib/useDaten";

type Termin = {
  id: string;
  betreuungId: string;
  zeit: TerminZeit;
  uhrzeit: string | null;
  fruehestens: string | null;
  spaetestens: string | null;
  dauerMin: number;
  typ: Leistungstyp;
  wichtig: boolean;
  notiz: string | null;
  reihenfolge: number | null;
  ankunft: string | null;
  besuchId: string | null;
  status: "geplant" | "erledigt" | "abgesagt";
  klientin: {
    klientinId: string;
    name: string;
    strasse: string | null;
    plz: string | null;
    ort: string | null;
    telefon: string | null;
    lat: number | null;
    lon: number | null;
    geoQuelle: string | null;
    hinweise: string | null;
    lebenstag: number | null;
    besuchStatus: string | null;
  };
};

type TourEinstellung = {
  startOrtId: string;
  endeOrtId: string;
  wegegeldAusgangsOrtId: string;
  startZeit: string;
  endeSpaetestens: string | null;
  pufferMin: number;
  status?: string;
  meter?: number | null;
  fahrSek?: number | null;
  ankunftEnde?: string | null;
  geometrie?: Array<[number, number]> | null;
  quelle?: "osrm" | "luftlinie" | null;
  hinweise?: string[];
};

type Wegegeld = {
  gesamtMeter: number | null;
  quelle: string | null;
  manuellKm: number | null;
  getrennteWege: boolean;
  begruendungen: Record<string, string>;
  hinweise: Array<{ stufe: string; text: string }>;
  gesperrt: boolean;
  zeilen: Array<{ besuchId: string; name: string; ort: string | null; gpos: string; km: number; betrag: string; txt: string | null; versendet: boolean }>;
};

type Vorschlag = { betreuungId: string; name: string; ort: string | null; lebenstag: number | null; letzterBesuch: string | null; wichtig: boolean };

type TagDaten = {
  datum: string;
  tour: (TourEinstellung & { id: string }) | null;
  einstellung: TourEinstellung | null;
  vorlage: string | null;
  orte: Array<Ort & { lat: string | null; lon: string | null }>;
  termine: Termin[];
  vorschlaege: Vorschlag[];
  wegegeld: Wegegeld | null;
};

const verschieben = (iso: string, tage: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + tage);
  return isoDatum(d);
};
const km = (meter: number | null | undefined) => (meter == null ? "–" : `${(meter / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km`);
const dauer = (sek: number | null | undefined) => {
  if (sek == null) return "–";
  const m = Math.round(sek / 60);
  return m >= 60 ? `${Math.floor(m / 60)} Std. ${m % 60} Min.` : `${m} Min.`;
};

function zeitText(t: Pick<Termin, "zeit" | "uhrzeit" | "fruehestens" | "spaetestens">) {
  if (t.zeit === "fix") return `fest ${t.uhrzeit} Uhr`;
  if (t.zeit === "vormittags" || t.zeit === "nachmittags") return `${TERMIN_ZEIT_LABEL[t.zeit]} (${TERMIN_FENSTER[t.zeit].join("–")})`;
  if (t.zeit === "fenster") return `${t.fruehestens ?? "…"}–${t.spaetestens ?? "…"} Uhr`;
  return "flexibel";
}

/** Tourenplanung eines Tages: Besuche einplanen, Reihenfolge optimieren, Navigation, Wegegeld. */
export function Tour() {
  const { datum: param } = useParams();
  const navigate = useNavigate();
  const heute = isoDatum(new Date());
  const datum = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : heute;
  const tag = useDaten<TagDaten>(`/api/touren/${datum}`);
  const ausgang = useAusgang();
  const geo = useGeoStatus();
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler" | "hinweis"; text: string }>();
  const [arbeitet, setArbeitet] = useState(false);
  const [formular, setFormular] = useState<{ termin?: Termin; betreuungId?: string } | null>(null);
  const [einstellungOffen, setEinstellungOffen] = useState(false);

  async function aktion(fn: () => Promise<unknown>, ok?: string) {
    setArbeitet(true);
    setMeldung(undefined);
    try {
      await fn();
      if (ok) setMeldung({ art: "ok", text: ok });
      await tag.laden();
    } catch (e) {
      setMeldung({ art: "fehler", text: e instanceof ApiFehler ? e.message : String(e) });
    } finally {
      setArbeitet(false);
    }
  }

  const d = tag.daten;
  const aktiv = useMemo(() => (d?.termine ?? []).filter((t) => t.status !== "abgesagt"), [d]);
  const abgesagt = (d?.termine ?? []).filter((t) => t.status === "abgesagt");
  const e = d?.tour ?? d?.einstellung ?? null;
  const ortVon = (id?: string) => d?.orte.find((o) => o.id === id);
  const startOrt = ortVon(e?.startOrtId);
  const endeOrt = ortVon(e?.endeOrtId);

  const punkte: KartenPunkt[] = useMemo(() => {
    const p: KartenPunkt[] = [];
    if (startOrt?.lat) p.push({ lat: Number(startOrt.lat), lon: Number(startOrt.lon), text: "S", titel: `Start: ${startOrt.bezeichnung}`, art: "start" });
    aktiv.forEach((t, i) => {
      if (t.klientin.lat != null && t.klientin.lon != null) {
        p.push({ lat: t.klientin.lat, lon: t.klientin.lon, text: String(i + 1), titel: `${t.ankunft ?? ""} ${t.klientin.name}`, art: t.status === "erledigt" ? "erledigt" : "besuch" });
      }
    });
    if (endeOrt?.lat && endeOrt.id !== startOrt?.id) p.push({ lat: Number(endeOrt.lat), lon: Number(endeOrt.lon), text: "Z", titel: `Ziel: ${endeOrt.bezeichnung}`, art: "ende" });
    return p;
  }, [aktiv, startOrt, endeOrt]);

  if (!d) return tag.fehler ? <Meldung art="fehler">{tag.fehler}</Meldung> : <Laden />;

  const tagText = new Date(`${datum}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const veraltet = d.tour && aktiv.some((t) => t.reihenfolge == null);
  const ohnePosition = aktiv.filter((t) => t.klientin.lat == null);

  const planen = (modus: "optimieren" | "reihenfolge" | "ab_jetzt", reihenfolge?: string[]) =>
    aktion(async () => {
      const r = await api<{ hinweise: string[] }>(`/api/touren/${datum}/planen`, { method: "POST", body: { modus, reihenfolge } });
      if (!r.hinweise.length && modus === "optimieren") setMeldung({ art: "ok", text: "Reihenfolge optimiert." });
    });

  const bewegen = (i: number, richtung: -1 | 1) => {
    const ids = aktiv.map((t) => t.id);
    const j = i + richtung;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    void planen("reihenfolge", ids);
  };

  return (
    <>
      <Seitenkopf
        titel="Tour"
        untertitel={
          <span>
            {tagText}
            {d.vorlage && !d.tour ? ` · Vorlage „${d.vorlage}“` : ""}
            {d.tour?.status === "bestaetigt" ? " · bestätigt" : ""}
          </span>
        }
        aktion={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="knopf-sekundaer px-4" aria-label="Vorheriger Tag" onClick={() => navigate(`/tour/${verschieben(datum, -1)}`)}>‹</button>
            <input type="date" className="feld w-auto" value={datum} onChange={(ev) => ev.target.value && navigate(`/tour/${ev.target.value}`)} aria-label="Datum" />
            <button type="button" className="knopf-sekundaer px-4" aria-label="Nächster Tag" onClick={() => navigate(`/tour/${verschieben(datum, 1)}`)}>›</button>
            {datum !== heute && (
              <button type="button" className="knopf-sekundaer" onClick={() => navigate("/tour")}>Heute</button>
            )}
          </div>
        }
      />

      {meldung && <div className="mb-4"><Meldung art={meldung.art}>{meldung.text}</Meldung></div>}
      {!e && <Meldung art="hinweis">Bitte zuerst unter <Link className="underline" to="/einstellungen/orte">Einstellungen → Orte & Touren</Link> die Wohnanschrift anlegen.</Meldung>}

      {e && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* ------------------------------------------------ Liste */}
          <section className="min-w-0 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="knopf-primaer" disabled={arbeitet || !aktiv.length} onClick={() => planen("optimieren")}>Route optimieren</button>
              {datum === heute && aktiv.some((t) => t.status === "erledigt") && (
                <button type="button" className="knopf-sekundaer" disabled={arbeitet} onClick={() => planen("ab_jetzt")}>Ab jetzt neu berechnen</button>
              )}
              <button type="button" className="knopf-sekundaer" onClick={() => setFormular({})}><IconPlus className="size-5" /> Besuch einplanen</button>
            </div>

            {(d.tour?.hinweise ?? []).map((h) => <Meldung key={h} art="hinweis">{h}</Meldung>)}
            {veraltet && <Meldung art="hinweis">Neue oder geänderte Besuche: Bitte „Route optimieren“, damit Reihenfolge und Zeiten stimmen.</Meldung>}
            {ohnePosition.length > 0 && (
              <Meldung art="fehler">
                Position der Wohnung unbekannt: {ohnePosition.map((t) => <Link key={t.id} className="underline" to={`/klientinnen/${t.klientin.klientinId}`}>{t.klientin.name}</Link>).reduce<ReactNode[]>((a, x, i) => (i ? [...a, ", ", x] : [x]), [])}. In der Akte auf der Karte setzen.
              </Meldung>
            )}

            <ol className="space-y-3">
              <EndpunktZeile zeit={e.startZeit} ort={startOrt} art="Start" onBearbeiten={() => setEinstellungOffen((x) => !x)} />
              {einstellungOffen && <TourEinstellungFormular datum={datum} e={e} orte={d.orte} fertig={async () => { setEinstellungOffen(false); await tag.laden(); }} />}
              {aktiv.map((t, i) => (
                <TerminKarte
                  key={t.id}
                  nr={i + 1}
                  t={t}
                  datum={datum}
                  offline={ausgang.find((x) => x.terminId === t.id || x.id === t.besuchId)}
                  erster={i === 0}
                  letzter={i === aktiv.length - 1}
                  arbeitet={arbeitet}
                  bewegen={(r) => bewegen(i, r)}
                  bearbeiten={() => setFormular({ termin: t })}
                  absagen={() => aktion(() => api(`/api/termine/${t.id}/status`, { method: "POST", body: { status: "abgesagt" } }))}
                  loeschen={() => aktion(() => api(`/api/termine/${t.id}`, { method: "DELETE" }))}
                />
              ))}
              {!aktiv.length && <li className="karte text-slate-500">Noch keine Besuche eingeplant.</li>}
              <EndpunktZeile zeit={d.tour?.ankunftEnde ?? null} ort={endeOrt} art="Ziel" spaetestens={e.endeSpaetestens} onBearbeiten={() => setEinstellungOffen((x) => !x)} />
            </ol>

            {formular && (
              <TerminFormular
                datum={datum}
                termin={formular.termin}
                betreuungId={formular.betreuungId}
                vorschlaege={d.vorschlaege}
                abbrechen={() => setFormular(null)}
                fertig={async () => {
                  setFormular(null);
                  await tag.laden();
                }}
              />
            )}

            {d.vorschlaege.length > 0 && (
              <div className="karte">
                <h2 className="mb-2 font-semibold">Noch nicht eingeplant</h2>
                <ul className="divide-y divide-sand-200 dark:divide-salbei-700">
                  {d.vorschlaege.map((v) => (
                    <li key={v.betreuungId} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="font-medium">{v.name}</span>
                        {v.wichtig && <span className="ml-2 rounded-full bg-tulpe-100 px-2 py-0.5 text-xs font-medium text-tulpe-500">LT {v.lebenstag}</span>}
                        <span className="block truncate text-sm text-slate-500">
                          {v.ort ?? ""}
                          {v.lebenstag != null ? ` · ${v.lebenstag}. Lebenstag` : ""}
                          {v.letzterBesuch ? ` · zuletzt ${datumDe(v.letzterBesuch)}` : ""}
                        </span>
                      </span>
                      <button type="button" className="knopf-sekundaer shrink-0 px-4" onClick={() => setFormular({ betreuungId: v.betreuungId })}>
                        <IconPlus className="size-5" /> Einplanen
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {abgesagt.length > 0 && (
              <details className="karte">
                <summary className="cursor-pointer font-medium">Abgesagt ({abgesagt.length})</summary>
                <ul className="mt-2 space-y-2">
                  {abgesagt.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 line-through">{t.klientin.name}</span>
                      <button type="button" className="knopf-sekundaer px-4" onClick={() => aktion(() => api(`/api/termine/${t.id}/status`, { method: "POST", body: { status: "geplant" } }))}>Wieder einplanen</button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          {/* ------------------------------------------------ Karte und Bilanz */}
          <section className="min-w-0 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Kennzahl titel="Strecke" wert={km(d.tour?.meter)} />
              <Kennzahl titel="Fahrzeit" wert={dauer(d.tour?.fahrSek)} />
              <Kennzahl titel="Besuchszeit" wert={dauer(aktiv.reduce((s, t) => s + t.dauerMin * 60, 0))} />
            </div>
            <Karte punkte={punkte} linie={d.tour?.geometrie} hoehe="h-72 xl:h-96" />
            {(d.tour?.quelle === "luftlinie" || geo?.routing === "luftlinie") && (
              <p className="text-sm text-slate-500">Strecken und Zeiten sind geschätzt (Luftlinie × 1,3, ca. 50 km/h), solange kein Routing-Server eingerichtet ist.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="knopf-sekundaer" disabled={arbeitet || !d.tour || d.tour.status === "bestaetigt"} onClick={() => aktion(() => api(`/api/touren/${datum}/bestaetigen`, { method: "POST" }), "Tour bestätigt.")}>
                Tour bestätigen
              </button>
              <button type="button" className="knopf-sekundaer" disabled={arbeitet || !aktiv.length} onClick={() => aktion(() => api(`/api/fahrtenbuch/aus-tag/${datum}`, { method: "POST" }), "Fahrtenbuch-Eintrag erstellt bzw. aktualisiert.")}>
                Ins Fahrtenbuch
              </button>
              <Link className="knopf-sekundaer" to={`/fahrtenbuch?monat=${datum.slice(0, 7)}`}>Fahrtenbuch öffnen</Link>
            </div>
            <WegegeldKarte datum={datum} w={d.wegegeld} neu={() => tag.laden()} />
          </section>
        </div>
      )}
    </>
  );
}

function Kennzahl({ titel, wert }: { titel: string; wert: string }) {
  return (
    <div className="karte p-3 text-center sm:p-4">
      <div className="text-xs text-slate-500 sm:text-sm">{titel}</div>
      <div className="mt-0.5 text-base font-semibold text-salbei-700 sm:text-xl dark:text-salbei-100">{wert}</div>
    </div>
  );
}

function EndpunktZeile({ zeit, ort, art, spaetestens, onBearbeiten }: { zeit: string | null; ort?: Ort; art: "Start" | "Ziel"; spaetestens?: string | null; onBearbeiten: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-dashed border-sand-300 px-4 py-3 dark:border-salbei-700">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-salbei-600 text-sm font-semibold text-white">{art === "Start" ? "S" : "Z"}</span>
      <span className="w-14 shrink-0 font-semibold tabular-nums">{zeit ?? "–"}</span>
      <span className="min-w-0 flex-1">
        <span className="font-medium">{art}: {ort?.bezeichnung ?? "?"}</span>
        <span className="block truncate text-sm text-slate-500">
          {art === "Start" ? "Abfahrt" : "Ankunft"}
          {spaetestens ? ` · spätestens ${spaetestens} Uhr` : ""}
        </span>
      </span>
      <button type="button" className="knopf-sekundaer px-3" aria-label="Start, Ziel und Zeiten ändern" onClick={onBearbeiten}><IconStift className="size-5" /></button>
    </li>
  );
}

function TerminKarte({
  nr,
  t,
  datum,
  erster,
  letzter,
  arbeitet,
  bewegen,
  bearbeiten,
  absagen,
  loeschen,
  offline,
}: {
  nr: number;
  t: Termin;
  datum: string;
  /** Ohne Verbindung dokumentiert, noch nicht übertragen */
  offline?: AusgangEintrag;
  erster: boolean;
  letzter: boolean;
  arbeitet: boolean;
  bewegen: (r: -1 | 1) => void;
  bearbeiten: () => void;
  absagen: () => void;
  loeschen: () => void;
}) {
  const k = t.klientin;
  const anschrift = [k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const nav = navigationsLinks({ lat: k.lat, lon: k.lon, anschrift });
  const zurueck = encodeURIComponent(`/tour/${datum}`);
  const dokuLink = t.besuchId
    ? `/besuche/${t.besuchId}?zurueck=${zurueck}`
    : `/betreuungen/${t.betreuungId}/besuch?termin=${t.id}&datum=${datum}&typ=${t.typ}&zurueck=${zurueck}${offline ? `&ausgang=${offline.id}` : ""}`;
  const erledigt = t.status === "erledigt" || Boolean(offline?.body.abschliessen);
  return (
    <li className={`karte p-4 ${erledigt ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${erledigt ? "bg-slate-400" : "bg-orange-700"}`}>{erledigt ? "✓" : nr}</span>
        <span className="w-14 shrink-0 pt-1.5 font-semibold tabular-nums">{t.ankunft ?? "–"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/klientinnen/${k.klientinId}`} className="font-semibold hover:underline">{k.name}</Link>
            {k.lebenstag != null && k.lebenstag >= 0 && <span className="rounded-full bg-salbei-100 px-2 py-0.5 text-xs font-medium text-salbei-700">LT {k.lebenstag}</span>}
            {t.wichtig && <span className="rounded-full bg-tulpe-100 px-2 py-0.5 text-xs font-medium text-tulpe-500">muss heute</span>}
            {offline && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800" data-testid="offline-dokumentiert">offline dokumentiert – wird übertragen</span>}
          </div>
          <div className="truncate text-sm text-slate-500">{anschrift || "Anschrift fehlt"}</div>
          <div className="mt-1 text-sm">
            {zeitText(t)} · {t.dauerMin} Min. · {LEISTUNGSTYP_LABEL[t.typ]}
          </div>
          {t.notiz && <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.notiz}</div>}
          {k.hinweise && <div className="mt-1 text-sm text-amber-800 dark:text-amber-200">{k.hinweise}</div>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={dokuLink} className={erledigt ? "knopf-sekundaer" : "knopf-primaer"}>{offline ? "Weiter dokumentieren" : t.besuchId ? (k.besuchStatus === "abgeschlossen" ? "Besuch ansehen" : "Weiter dokumentieren") : "Dokumentieren"}</Link>
        <a href={nav.apple} target="_blank" rel="noreferrer" className="knopf-sekundaer"><IconOrt className="size-5" /> Apple Karten</a>
        <a href={nav.google} target="_blank" rel="noreferrer" className="knopf-sekundaer">Google Maps</a>
        {k.telefon && <a href={`tel:${k.telefon.replace(/\s/g, "")}`} className="knopf-sekundaer">Anrufen</a>}
        <span className="ml-auto flex gap-1">
          <button type="button" className="knopf-sekundaer px-3" disabled={arbeitet || erster} aria-label="Früher" onClick={() => bewegen(-1)}>↑</button>
          <button type="button" className="knopf-sekundaer px-3" disabled={arbeitet || letzter} aria-label="Später" onClick={() => bewegen(1)}>↓</button>
          {!erledigt && <button type="button" className="knopf-sekundaer px-3" aria-label="Termin bearbeiten" onClick={bearbeiten}><IconStift className="size-5" /></button>}
          {!t.besuchId ? (
            <button type="button" className="knopf-gefahr px-3" aria-label="Termin löschen" onClick={() => confirm(`Termin mit ${k.name} löschen?`) && loeschen()}><IconMuell className="size-5" /></button>
          ) : (
            !erledigt && <button type="button" className="knopf-gefahr px-3" onClick={absagen}>Absagen</button>
          )}
        </span>
      </div>
    </li>
  );
}

function TourEinstellungFormular({ datum, e, orte, fertig }: { datum: string; e: TourEinstellung; orte: Ort[]; fertig: () => Promise<void> }) {
  const [w, setW] = useState({ ...e, endeSpaetestens: e.endeSpaetestens ?? "" });
  const [fehler, setFehler] = useState<string>();
  const auswahl = (feld: "startOrtId" | "endeOrtId" | "wegegeldAusgangsOrtId") => (
    <select className="feld" value={w[feld]} onChange={(ev) => setW({ ...w, [feld]: ev.target.value })}>
      {orte.map((o) => <option key={o.id} value={o.id}>{o.bezeichnung}</option>)}
    </select>
  );
  return (
    <li className="karte space-y-4">
      {fehler && <Meldung art="fehler">{fehler}</Meldung>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Feld label="Start">{auswahl("startOrtId")}</Feld>
        <Feld label="Abfahrt"><input type="time" className="feld" value={w.startZeit} onChange={(ev) => setW({ ...w, startZeit: ev.target.value })} /></Feld>
        <Feld label="Ziel">{auswahl("endeOrtId")}</Feld>
        <Feld label="Ankunft spätestens"><input type="time" className="feld" value={w.endeSpaetestens} onChange={(ev) => setW({ ...w, endeSpaetestens: ev.target.value })} /></Feld>
        <Feld label="Puffer nach jedem Besuch (Min.)"><input type="number" min={0} max={60} className="feld" value={w.pufferMin} onChange={(ev) => setW({ ...w, pufferMin: Number(ev.target.value) })} /></Feld>
        <Feld label="Wegegeld ab" hilfe="Abrechenbar ist die kürzeste Strecke von hier (§ 11 Anlage 1.1).">{auswahl("wegegeldAusgangsOrtId")}</Feld>
      </div>
      <button
        type="button"
        className="knopf-primaer"
        onClick={async () => {
          try {
            await api(`/api/touren/${datum}`, { method: "PUT", body: { startOrtId: w.startOrtId, endeOrtId: w.endeOrtId, wegegeldAusgangsOrtId: w.wegegeldAusgangsOrtId, startZeit: w.startZeit, endeSpaetestens: w.endeSpaetestens, pufferMin: w.pufferMin } });
            await fertig();
          } catch (err) {
            setFehler((err as Error).message);
          }
        }}
      >
        Übernehmen
      </button>
    </li>
  );
}

type KlientinListe = Array<{ id: string; vorname: string; nachname: string; ort: string | null; betreuung: { id: string; status: string; geburtsdatum: string | null } | null }>;

function TerminFormular({
  datum,
  termin,
  betreuungId,
  vorschlaege,
  abbrechen,
  fertig,
}: {
  datum: string;
  termin?: Termin;
  betreuungId?: string;
  vorschlaege: Vorschlag[];
  abbrechen: () => void;
  fertig: () => Promise<void>;
}) {
  const liste = useDaten<KlientinListe>("/api/klientinnen?nur=alle");
  const vorschlag = vorschlaege.find((v) => v.betreuungId === betreuungId);
  const [w, setW] = useState({
    betreuungId: termin?.betreuungId ?? betreuungId ?? "",
    zeit: termin?.zeit ?? ("ganztags" as TerminZeit),
    uhrzeit: termin?.uhrzeit ?? "",
    fruehestens: termin?.fruehestens ?? "",
    spaetestens: termin?.spaetestens ?? "",
    dauerMin: termin?.dauerMin ?? (vorschlag?.lebenstag != null && vorschlag.lebenstag <= 3 ? 60 : 45),
    typ: termin?.typ ?? ("wochenbett" as Leistungstyp),
    wichtig: termin?.wichtig ?? vorschlag?.wichtig ?? false,
    notiz: termin?.notiz ?? "",
  });
  const [fehler, setFehler] = useState<{ text: string; felder: Record<string, string> }>();
  const familien = (liste.daten ?? []).filter((k) => k.betreuung && k.betreuung.status !== "abgeschlossen");

  async function speichern() {
    try {
      await api(termin ? `/api/termine/${termin.id}` : `/api/touren/${datum}/termine`, { method: termin ? "PUT" : "POST", body: w });
      await fertig();
    } catch (e) {
      setFehler({ text: (e as Error).message, felder: e instanceof ApiFehler ? e.felder : {} });
    }
  }

  return (
    <div className="karte space-y-4">
      <h2 className="text-lg font-semibold">{termin ? `Termin ${termin.klientin.name}` : "Besuch einplanen"}</h2>
      {fehler && <Meldung art="fehler">{fehler.text}</Meldung>}
      {!termin && (
        <Feld label="Familie" fehler={fehler?.felder.betreuungId}>
          <select
            className="feld"
            value={w.betreuungId}
            onChange={(ev) => {
              const k = familien.find((x) => x.betreuung!.id === ev.target.value);
              setW({ ...w, betreuungId: ev.target.value, typ: k?.betreuung?.geburtsdatum ? "wochenbett" : "vorsorge" });
            }}
          >
            <option value="">Bitte wählen …</option>
            {familien.map((k) => (
              <option key={k.betreuung!.id} value={k.betreuung!.id}>{k.nachname}, {k.vorname}{k.ort ? ` (${k.ort})` : ""}</option>
            ))}
          </select>
        </Feld>
      )}
      <div>
        <span className="etikett">Zeit</span>
        <div className="flex flex-wrap gap-2">
          {TERMIN_ZEITEN.map((z) => (
            <button key={z} type="button" onClick={() => setW({ ...w, zeit: z })} className={`min-h-12 rounded-full px-4 font-medium ${w.zeit === z ? "bg-salbei-600 text-white" : "border border-sand-200 bg-white text-slate-700 dark:border-salbei-700 dark:bg-salbei-900/40 dark:text-slate-200"}`}>
              {TERMIN_ZEIT_LABEL[z]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {w.zeit === "fix" && <Feld label="Uhrzeit (mit der Familie vereinbart)" fehler={fehler?.felder.uhrzeit}><input type="time" className="feld" value={w.uhrzeit} onChange={(ev) => setW({ ...w, uhrzeit: ev.target.value })} /></Feld>}
        {w.zeit === "fenster" && (
          <>
            <Feld label="Frühestens" fehler={fehler?.felder.fruehestens}><input type="time" className="feld" value={w.fruehestens} onChange={(ev) => setW({ ...w, fruehestens: ev.target.value })} /></Feld>
            <Feld label="Spätestens" fehler={fehler?.felder.spaetestens}><input type="time" className="feld" value={w.spaetestens} onChange={(ev) => setW({ ...w, spaetestens: ev.target.value })} /></Feld>
          </>
        )}
        <Feld label="Dauer (Min.)" fehler={fehler?.felder.dauerMin}>
          <div className="flex gap-2">
            {[30, 45, 60, 90].map((m) => (
              <button key={m} type="button" onClick={() => setW({ ...w, dauerMin: m })} className={`min-h-12 flex-1 rounded-xl font-medium ${w.dauerMin === m ? "bg-salbei-600 text-white" : "border border-sand-200 bg-white dark:border-salbei-700 dark:bg-salbei-900/40"}`}>{m}</button>
            ))}
          </div>
        </Feld>
        <Feld label="Leistung">
          <select className="feld" value={w.typ} onChange={(ev) => setW({ ...w, typ: ev.target.value as Leistungstyp })}>
            {LEISTUNGSTYPEN.map((t) => <option key={t} value={t}>{LEISTUNGSTYP_LABEL[t]}</option>)}
          </select>
        </Feld>
      </div>
      <label className="flex min-h-12 items-center gap-3">
        <input type="checkbox" className="size-5 accent-salbei-600" checked={w.wichtig} onChange={(ev) => setW({ ...w, wichtig: ev.target.checked })} />
        Muss heute sein (z. B. 3. Lebenstag) – wird bei Zeitnot zuerst eingeplant
      </label>
      <Feld label="Notiz"><input className="feld" value={w.notiz} onChange={(ev) => setW({ ...w, notiz: ev.target.value })} placeholder="z. B. Gewichtskontrolle, Parken im Hof" /></Feld>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="knopf-primaer" onClick={speichern}>{termin ? "Speichern" : "Termin anlegen"}</button>
        <button type="button" className="knopf-sekundaer" onClick={abbrechen}>Abbrechen</button>
      </div>
    </div>
  );
}

function WegegeldKarte({ datum, w, neu }: { datum: string; w: Wegegeld | null; neu: () => Promise<void> }) {
  const [manuell, setManuell] = useState(w?.manuellKm != null ? String(w.manuellKm).replace(".", ",") : "");
  const [begruendungen, setBegruendungen] = useState<Record<string, string>>(w?.begruendungen ?? {});
  const [fehler, setFehler] = useState<string>();
  if (!w || (!w.zeilen.length && !w.hinweise.length)) {
    return (
      <div className="karte text-sm text-slate-500">
        <h2 className="mb-1 text-base font-semibold text-slate-700 dark:text-slate-200">Wegegeld</h2>
        Wird automatisch berechnet, sobald Hausbesuche dieses Tages abgeschlossen sind.
      </div>
    );
  }
  const summe = w.zeilen.reduce((s, z) => s + Number(z.betrag), 0);
  const ueber25 = w.hinweise.some((h) => /Begründung/.test(h.text));
  const speichern = async (aenderung: Partial<{ manuellKm: number | null; getrennteWege: boolean; begruendungen: Record<string, string> }>) => {
    setFehler(undefined);
    try {
      await api(`/api/wegegeld/${datum}`, {
        method: "PUT",
        body: { manuellKm: manuell ? Number(manuell.replace(",", ".")) : null, getrennteWege: w.getrennteWege, begruendungen, ...aenderung },
      });
      await neu();
    } catch (e) {
      setFehler((e as Error).message);
    }
  };
  return (
    <div className="karte space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Wegegeld</h2>
        <span className="font-semibold">{euro(summe)}</span>
      </div>
      {fehler && <Meldung art="fehler">{fehler}</Meldung>}
      {w.hinweise.map((h) => (
        <p key={h.text} className={`text-sm ${h.stufe === "fehler" ? "text-tulpe-500" : h.stufe === "warnung" ? "text-amber-800 dark:text-amber-200" : "text-slate-500"}`}>{h.text}</p>
      ))}
      {w.zeilen.length > 0 && (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-sand-200 dark:divide-salbei-700">
            {w.zeilen.map((z) => (
              <tr key={z.besuchId}>
                <td className="py-2 pr-2">
                  <div className="font-medium">{z.name}</div>
                  <div className="text-slate-500">{z.gpos}{z.txt ? ` · ${z.txt}` : ""}{z.versendet ? " · versendet" : ""}</div>
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{z.km.toLocaleString("de-DE")} km</td>
                <td className="py-2 text-right tabular-nums">{euro(z.betrag)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-sm text-slate-500">
        Gesamtstrecke {km(w.gesamtMeter)} ({w.quelle === "manuell" ? "von Hand" : w.quelle === "osrm" ? "Straßenroute" : "geschätzt"}). Mehrere Familien auf einem Weg teilen sich die Strecke (50200).
      </p>
      {w.gesperrt ? (
        <p className="text-sm text-slate-500">Bereits einem Versand zugeordnet – keine Änderungen mehr.</p>
      ) : (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-salbei-700 dark:text-salbei-100">Anpassen</summary>
          <div className="mt-3 space-y-3">
            <label className="flex min-h-12 items-center gap-3">
              <input type="checkbox" className="size-5 accent-salbei-600" checked={w.getrennteWege} onChange={(ev) => speichern({ getrennteWege: ev.target.checked })} />
              Zwischendurch zum Ausgangspunkt zurück – jeden Besuch einzeln abrechnen
            </label>
            <div className="flex items-end gap-2">
              <Feld label="Gesamtstrecke von Hand (km)" hilfe="Leer lassen für die automatische Berechnung.">
                <input className="feld" inputMode="decimal" value={manuell} onChange={(ev) => setManuell(ev.target.value)} />
              </Feld>
              <button type="button" className="knopf-sekundaer mb-7" onClick={() => speichern({})}>Übernehmen</button>
            </div>
            {ueber25 &&
              w.zeilen.map((z) => (
                <Feld key={z.besuchId} label={`Begründung über 25 km: ${z.name}`} hilfe="Hausgeburt, Vertretung (Name der Hebamme) oder keine Hebamme im Umkreis von 25 km.">
                  <input className="feld" value={begruendungen[z.besuchId] ?? ""} onChange={(ev) => setBegruendungen({ ...begruendungen, [z.besuchId]: ev.target.value })} onBlur={() => speichern({ begruendungen })} />
                </Feld>
              ))}
          </div>
        </details>
      )}
    </div>
  );
}
