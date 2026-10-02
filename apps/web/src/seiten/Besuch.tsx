import {
  DOKU_FELDER,
  LEISTUNGSART_LABEL,
  LEISTUNGSTYPEN,
  LEISTUNGSTYP_LABEL,
  lebenstag,
  sswAusEt,
  type Ansicht,
  type Ergebnis,
  type Leistungsart,
  type Leistungstyp,
} from "@kindkesmoeoen/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { DokuKachel, type FruehererWert } from "../komponenten/DokuKachel";
import { GewichtFenster } from "./Gewicht";
import { Feld, Laden, Meldung } from "../komponenten/Formular";
import { UnterschriftFeld } from "../komponenten/Unterschrift";
import { ApiFehler, api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { datum as datumFormat, euro } from "../lib/format";
import type { Abrechnung, Kind } from "../lib/typen";
import { useDaten } from "../lib/useDaten";

type BetreuungDetail = {
  id: string;
  status: string;
  et: string | null;
  klientin: { id: string; vorname: string; nachname: string; ort: string | null; hinweise: string | null };
  kinder: Kind[];
};
type DokuMutter = Record<string, string>;
type DokuKind = Record<string, string>;
type Unterschrift = { art: "keine" } | { art: "papier"; zeitpunkt: string } | { art: "tablet"; zeitpunkt: string; bild: string; name?: string | null };
type Werte = {
  datum: string;
  von: string;
  bis: string;
  typ: Leistungstyp;
  art: Leistungsart;
  material: string[];
  mutter: DokuMutter;
  kinder: Record<string, DokuKind>;
  notiz: string;
  unterschrift: Unterschrift;
};
type BesuchDetail = {
  id: string;
  betreuungId: string;
  hebammeId: string;
  datum: string;
  von: string;
  bis: string;
  typ: Leistungstyp;
  art: Leistungsart;
  material: string[];
  status: "entwurf" | "abgeschlossen";
  dokumentation: { mutter?: Record<string, unknown>; kinder?: Record<string, Record<string, unknown>>; notiz?: string | null };
  unterschrift: Unterschrift;
  versionen: Array<{ id: string; zeit: string }>;
};

const MATERIAL_LABEL: Record<string, string> = {
  "60100": "Material Schwangerschaft",
  "60200": "Material Vorsorge",
  "60300": "Blutentnahme (Frau)",
  "60400": "GDM-Screening",
  "60500": "CTG",
  "60600": "Material Stillvorbereitung",
  "60700": "Abklärung Blasensprung",
  "61100": "Pulsoxymetrie",
  "61400": "Neugeborenen-Screening",
  "61500": "Blutentnahme Kind (Bilirubin)",
  "61600": "Fäden ziehen Dammnaht",
  "61700": "Fäden/Klammern Sectio",
};

const jetzt = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const heute = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const alsText = (o: Record<string, unknown> | undefined) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)]));

/** Neuer Besuch (/betreuungen/:betreuungId/besuch) oder bestehender (/besuche/:id). */
export function Besuch() {
  const { betreuungId, id } = useParams();
  const vorhanden = useDaten<BesuchDetail>(id ? `/api/besuche/${id}` : null);
  const bid = betreuungId ?? vorhanden.daten?.betreuungId;
  const betreuung = useDaten<BetreuungDetail>(bid ? `/api/betreuungen/${bid}` : null);
  const einstellung = useDaten<Abrechnung | null>("/api/ich/abrechnung");
  const ansicht = useDaten<Ansicht>("/api/ich/ansicht");
  const alle = useDaten<FruehererBesuch[]>(bid ? `/api/betreuungen/${bid}/besuche` : null);

  if ((id && !vorhanden.daten) || !betreuung.daten || einstellung.daten === undefined || !ansicht.daten || !alle.daten) {
    return vorhanden.fehler || betreuung.fehler ? <Meldung art="fehler">{vorhanden.fehler ?? betreuung.fehler}</Meldung> : <Laden />;
  }
  return <BesuchFormular betreuung={betreuung.daten} besuch={vorhanden.daten} unterschriftVerfahren={einstellung.daten?.unterschrift ?? "papier"} ansicht={ansicht.daten} alleBesuche={alle.daten} />;
}

