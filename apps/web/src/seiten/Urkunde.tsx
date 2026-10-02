import { URKUNDE_DESIGNS, nurWochenwerte, type Urkunde as UrkundeDaten, type UrkundeDesign, type UrkundeZeile } from "@kindkesmoeoen/shared";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Feld, Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { ApiFehler, api } from "../lib/api";
import { datum as datumDe } from "../lib/format";
import { useDaten } from "../lib/useDaten";

type Antwort = {
  kind: { id: string; vorname: string; nachname: string | null; geburtsdatum: string };
  klientin: { id: string; vorname: string; nachname: string };
  urkunde: (UrkundeDaten & { geaendertAm: string }) | null;
  vorschlag: UrkundeDaten;
  alleZeilen: UrkundeZeile[];
  texte: Array<{ id: string; name: string; text: string }>;
};

const OPTIONEN: Array<[keyof UrkundeDaten["optionen"], string]> = [
  ["kurve", "Gewichtskurve"],
  ["kurveLaenge", "Kurve der Größe (Länge)"],
  ["kurveKopfumfang", "Kurve des Kopfumfangs"],
  ["perzentilen", "WHO-Perzentilen in den Kurven"],
  ["sternzeichen", "Sternzeichen"],
  ["unterschrift", "Name der Hebamme als Unterschrift"],
  ["kursHinweis", "Hinweis auf Rückbildungs- und Babymassagekurse"],
];
const schluessel = (z: UrkundeZeile) => `${z.datum}`;

/** Kinderurkunde (M10): Text aus Vorlagen, Tabelle aus der Hebammenzeit, Meilensteine, Gestaltung, PDF. */
export function Urkunde() {
  const { id } = useParams();
  const daten = useDaten<Antwort>(`/api/kinder/${id}/urkunde`);
  // Meldung außerhalb des Formulars: es wird nach dem Speichern mit dem neuen Stand neu aufgebaut
  const [meldung, setMeldung] = useState<MeldungDaten>();
  if (!daten.daten) return daten.fehler ? <Meldung art="fehler">{daten.fehler}</Meldung> : <Laden />;
  return <UrkundeFormular key={daten.daten.urkunde?.geaendertAm ?? "neu"} d={daten.daten} neuLaden={daten.laden} meldung={meldung} setMeldung={setMeldung} />;
}

type MeldungDaten = { art: "ok" | "fehler" | "hinweis"; text: string } | undefined;

