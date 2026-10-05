import { KURS_FORMATE, type KursFormat } from "@kindkesmoeoen/shared";
import { useEffect, useState } from "react";
import { Feld, Laden, Meldung } from "../komponenten/Formular";
import { ApiFehler, api } from "../lib/api";
import { datum, euro } from "../lib/format";

type OffenerKurs = {
  id: string;
  titel: string;
  art: string;
  beschreibung: string | null;
  ort: string;
  preis: number | null;
  partnerPreis: number | null;
  kasse: boolean;
  termine: Array<{ datum: string; von: string; bis: string; format: KursFormat }>;
  freiePlaetze: number;
  stichtag: "et" | "geburt";
};

/** Öffentliche Kursanmeldung (ohne Anmeldung in der App), von der Praxis-Website verlinkt: /anmeldung bzw. /anmeldung?kurs=<id> */
export function Anmeldung() {
  const [kurse, setKurse] = useState<OffenerKurs[]>();
  const [fehler, setFehler] = useState<string>();
  const [gewaehlt, setGewaehlt] = useState<OffenerKurs | null>(null);
  const [fertig, setFertig] = useState<{ warteliste: boolean } | null>(null);

  useEffect(() => {
    document.title = "Kursanmeldung · Hebammenpraxis Kindkesmöön";
    api<OffenerKurs[]>("/api/oeffentlich/kurse").then((liste) => {
      setKurse(liste);
      // Direktlink von der Website: /anmeldung?kurs=<id> öffnet gleich das Formular
      const id = new URLSearchParams(window.location.search).get("kurs");
      const kurs = id ? liste.find((k) => k.id === id) : undefined;
      if (kurs) setGewaehlt(kurs);
    }, (e) => setFehler((e as Error).message));
  }, []);

  return (
    <div className="min-h-full bg-sand-50 px-4 py-8 dark:bg-salbei-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-4">
          <img src="/logo.png" alt="" className="size-16" />
          <div>
            <h1 className="text-2xl font-semibold text-salbei-700 sm:text-3xl dark:text-salbei-100">Kursanmeldung</h1>
            <p className="text-slate-600 dark:text-slate-300">Hebammenpraxis Kindkesmöön · Bad Doberan</p>
          </div>
        </div>
        {fertig ? (
          <div className="karte space-y-3">
            <h2 className="text-xl font-semibold">Vielen Dank!</h2>
            <p>{fertig.warteliste ? "Der Kurs ist im Moment ausgebucht – du stehst auf der Warteliste. Wir melden uns, sobald ein Platz frei wird." : "Deine Anmeldung ist bei uns eingegangen. Wir melden uns mit einer Bestätigung bei dir."}</p>
            <button type="button" className="knopf-sekundaer" onClick={() => { setFertig(null); setGewaehlt(null); }}>Weitere Anmeldung</button>
          </div>
        ) : gewaehlt ? (
          <Formular kurs={gewaehlt} zurueck={() => setGewaehlt(null)} fertig={setFertig} />
        ) : !kurse ? (
          fehler ? <Meldung art="fehler">{fehler}</Meldung> : <Laden />
        ) : !kurse.length ? (
          <p className="karte">Zurzeit sind keine Kurse zur Anmeldung freigeschaltet.</p>
        ) : (
          <ul className="space-y-4">
            {kurse.map((k) => (
              <li key={k.id} className="karte space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{k.titel}</h2>
                    <p className="text-sm text-slate-500">{k.art} · {k.ort} · {k.kasse ? "Kosten übernimmt die Krankenkasse" : k.preis != null ? euro(k.preis) : ""}{k.partnerPreis != null ? ` · Partner ${euro(k.partnerPreis)}` : ""}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${k.freiePlaetze ? "bg-salbei-100 text-salbei-700" : "bg-amber-100 text-amber-800"}`}>{k.freiePlaetze ? `${k.freiePlaetze} Plätze frei` : "Warteliste"}</span>
                </div>
                {k.beschreibung && <p className="text-slate-600 dark:text-slate-300">{k.beschreibung}</p>}
                {k.termine.length > 0 && (
                  <p className="text-sm">
                    {k.termine.length} Termine: {k.termine.map((t) => `${datum(t.datum)}${t.format === 6 ? " (Video)" : ` ${t.von}`}`).join(" · ")}
                  </p>
                )}
                <button type="button" className="knopf-primaer" onClick={() => setGewaehlt(k)}>{k.freiePlaetze ? "Anmelden" : "Auf die Warteliste"}</button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-8 text-xs text-slate-500">Deine Angaben werden nur zur Organisation des Kurses verwendet und nicht an Dritte weitergegeben.</p>
      </div>
    </div>
  );
}

function Formular({ kurs, zurueck, fertig }: { kurs: OffenerKurs; zurueck: () => void; fertig: (r: { warteliste: boolean }) => void }) {
  const [w, setW] = useState({ name: "", email: "", telefon: "", stichtag: "", krankenkasse: "", partner: false, nachricht: "", einwilligung: false, webseite: "" });
  const [felder, setFelder] = useState<Record<string, string>>({});
  const [meldung, setMeldung] = useState<string>();
  const [sendet, setSendet] = useState(false);
  const rb = kurs.stichtag === "geburt";

  async function senden() {
    setSendet(true);
    setMeldung(undefined);
    setFelder({});
    try {
      const r = await api<{ ok: true; warteliste: boolean }>(`/api/oeffentlich/kurse/${kurs.id}/anmeldung`, {
        method: "POST",
        body: { ...w, telefon: w.telefon || null, stichtag: w.stichtag || null, krankenkasse: w.krankenkasse || null, nachricht: w.nachricht || null, einwilligung: w.einwilligung || undefined, webseite: w.webseite || undefined },
      });
      fertig(r);
    } catch (e) {
      if (e instanceof ApiFehler) setFelder(e.felder);
      setMeldung((e as Error).message);
    } finally {
      setSendet(false);
    }
  }

  return (
    <div className="karte space-y-4">
      <button type="button" className="text-sm text-salbei-600" onClick={zurueck}>‹ Alle Kurse</button>
      <h2 className="text-xl font-semibold">{kurs.titel}</h2>
      <p className="text-sm text-slate-500">{kurs.termine.length ? `${datum(kurs.termine[0]!.datum)}–${datum(kurs.termine.at(-1)!.datum)} · ` : ""}{kurs.termine[0] ? KURS_FORMATE[kurs.termine[0].format] : ""} · {kurs.ort}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Feld label="Vor- und Nachname" fehler={felder.name}><input className="feld" autoComplete="name" value={w.name} onChange={(e) => setW({ ...w, name: e.target.value })} /></Feld>
        <Feld label="E-Mail" fehler={felder.email}><input className="feld" type="email" autoComplete="email" value={w.email} onChange={(e) => setW({ ...w, email: e.target.value })} /></Feld>
        <Feld label="Telefon (optional)"><input className="feld" type="tel" autoComplete="tel" value={w.telefon} onChange={(e) => setW({ ...w, telefon: e.target.value })} /></Feld>
        <Feld label={rb ? "Geburtsdatum des Kindes" : "Errechneter Termin"}><input className="feld" type="date" value={w.stichtag} onChange={(e) => setW({ ...w, stichtag: e.target.value })} /></Feld>
        {kurs.kasse && <Feld label="Krankenkasse"><input className="feld" value={w.krankenkasse} onChange={(e) => setW({ ...w, krankenkasse: e.target.value })} /></Feld>}
      </div>
      {kurs.partnerPreis != null && <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-6 accent-salbei-600" checked={w.partner} onChange={(e) => setW({ ...w, partner: e.target.checked })} /> Mit Partner/Begleitperson ({euro(kurs.partnerPreis)})</label>}
      <Feld label="Nachricht an uns (optional)"><textarea className="feld min-h-24" value={w.nachricht} maxLength={1000} onChange={(e) => setW({ ...w, nachricht: e.target.value })} /></Feld>
      {/* Honigtopf gegen automatische Formular-Einträge: für Menschen unsichtbar */}
      <input className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" value={w.webseite} onChange={(e) => setW({ ...w, webseite: e.target.value })} name="webseite" />
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-1 size-6 shrink-0 accent-salbei-600" checked={w.einwilligung} onChange={(e) => setW({ ...w, einwilligung: e.target.checked })} />
        <span>Ich bin einverstanden, dass die Hebammenpraxis Kindkesmöön meine Angaben zur Organisation des Kurses speichert und mich dazu kontaktiert.</span>
      </label>
      {felder.einwilligung && <p className="text-sm text-tulpe-500">{felder.einwilligung}</p>}
      {meldung && <Meldung art="fehler">{meldung}</Meldung>}
      <button type="button" className="knopf-primaer" disabled={sendet} onClick={senden}>{kurs.freiePlaetze ? "Verbindlich anmelden" : "Auf die Warteliste setzen"}</button>
    </div>
  );
}