type FruehererBesuch = { id: string; datum: string; von: string; dokumentation: { mutter?: Record<string, unknown>; kinder?: Record<string, Record<string, unknown>> } };

function BesuchFormular({
  betreuung,
  besuch,
  unterschriftVerfahren,
  ansicht,
  alleBesuche,
}: {
  betreuung: BetreuungDetail;
  besuch?: BesuchDetail;
  unterschriftVerfahren: "papier" | "tablet";
  ansicht: Ansicht;
  alleBesuche: FruehererBesuch[];
}) {
  const navigate = useNavigate();
  const { ich } = useAuth();
  // Aus der Tour geöffnet: Termin verknüpfen, Datum/Typ übernehmen und danach zur Tour zurück
  const [suche] = useSearchParams();
  const terminId = suche.get("termin");
  const zurueck = suche.get("zurueck")?.startsWith("/") ? suche.get("zurueck")! : null;
  const geboren = betreuung.kinder.length > 0;
  const gesperrt = besuch?.status === "abgeschlossen"; // Leistungsdaten nach Unterschrift nicht mehr ändern
  const fremd = Boolean(besuch && besuch.hebammeId !== ich?.id);

  const [w, setW] = useState<Werte>(() => ({
    datum: besuch?.datum ?? (suche.get("datum") || heute()),
    von: besuch?.von ?? jetzt(),
    bis: besuch?.bis ?? "",
    typ: besuch?.typ ?? ((suche.get("typ") as Leistungstyp | null) || (geboren ? "wochenbett" : "vorsorge")),
    art: besuch?.art ?? 1,
    material: besuch?.material ?? [],
    mutter: alsText(besuch?.dokumentation.mutter),
    kinder: Object.fromEntries(betreuung.kinder.map((k) => [k.id, alsText(besuch?.dokumentation.kinder?.[k.id])])),
    notiz: besuch?.dokumentation.notiz ?? "",
    unterschrift: besuch?.unterschrift ?? { art: "keine" },
  }));
  const [verfahren, setVerfahren] = useState<"papier" | "tablet">(besuch?.unterschrift.art === "tablet" ? "tablet" : besuch?.unterschrift.art === "papier" ? "papier" : unterschriftVerfahren);
  const [vorschau, setVorschau] = useState<Ergebnis>();
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler" | "hinweis"; text: string }>();
  const [speichert, setSpeichert] = useState(false);
  const [abrechnungOffen, setAbrechnungOffen] = useState(false);
  const [gewichtKind, setGewichtKind] = useState<string | null>(null);
  const schliessenGewicht = useCallback(() => setGewichtKind(null), []);

  const setze = <K extends keyof Werte>(k: K, v: Werte[K]) => setW((alt) => ({ ...alt, [k]: v }));
  const setzeMutter = (k: string, v: string) => setW((alt) => ({ ...alt, mutter: { ...alt.mutter, [k]: v } }));
  const setzeKind = (kindId: string, k: string, v: string) => setW((alt) => ({ ...alt, kinder: { ...alt.kinder, [kindId]: { ...alt.kinder[kindId], [k]: v } } }));

  const nutzlast = (abschliessen: boolean) => ({
    datum: w.datum,
    von: w.von,
    bis: w.bis || w.von,
    typ: w.typ,
    art: w.art,
    material: w.material,
    dokumentation: { mutter: w.mutter, kinder: w.kinder, notiz: w.notiz },
    unterschrift: w.unterschrift,
    abschliessen,
  });

  // Live-Vorschau der Abrechnung (verzögert, damit nicht bei jedem Tastendruck gerechnet wird)
  const vorschauSchluessel = `${w.datum}|${w.von}|${w.bis}|${w.typ}|${w.art}|${w.material.join(",")}`;
  const zaehler = useRef(0);
  useEffect(() => {
    if (!w.bis) {
      setVorschau(undefined);
      return;
    }
    const nr = ++zaehler.current;
    const t = setTimeout(async () => {
      try {
        const e = await api<Ergebnis>(`/api/betreuungen/${betreuung.id}/besuche/vorschau${besuch ? `?besuchId=${besuch.id}` : ""}`, { method: "POST", body: nutzlast(false) });
        if (nr === zaehler.current) setVorschau(e);
      } catch {
        /* Eingaben noch unvollständig */
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vorschauSchluessel]);

  // Frühere Besuche (vor diesem), neueste zuerst – für „Zuletzt …“ an den Feldern
  const frueher = useMemo(
    () =>
      alleBesuche
        .filter((b) => b.id !== besuch?.id && `${b.datum} ${b.von}` < `${w.datum} ${w.von}`)
        .sort((a, b) => `${b.datum} ${b.von}`.localeCompare(`${a.datum} ${a.von}`)),
    [alleBesuche, besuch?.id, w.datum, w.von],
  );
  const lt = geboren ? lebenstag(betreuung.kinder[0]!.geburtsdatum, w.datum) : null;
  const ssw = !geboren && betreuung.et ? sswAusEt(betreuung.et, w.datum).text : null;
  // Material aus dem am Besuchstag gültigen Regelwerk (inkl. dort neu angelegter Materialpauschalen)
  const materialListe = useDaten<Array<{ gpos: string; bezeichnung: string }>>(`/api/material?datum=${w.datum}&typ=${w.typ}`);
  const materialOptionen = (materialListe.daten ?? []).map((m) => m.gpos);
  const materialName = (g: string) => MATERIAL_LABEL[g] ?? materialListe.daten?.find((m) => m.gpos === g)?.bezeichnung ?? g;
  const typen = useMemo(() => LEISTUNGSTYPEN.filter((t) => (geboren ? t === "wochenbett" : t !== "wochenbett")), [geboren]);
  const brauchtUnterschrift = w.art === 1 || w.art === 2;

  async function speichern(abschliessen: boolean) {
    setSpeichert(true);
    setMeldung(undefined);
    try {
      const r = await api<{ besuch: { id: string }; ergebnis: Ergebnis }>(besuch ? `/api/besuche/${besuch.id}` : `/api/betreuungen/${betreuung.id}/besuche${terminId ? `?termin=${terminId}` : ""}`, {
        method: besuch ? "PUT" : "POST",
        body: nutzlast(abschliessen || gesperrt),
      });
      navigate(zurueck ?? `/klientinnen/${betreuung.klientin.id}`, { replace: true });
      return r;
    } catch (e) {
      setMeldung({ art: "fehler", text: e instanceof ApiFehler ? e.message : String(e) });
    } finally {
      setSpeichert(false);
    }
  }

  async function loeschen() {
    if (!besuch || !confirm("Entwurf löschen?")) return;
    await api(`/api/besuche/${besuch.id}`, { method: "DELETE" });
    navigate(`/klientinnen/${betreuung.klientin.id}`, { replace: true });
  }

  return (
    <>
      {/* ---------------------------------------------------- Kopfzeile (bleibt beim Scrollen stehen) mit Abrechnung */}
      {/* Hintergrund über die ganze Breite des Inhaltsbereichs (Pseudo-Element, an der Seitenleiste abgeschnitten durch overflow-x-clip im Layout) */}
      <div className="sticky top-0 z-30 -mt-6 mb-5 bg-sand-50 pt-3 pb-3 before:absolute before:inset-y-0 before:-right-[100vw] before:-left-[100vw] before:-z-10 before:border-b before:border-sand-200 before:bg-sand-50 before:shadow-sm dark:bg-salbei-900 dark:before:border-salbei-700 dark:before:bg-salbei-900">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link to={zurueck ?? `/klientinnen/${betreuung.klientin.id}`} className="inline-flex min-h-9 items-center text-sm text-salbei-600">‹ {zurueck?.startsWith("/tour") ? "Tour" : zurueck === "/" ? "Heute" : `${betreuung.klientin.vorname} ${betreuung.klientin.nachname}`}</Link>
              <h1 className="truncate text-xl font-semibold text-salbei-700 sm:text-2xl dark:text-salbei-100">
                {betreuung.klientin.vorname} {betreuung.klientin.nachname} · {besuch ? (gesperrt ? "Besuch (abgeschlossen)" : "Besuch bearbeiten") : "Besuch dokumentieren"}
              </h1>
              <p className="truncate text-sm text-slate-600 dark:text-slate-300">
                {lt !== null ? `${lt}. Lebenstag` : ssw ? `SSW ${ssw}` : ""}
                {betreuung.kinder.length ? ` · ${betreuung.kinder.map((k) => k.vorname).join(" & ")}` : ""}
                {betreuung.klientin.ort ? ` · ${betreuung.klientin.ort}` : ""}
              </p>
            </div>
            {!fremd && (
              <div className="flex flex-wrap items-center gap-2">
                {besuch && !gesperrt && <button type="button" className="knopf-gefahr min-h-11 px-3 text-sm" onClick={loeschen}>Löschen</button>}
                {!gesperrt && <button type="button" className="knopf-sekundaer min-h-11 px-4" disabled={speichert} onClick={() => speichern(false)}>Entwurf</button>}
                <button type="button" className="knopf-primaer min-h-11 px-5" disabled={speichert || !w.bis} onClick={() => speichern(true)}>{gesperrt ? "Änderungen speichern" : "Abschließen"}</button>
              </div>
            )}
          </div>
          {/* Abrechnung kompakt; Einzelheiten aufklappbar */}
          <button type="button" aria-expanded={abrechnungOffen} onClick={() => setAbrechnungOffen((x) => !x)} className="mt-2 flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-white px-3 py-2 text-left text-sm shadow-sm dark:bg-salbei-900/60">
            <span className="font-semibold">Abrechnung</span>
            {!w.bis ? (
              <span className="text-slate-500">Ende eintragen, um die Leistungen zu berechnen</span>
            ) : !vorschau ? (
              <span className="text-slate-500">wird berechnet …</span>
            ) : (
              <>
                <span>{vorschau.einheitenAbrechenbar * 5} von {vorschau.einheiten * 5} Min.{vorschau.stamm ? ` · ${vorschau.stamm}XX` : ""}</span>
                <span className="font-semibold">{euro(vorschau.summe)}</span>
                {vorschau.hinweise.some((h) => h.stufe === "fehler") && <span className="rounded-full bg-tulpe-100 px-2 py-0.5 font-medium text-tulpe-500">{vorschau.hinweise.filter((h) => h.stufe === "fehler").length} Fehler</span>}
                {vorschau.hinweise.some((h) => h.stufe === "warnung") && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">{vorschau.hinweise.filter((h) => h.stufe === "warnung").length} Hinweis(e)</span>}
              </>
            )}
            <span className="ml-auto text-salbei-600">{abrechnungOffen ? "▲ weniger" : "▼ Einzelheiten"}</span>
          </button>
          {abrechnungOffen && vorschau && w.bis && (
            <div className="mt-2 max-h-[45vh] space-y-2 overflow-y-auto rounded-xl bg-white p-3 text-sm shadow-sm dark:bg-salbei-900/60">
              {vorschau.zeilen.length > 0 && (
                <table className="w-full">
                  <tbody>
                    {vorschau.zeilen.map((z) => (
                      <tr key={z.gpos} className="border-t border-sand-200 first:border-0 dark:border-salbei-700">
                        <td className="py-1.5 pr-2 font-mono">{z.gpos}</td>
                        <td className="py-1.5 pr-2">{z.einheit === "5min" ? `${z.menge} × 5 Min.` : z.automatisch ? "automatisch" : materialName(z.gpos)}{z.zuschlag ? " · Zuschlag" : ""}</td>
                        <td className="py-1.5 text-right font-medium">{euro(z.betrag)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {vorschau.hinweise.map((h) => (
                <Meldung key={h.text} art={h.stufe === "fehler" ? "fehler" : h.stufe === "warnung" ? "hinweis" : "ok"}>
                  <span className="text-sm">{h.text}</span>
                </Meldung>
              ))}
            </div>
          )}
          {/* Fehler immer sichtbar, auch zugeklappt */}
          {!abrechnungOffen && vorschau?.hinweise.filter((h) => h.stufe === "fehler").map((h) => <p key={h.text} className="mt-1 text-sm text-tulpe-500">{h.text}</p>)}
        </div>
      </div>

      {betreuung.klientin.hinweise && <div className="mb-4"><Meldung art="hinweis">{betreuung.klientin.hinweise}</Meldung></div>}
      {fremd && <div className="mb-4"><Meldung art="hinweis">Dieser Besuch wurde von einer Kollegin dokumentiert und kann nur von ihr geändert werden.</Meldung></div>}
      {meldung && <div className="mb-4"><Meldung art={meldung.art}>{meldung.text}</Meldung></div>}

      <div className="space-y-5">
        <div className="space-y-5">
          {/* ---------------------------------------------------- Leistung */}
          <section className="karte space-y-4">
            <h2 className="text-lg font-semibold">Leistung</h2>
            {gesperrt && <p className="text-sm text-slate-500">Nach der Unterschrift sind Datum, Zeiten und Leistung fest. Korrekturen laut § 12: Zeile streichen, neu ausfüllen und neu unterschreiben lassen.</p>}
            <fieldset disabled={gesperrt || fremd} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Feld label="Datum"><input className="feld" type="date" value={w.datum} onChange={(e) => setze("datum", e.target.value)} /></Feld>
                <Feld label="Beginn">
                  <div className="flex gap-2">
                    <input className="feld" type="time" value={w.von} onChange={(e) => setze("von", e.target.value)} />
                    <button type="button" className="knopf-sekundaer shrink-0 px-3" onClick={() => setze("von", jetzt())}>Jetzt</button>
                  </div>
                </Feld>
                <Feld label="Ende">
                  <div className="flex gap-2">
                    <input className="feld" type="time" value={w.bis} onChange={(e) => setze("bis", e.target.value)} />
                    <button type="button" className="knopf-sekundaer shrink-0 px-3" onClick={() => setze("bis", jetzt())}>Jetzt</button>
                  </div>
                </Feld>
              </div>
              <div>
                <span className="etikett">Art</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {([1, 2, 3, 4] as Leistungsart[]).map((a) => (
                    <button key={a} type="button" aria-pressed={w.art === a} onClick={() => setze("art", a)} className={`min-h-12 rounded-xl font-medium ${w.art === a ? "bg-salbei-600 text-white" : "border border-sand-200 bg-white dark:border-salbei-700 dark:bg-salbei-900/40"}`}>
                      {LEISTUNGSART_LABEL[a]}
                    </button>
                  ))}
                </div>
              </div>
              {typen.length > 1 && (
                <Feld label="Leistung">
                  <select className="feld" value={w.typ} onChange={(e) => setW((alt) => ({ ...alt, typ: e.target.value as Leistungstyp, material: [] }))}>
                    {typen.map((t) => <option key={t} value={t}>{LEISTUNGSTYP_LABEL[t]}</option>)}
                  </select>
                </Feld>
              )}
              {materialOptionen.length > 0 && w.art <= 2 && (
                <div>
                  <span className="etikett">Material</span>
                  <div className="flex flex-wrap gap-2">
                    {materialOptionen.map((m) => {
                      const an = w.material.includes(m);
                      return (
                        <button key={m} type="button" aria-pressed={an} onClick={() => setze("material", an ? w.material.filter((x) => x !== m) : [...w.material, m])} className={`min-h-11 rounded-full px-4 text-sm font-medium ${an ? "bg-salbei-600 text-white" : "border border-sand-200 bg-white dark:border-salbei-700 dark:bg-salbei-900/40"}`}>
                          {materialName(m)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </fieldset>
          </section>

          {/* ---------------------------------------------------- Dokumentation Mutter */}
          <DokuKachel
            titel="Mutter"
            felder={DOKU_FELDER.mutter.filter((f) => geboren || !f.nachGeburt)}
            werte={w.mutter}
            setze={setzeMutter}
            einstellungen={ansicht.mutter}
            frueher={frueher.map((b) => ({ datum: b.datum, werte: b.dokumentation.mutter ?? {} }))}
            offenStandard={ansicht.mutterOffen}
            gesperrt={fremd}
          />

          {/* ---------------------------------------------------- Dokumentation Kinder */}
          {betreuung.kinder.map((k) => (
            <DokuKachel
              key={k.id}
              titel={k.vorname}
              felder={DOKU_FELDER.kind}
              werte={w.kinder[k.id] ?? {}}
              setze={(f, v) => setzeKind(k.id, f, v)}
              einstellungen={ansicht.kind}
              frueher={frueher.map((b): FruehererWert => ({ datum: b.datum, werte: b.dokumentation.kinder?.[k.id] ?? {} }))}
              offenStandard={ansicht.kindOffen}
              gesperrt={fremd}
              kopfZusatz={
                <button type="button" className="knopf-sekundaer shrink-0 px-3 text-sm" onClick={() => setGewichtKind(k.id)}>
                  Gewichtsverlauf
                </button>
              }
              feldHilfe={(f, wert) => {
                if (f.id !== "gewicht" || !k.geburtsgewicht) return null;
                const g = Number(String(wert).replace(",", "."));
                if (!g) return null;
                const differenz = ((g - k.geburtsgewicht) / k.geburtsgewicht) * 100;
                return <span className={`block ${differenz <= -10 ? "font-medium text-tulpe-500" : ""}`}>{differenz > 0 ? "+" : ""}{differenz.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % zum Geburtsgewicht</span>;
              }}
            />
          ))}

          <fieldset disabled={fremd} className="karte">
            <Feld label="Notiz / Beratung">
              <textarea className="feld min-h-28" value={w.notiz} onChange={(e) => setze("notiz", e.target.value)} placeholder="Beratungsthemen, Auffälligkeiten, Absprachen …" />
            </Feld>
          </fieldset>

          {/* ---------------------------------------------------- Unterschrift */}
          {brauchtUnterschrift && !fremd && (
            <section className="karte space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Unterschrift der Versicherten</h2>
                {!gesperrt && w.unterschrift.art === "keine" && (
                  <button type="button" className="min-h-11 text-sm font-medium text-salbei-600" onClick={() => setVerfahren(verfahren === "papier" ? "tablet" : "papier")}>
                    {verfahren === "papier" ? "Stattdessen auf dem Tablet" : "Stattdessen auf Papier"}
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-500">Direkt nach der Leistung unterschreiben lassen; nachträgliche oder gesammelte Unterschriften sind unzulässig (§ 12 Anlage 1.1).</p>
              {w.unterschrift.art === "tablet" && gesperrt ? (
                <img src={w.unterschrift.bild} alt="Unterschrift" className="h-32 rounded-xl border border-sand-200 bg-white p-2" />
              ) : w.unterschrift.art === "papier" && gesperrt ? (
                <p>✓ Auf dem Formular unterschrieben ({new Date(w.unterschrift.zeitpunkt).toLocaleString("de-DE")})</p>
              ) : verfahren === "tablet" ? (
                <UnterschriftFeld aendern={(bild) => setze("unterschrift", bild ? { art: "tablet", zeitpunkt: new Date().toISOString(), bild, name: `${betreuung.klientin.vorname} ${betreuung.klientin.nachname}` } : { art: "keine" })} />
              ) : (
                <>
                  {vorschau?.formularzeile && (
                    <div className="rounded-xl bg-salbei-50 p-4 text-sm dark:bg-salbei-700/30">
                      <div className="mb-1 font-medium">Auf Formular {vorschau.formularzeile.formular} eintragen:</div>
                      <div>
                        {datumFormat(w.datum)} · {w.von}–{w.bis} · Spalte „{vorschau.formularzeile.spalte}“: <strong>{vorschau.formularzeile.eintrag}</strong>
                        {vorschau.materialAbgerechnet.filter((m) => !["61200", "61300"].includes(m)).map((m) => ` · ${materialName(m)}: X`)}
                      </div>
                    </div>
                  )}
                  <label className="flex min-h-12 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      className="size-6 accent-salbei-600"
                      checked={w.unterschrift.art === "papier"}
                      onChange={(e) => setze("unterschrift", e.target.checked ? { art: "papier", zeitpunkt: new Date().toISOString() } : { art: "keine" })}
                    />
                    Die Versicherte hat die Zeile auf dem Formular unterschrieben.
                  </label>
                </>
              )}
            </section>
          )}
        </div>

        {besuch?.versionen.length ? <p className="text-xs text-slate-500">{besuch.versionen.length} frühere Version(en) gespeichert.</p> : null}
        {gewichtKind && (
          <GewichtFenster
            kindId={gewichtKind}
            besuchId={besuch?.id}
            aktuell={(() => {
              const g = Number(String(w.kinder[gewichtKind]?.gewicht ?? "").replace(",", "."));
              return g > 0 ? { datum: w.datum, gramm: g } : null;
            })()}
            schliessen={schliessenGewicht}
          />
        )}
      </div>
    </>
  );
}