function UrkundeFormular({ d, neuLaden, meldung, setMeldung }: { d: Antwort; neuLaden: () => Promise<void>; meldung: MeldungDaten; setMeldung: (m: MeldungDaten) => void }) {
  const [u, setU] = useState<UrkundeDaten>(() => {
    if (!d.urkunde) return d.vorschlag;
    const { geaendertAm: _g, ...rest } = d.urkunde;
    return rest;
  });
  const [arbeitet, setArbeitet] = useState(false);
  const [vorschauUrl, setVorschauUrl] = useState<string>();
  const vorschauRef = useRef<string>(undefined);
  const setze = <K extends keyof UrkundeDaten>(k: K, v: UrkundeDaten[K]) => setU((alt) => ({ ...alt, [k]: v }));
  const gewaehlt = new Set(u.zeilen.map(schluessel));

  useEffect(() => () => {
    if (vorschauRef.current) URL.revokeObjectURL(vorschauRef.current);
  }, []);

  function vorlageWaehlen(vid: string) {
    const t = d.texte.find((x) => x.id === vid);
    if (!t) return;
    const geaendert = !d.texte.some((x) => x.text === u.text);
    if (geaendert && !confirm("Den bearbeiteten Text durch die Vorlage ersetzen?")) return;
    setU((alt) => ({ ...alt, textVorlage: vid, text: t.text }));
  }

  function zeileUmschalten(z: UrkundeZeile) {
    const k = schluessel(z);
    setze("zeilen", gewaehlt.has(k) ? u.zeilen.filter((x) => schluessel(x) !== k) : d.alleZeilen.filter((x) => gewaehlt.has(schluessel(x)) || schluessel(x) === k).map((x) => u.zeilen.find((y) => schluessel(y) === schluessel(x)) ?? x));
  }

  async function vorschau() {
    setArbeitet(true);
    setMeldung(undefined);
    try {
      const res = await fetch(`/api/kinder/${d.kind.id}/urkunde/vorschau.pdf`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
      if (!res.ok) throw new ApiFehler(res.status, ((await res.json().catch(() => ({}))) as { fehler?: string }).fehler ?? `Fehler ${res.status}`);
      if (vorschauRef.current) URL.revokeObjectURL(vorschauRef.current);
      vorschauRef.current = URL.createObjectURL(await res.blob());
      setVorschauUrl(vorschauRef.current);
    } catch (e) {
      setMeldung({ art: "fehler", text: e instanceof TypeError ? "Keine Verbindung – die Vorschau braucht den Server." : (e as Error).message });
    } finally {
      setArbeitet(false);
    }
  }

  async function speichern(status: UrkundeDaten["status"]) {
    setArbeitet(true);
    setMeldung(undefined);
    try {
      await api(`/api/kinder/${d.kind.id}/urkunde`, { method: "PUT", body: { ...u, status } });
      setMeldung({ art: "ok", text: status === "fertig" ? "Urkunde fertig und in der Akte gespeichert." : "Entwurf gespeichert." });
      await neuLaden();
    } catch (e) {
      setMeldung({ art: "fehler", text: (e as Error).message });
    } finally {
      setArbeitet(false);
    }
  }

  return (
    <>
      <Link to={`/klientinnen/${d.klientin.id}`} className="mb-3 inline-flex min-h-11 items-center text-salbei-600">‹ {d.klientin.vorname} {d.klientin.nachname}</Link>
      <Seitenkopf
        titel={`Kinderurkunde ${d.kind.vorname}`}
        untertitel={d.urkunde ? `${d.urkunde.status === "fertig" ? "Fertig" : "Entwurf"}, zuletzt gespeichert ${new Date(d.urkunde.geaendertAm).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}` : `geboren ${datumDe(d.kind.geburtsdatum)} · noch nicht gespeichert`}
        aktion={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="knopf-sekundaer" disabled={arbeitet} onClick={vorschau}>PDF-Vorschau</button>
            <button type="button" className="knopf-sekundaer" disabled={arbeitet} onClick={() => speichern("entwurf")}>Entwurf speichern</button>
            <button type="button" className="knopf-primaer" disabled={arbeitet} onClick={() => speichern("fertig")}>Fertig</button>
            {d.urkunde && <a className="knopf-sekundaer" href={`/api/kinder/${d.kind.id}/urkunde.pdf`} target="_blank" rel="noreferrer">Gespeichertes PDF öffnen</a>}
          </div>
        }
      />
      {meldung && <div className="mb-4"><Meldung art={meldung.art}>{meldung.text}</Meldung></div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <section className="karte space-y-4">
            <h2 className="text-lg font-semibold">Gestaltung</h2>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(URKUNDE_DESIGNS) as UrkundeDesign[]).map((k) => (
                <button key={k} type="button" aria-pressed={u.design === k} onClick={() => setze("design", k)} className={`min-h-12 rounded-xl px-2 text-sm font-medium ${u.design === k ? "bg-salbei-600 text-white" : "border border-sand-200 bg-white dark:border-salbei-700 dark:bg-salbei-900/40"}`}>
                  {URKUNDE_DESIGNS[k]}
                </button>
              ))}
            </div>
            <Feld label="Titel">
              <input className="feld" value={u.titel} onChange={(e) => setze("titel", e.target.value)} maxLength={60} />
            </Feld>
          </section>

          <section className="karte space-y-4">
            <h2 className="text-lg font-semibold">Persönlicher Text</h2>
            <Feld label="Vorlage">
              <select className="feld" value={u.textVorlage} onChange={(e) => vorlageWaehlen(e.target.value)}>
                {d.texte.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Feld>
            <Feld label="Text" hilfe="Frei bearbeitbar. Die Angaben (Datum, Uhrzeit, Ort) stammen aus der Akte.">
              <textarea className="feld min-h-48" value={u.text} onChange={(e) => setze("text", e.target.value)} maxLength={1500} />
            </Feld>
          </section>

          <section className="karte space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Tabelle aus der Hebammenzeit</h2>
              <div className="flex flex-wrap gap-2 text-sm">
                <button type="button" className="knopf-sekundaer min-h-10 px-3" onClick={() => setze("zeilen", d.alleZeilen)}>Alle</button>
                <button type="button" className="knopf-sekundaer min-h-10 px-3" onClick={() => setze("zeilen", nurWochenwerte(d.alleZeilen))}>Nur Wochenwerte</button>
                <button type="button" className="knopf-sekundaer min-h-10 px-3" onClick={() => setze("zeilen", [])}>Keine</button>
              </div>
            </div>
            {!d.alleZeilen.length && <p className="text-sm text-slate-500">Noch keine Messwerte dokumentiert.</p>}
            <ul className="divide-y divide-sand-200 dark:divide-salbei-700">
              {d.alleZeilen.map((z) => {
                const an = gewaehlt.has(schluessel(z));
                const eigene = u.zeilen.find((x) => schluessel(x) === schluessel(z));
                return (
                  <li key={schluessel(z)} className="flex flex-wrap items-center gap-3 py-2">
                    <input type="checkbox" className="size-6 accent-salbei-600" checked={an} onChange={() => zeileUmschalten(z)} aria-label={`Zeile ${datumDe(z.datum)}`} />
                    <span className="w-24 tabular-nums">{datumDe(z.datum)}</span>
                    <span className="w-14 text-sm text-slate-500">LT {z.lebenstag}</span>
                    <span className="min-w-28 flex-1 text-sm tabular-nums">
                      {[z.gewicht && `${z.gewicht.toLocaleString("de-DE")} g`, z.laenge && `${z.laenge.toLocaleString("de-DE")} cm`, z.kopfumfang && `KU ${z.kopfumfang.toLocaleString("de-DE")} cm`].filter(Boolean).join(" · ")}
                    </span>
                    {an && (
                      <input
                        className="feld min-h-10 w-full py-1 text-sm sm:w-56"
                        placeholder="Besonderes"
                        value={eigene?.besonderes ?? ""}
                        maxLength={80}
                        onChange={(e) => setze("zeilen", u.zeilen.map((x) => (schluessel(x) === schluessel(z) ? { ...x, besonderes: e.target.value || null } : x)))}
                        aria-label={`Besonderes am ${datumDe(z.datum)}`}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="karte space-y-3">
            <h2 className="text-lg font-semibold">Meilensteine</h2>
            {u.meilensteine.map((m, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <input className="feld min-w-40 flex-1" value={m.text} placeholder="z. B. erstes Lächeln" maxLength={80} aria-label={`Meilenstein ${i + 1}`} onChange={(e) => setze("meilensteine", u.meilensteine.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                <input className="feld w-auto" type="date" value={m.datum ?? ""} aria-label={`Datum Meilenstein ${i + 1}`} onChange={(e) => setze("meilensteine", u.meilensteine.map((x, j) => (j === i ? { ...x, datum: e.target.value || null } : x)))} />
                <button type="button" className="knopf-gefahr px-3" aria-label={`Meilenstein ${i + 1} entfernen`} onClick={() => setze("meilensteine", u.meilensteine.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {["Erstes Baden", "Nabel abgefallen", "Erstes Lächeln", "Geburtsgewicht wieder erreicht"].filter((v) => !u.meilensteine.some((m) => m.text === v)).map((v) => (
                <button key={v} type="button" className="min-h-10 rounded-full border border-sand-200 bg-white px-3 text-sm dark:border-salbei-700 dark:bg-salbei-900/40" onClick={() => u.meilensteine.length < 10 && setze("meilensteine", [...u.meilensteine, { text: v, datum: null }])}>+ {v}</button>
              ))}
              <button type="button" className="min-h-10 rounded-full border border-dashed border-sand-200 px-3 text-sm" onClick={() => u.meilensteine.length < 10 && setze("meilensteine", [...u.meilensteine, { text: "", datum: null }])}>+ Eigener</button>
            </div>
          </section>

          <section className="karte space-y-2">
            <h2 className="text-lg font-semibold">Weitere Angaben</h2>
            {OPTIONEN.map(([k, label]) => (
              <label key={k} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input type="checkbox" className="size-6 accent-salbei-600" checked={Boolean(u.optionen[k])} disabled={k === "perzentilen" && !u.optionen.kurve && !u.optionen.kurveLaenge && !u.optionen.kurveKopfumfang} onChange={(e) => setze("optionen", { ...u.optionen, [k]: e.target.checked })} />
                {label}
              </label>
            ))}
            <p className="text-sm text-slate-500">Foto und Fußabdruck folgen mit der Foto-Dokumentation (Einwilligung der Eltern nötig).</p>
          </section>
        </div>

        <section className="karte lg:sticky lg:top-4 lg:self-start">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Vorschau</h2>
            {vorschauUrl && <a className="text-sm font-medium text-salbei-600 underline" href={vorschauUrl} target="_blank" rel="noreferrer">In neuem Tab öffnen / drucken</a>}
          </div>
          {vorschauUrl ? (
            <iframe title="Vorschau der Urkunde" src={vorschauUrl} className="h-[75vh] w-full rounded-xl border border-sand-200 bg-white dark:border-salbei-700" />
          ) : (
            <div className="flex h-60 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-sand-200 text-slate-500 dark:border-salbei-700">
              <p>Die Vorschau zeigt das druckfertige PDF.</p>
              <button type="button" className="knopf-sekundaer" disabled={arbeitet} onClick={vorschau}>PDF-Vorschau erstellen</button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
