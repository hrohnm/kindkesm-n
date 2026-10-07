import { FotoKarte } from "../komponenten/Fotos";
import { TeamKarte } from "../komponenten/TeamNachrichten";
import {
  BETREUUNG_STATUS,
  BETREUUNG_STATUS_LABEL,
  GESCHLECHTER,
  GESCHLECHT_LABEL,
  GEBURTSMODI,
  geburtsmodusLabel,
  besuchArtLabel,
  besuchTypLabel,
  lebenstag,
  sswAusEt,
  type BetreuungStatus,
} from "@kindkesmoeoen/shared";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Feld, Laden, Meldung } from "../komponenten/Formular";
import { EinwilligungenKarte, FlaggenAbzeichen, KontakteKarte, MerkmaleKarte } from "../komponenten/AkteZusatz";
import { PositionKarte } from "../komponenten/PositionKarte";
import { IconDrucken, IconPlus, IconStift } from "../komponenten/Icons";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { datum, euro } from "../lib/format";
import type { BesuchKurz, Betreuung, Kind, Klientin, KontingentStand, TeamMitglied } from "../lib/typen";
import { useDaten } from "../lib/useDaten";
import { useFormular } from "../lib/useFormular";
import { STATUS_FARBE } from "./Klientinnen";

const heute = () => new Date().toISOString().slice(0, 10);

export function Akte() {
  const { id } = useParams();
  const akte = useDaten<Klientin>(`/api/klientinnen/${id}`);
  const team = useDaten<TeamMitglied[]>("/api/team");
  const [stammBearbeiten, setStammBearbeiten] = useState(false);

  if (!akte.daten) return akte.fehler ? <Meldung art="fehler">{akte.fehler}</Meldung> : <Laden />;
  const k = akte.daten;
  const betreuung = k.betreuungen[0];
  const zustaendig = team.daten?.find((h) => h.id === k.zustaendigeHebammeId);

  return (
    <>
      <Link to="/klientinnen" className="mb-3 inline-flex min-h-11 items-center text-salbei-600">‹ Klientinnen</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-salbei-700 sm:text-3xl dark:text-salbei-100">
            {k.vorname} {k.nachname}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {[k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Keine Anschrift"} · zuständig {zustaendig?.name ?? "–"}
            {betreuung?.vertretungHebammeId ? ` · Vertretung ${team.daten?.find((h) => h.id === betreuung.vertretungHebammeId)?.name ?? ""}` : ""}
          </p>
          <div className="mt-2"><FlaggenAbzeichen flaggen={k.flaggen} sprache={k.sprache} /></div>
        </div>
        {betreuung && (
          <Link to={`/betreuungen/${betreuung.id}/besuch`} className="knopf-primaer">
            <IconPlus className="size-5" /> Besuch dokumentieren
          </Link>
        )}
      </div>

      {k.allergien && <div className="mb-4"><Meldung art="fehler"><strong>Allergien:</strong> {k.allergien}</Meldung></div>}
      {k.hinweise && <div className="mb-4"><Meldung art="hinweis">{k.hinweise}</Meldung></div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="karte">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Stammdaten</h2>
            <button type="button" className="knopf-sekundaer min-h-11 px-3" onClick={() => setStammBearbeiten((v) => !v)}>
              <IconStift className="size-5" /> {stammBearbeiten ? "Schließen" : "Bearbeiten"}
            </button>
          </div>
          {stammBearbeiten ? (
            <StammdatenFormular klientin={k} team={team.daten ?? []} fertig={async () => { setStammBearbeiten(false); await akte.laden(); }} />
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-slate-500">Geboren</dt><dd>{datum(k.geburtsdatum)}</dd>
              <dt className="text-slate-500">Telefon</dt><dd>{k.telefon ? <a className="text-salbei-600 underline" href={`tel:${k.telefon}`}>{k.telefon}</a> : "–"}</dd>
              <dt className="text-slate-500">E-Mail</dt><dd className="truncate">{k.email ?? "–"}</dd>
              <dt className="text-slate-500">Krankenkasse</dt><dd>{k.krankenkasse ?? "–"}{k.kassenIk ? ` (IK ${k.kassenIk})` : ""}</dd>
              <dt className="text-slate-500">Versichertennr.</dt><dd>{k.versichertennummer ?? <span className="text-tulpe-500">fehlt (für die Abrechnung nötig)</span>}</dd>
            </dl>
          )}
        </section>

        {betreuung && <BetreuungKarte betreuung={betreuung} team={team.daten ?? []} neuLaden={akte.laden} />}
        <MerkmaleKarte key={`m-${k.flaggen.join()}-${k.sprache}-${k.allergien}`} klientin={k} neuLaden={akte.laden} />
        <KontakteKarte klientin={k} neuLaden={akte.laden} />
      </div>


      {betreuung && (
        <>
          <KinderKarte betreuung={betreuung} neuLaden={akte.laden} />
          <Kontingente betreuungId={betreuung.id} />
          <Besuche betreuungId={betreuung.id} />
        </>
      )}
      <FotoKarte klientinId={k.id} kinder={betreuung?.kinder ?? []} />
      <TeamKarte klientinId={k.id} />
      <div className="mt-6">
        <EinwilligungenKarte klientin={k} neuLaden={akte.laden} />
      </div>
      <div className="mt-4">
        <PositionKarte
          titel="Wohnung auf der Karte"
          position={k.lat != null && k.lon != null ? { lat: k.lat, lon: k.lon } : null}
          quelle={k.geoQuelle}
          speichern={async (lat, lon) => {
            await api(`/api/klientinnen/${k.id}/position`, { method: "PUT", body: { lat, lon } });
            await akte.laden();
          }}
          ausAdresse={async () => {
            await api(`/api/klientinnen/${k.id}/verorten`, { method: "POST" });
            await akte.laden();
          }}
        />
      </div>
    </>
  );
}

function StammdatenFormular({ klientin, team, fertig }: { klientin: Klientin; team: TeamMitglied[]; fertig: () => void }) {
  const { betreuungen: _b, kontakte: _k, einwilligungen: _e, flaggen: _f, sprache: _s, allergien: _a, id, ...rest } = klientin;
  const leer = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v ?? ""])) as Record<keyof typeof rest, string>;
  const f = useFormular(leer);
  const feld = (name: keyof typeof rest, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Feld label={label} fehler={f.felder[name]}>
      <input className="feld" value={f.werte[name]} onChange={(e) => f.setze(name, e.target.value)} {...props} />
    </Feld>
  );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await f.speichern((w) => api(`/api/klientinnen/${id}`, { method: "PUT", body: w }))) fertig();
      }}
    >
      {f.meldung?.art === "fehler" && <Meldung art="fehler">{f.meldung.text}</Meldung>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {feld("vorname", "Vorname")}
        {feld("nachname", "Nachname")}
        {feld("geburtsdatum", "Geburtsdatum", { type: "date" })}
        {feld("telefon", "Telefon", { inputMode: "tel" })}
        {feld("strasse", "Straße")}
        <div className="grid grid-cols-[6rem_1fr] gap-2">
          {feld("plz", "PLZ", { inputMode: "numeric", maxLength: 5 })}
          {feld("ort", "Ort")}
        </div>
        {feld("email", "E-Mail", { type: "email" })}
        {feld("krankenkasse", "Krankenkasse")}
        {feld("kassenIk", "Kassen-IK", { inputMode: "numeric", maxLength: 9 })}
        {feld("versichertennummer", "Versichertennummer", { maxLength: 10, placeholder: "A123456789" })}
        <Feld label="Zuständige Hebamme" fehler={f.felder.zustaendigeHebammeId}>
          <select className="feld" value={f.werte.zustaendigeHebammeId} onChange={(e) => f.setze("zustaendigeHebammeId", e.target.value)}>
            {team.filter((h) => h.rolle === "hebamme").map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </Feld>
      </div>
      <Feld label="Hinweise für Besuche" fehler={f.felder.hinweise} hilfe="z. B. Hund, Parken, Etage, Sprache">
        <textarea className="feld min-h-20" value={f.werte.hinweise} onChange={(e) => f.setze("hinweise", e.target.value)} />
      </Feld>
      <button className="knopf-primaer" disabled={f.speichert}>Speichern</button>
    </form>
  );
}

function BetreuungKarte({ betreuung: b, team, neuLaden }: { betreuung: Betreuung; team: TeamMitglied[]; neuLaden: () => Promise<void> }) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const geburt = b.kinder[0]?.geburtsdatum;
  const f = useFormular({
    status: b.status,
    et: b.et ?? "",
    gravida: b.gravida?.toString() ?? "",
    para: b.para?.toString() ?? "",
    geburtsort: b.geburtsort ?? "",
    geburtsmodus: b.geburtsmodus ?? "",
    zustaendigeHebammeId: b.zustaendigeHebammeId ?? "",
    vertretungHebammeId: b.vertretungHebammeId ?? "",
    notizen: b.notizen ?? "",
    uebergabe: b.uebergabe ?? "",
  });
  return (
    <section className="karte">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Betreuung</h2>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_FARBE[b.status]}`}>{BETREUUNG_STATUS_LABEL[b.status]}</span>
      </div>
      {!bearbeiten ? (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-slate-500">ET</dt>
            <dd>{datum(b.et)}{!geburt && b.et ? ` · heute SSW ${sswAusEt(b.et, heute()).text}` : ""}</dd>
            {geburt && (<><dt className="text-slate-500">Geburt</dt><dd>{datum(geburt)} · heute {lebenstag(geburt, heute())}. Lebenstag</dd></>)}
            <dt className="text-slate-500">Gravida/Para</dt><dd>{b.gravida ?? "–"} / {b.para ?? "–"}</dd>
            <dt className="text-slate-500">Geburtsort</dt><dd>{b.geburtsort ?? "–"}</dd>
            <dt className="text-slate-500">Art der Geburt</dt><dd>{geburtsmodusLabel(b.geburtsmodus) ?? "–"}</dd>
            <dt className="text-slate-500">Vertretung</dt><dd>{team.find((h) => h.id === b.vertretungHebammeId)?.name ?? "–"}</dd>
          </dl>
          {b.notizen && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{b.notizen}</p>}
          {b.uebergabe && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-900/20" data-testid="uebergabe">
              <div className="font-semibold">Übergabe für die Vertretung{b.uebergabeAm ? ` · ${team.find((h) => h.id === b.uebergabeVon)?.name.split(" ")[0] ?? ""}, ${datum(b.uebergabeAm.slice(0, 10))}` : ""}</div>
              <p className="mt-1 whitespace-pre-line">{b.uebergabe}</p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="knopf-sekundaer min-h-11 px-3" onClick={() => setBearbeiten(true)}>
              <IconStift className="size-5" /> Bearbeiten
            </button>
            <a className="knopf-sekundaer min-h-11 px-3" href={`/api/betreuungen/${b.id}/formular/${geburt ? "3.3" : "3.1"}.pdf`} target="_blank" rel="noreferrer" title="Leeres Formular mit vorausgefülltem Kopf für die Mappe der Familie">
              <IconDrucken className="size-5" /> Formular {geburt ? "3.3" : "3.1"} drucken
            </a>
          </div>
        </>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await f.speichern((w) => api(`/api/betreuungen/${b.id}`, { method: "PUT", body: w }))) {
              setBearbeiten(false);
              await neuLaden();
            }
          }}
        >
          {f.meldung?.art === "fehler" && <Meldung art="fehler">{f.meldung.text}</Meldung>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Feld label="Status">
              <select className="feld" value={f.werte.status} onChange={(e) => f.setze("status", e.target.value as BetreuungStatus)}>
                {BETREUUNG_STATUS.map((s) => <option key={s} value={s}>{BETREUUNG_STATUS_LABEL[s]}</option>)}
              </select>
            </Feld>
            <Feld label="Errechneter Termin" fehler={f.felder.et}>
              <input className="feld" type="date" value={f.werte.et} onChange={(e) => f.setze("et", e.target.value)} />
            </Feld>
            <Feld label="Gravida" fehler={f.felder.gravida}><input className="feld" inputMode="numeric" value={f.werte.gravida} onChange={(e) => f.setze("gravida", e.target.value)} /></Feld>
            <Feld label="Para" fehler={f.felder.para}><input className="feld" inputMode="numeric" value={f.werte.para} onChange={(e) => f.setze("para", e.target.value)} /></Feld>
            <Feld label="Geburtsort"><input className="feld" value={f.werte.geburtsort} onChange={(e) => f.setze("geburtsort", e.target.value)} placeholder="z. B. Klinikum Südstadt Rostock" /></Feld>
            <Feld label="Art der Geburt"><GeburtsmodusAuswahl wert={f.werte.geburtsmodus} aendern={(v) => f.setze("geburtsmodus", v)} /></Feld>
            <Feld label="Vertretung" hilfe="Sieht den Fall unter „Meine“, z. B. bei Urlaub der zuständigen Hebamme">
              <select className="feld" value={f.werte.vertretungHebammeId} onChange={(e) => f.setze("vertretungHebammeId", e.target.value)}>
                <option value="">– keine –</option>
                {team.filter((h) => h.rolle === "hebamme").map((h) => <option key={h.id} value={h.id}>{h.name}{h.status === "babypause" ? " (Babypause)" : ""}</option>)}
              </select>
            </Feld>
          </div>
          <Feld label="Notizen"><textarea className="feld min-h-20" value={f.werte.notizen} onChange={(e) => f.setze("notizen", e.target.value)} /></Feld>
          <Feld label="Übergabe für die Vertretung (Worauf achten?)" hilfe="Die Vertretung bekommt bei jeder Änderung einen Hinweis im Cockpit und sieht die Übergabe im Besuch.">
            <textarea className="feld min-h-20" maxLength={1000} value={f.werte.uebergabe} onChange={(e) => f.setze("uebergabe", e.target.value)} placeholder="z. B. Hund – vorher anrufen; Mamillen wund, Stillposition üben; Partner spricht nur Englisch" />
          </Feld>
          <div className="flex gap-2">
            <button className="knopf-primaer" disabled={f.speichert}>Speichern</button>
            <button type="button" className="knopf-sekundaer" onClick={() => setBearbeiten(false)}>Abbrechen</button>
          </div>
        </form>
      )}
    </section>
  );
}

function KinderKarte({ betreuung, neuLaden }: { betreuung: Betreuung; neuLaden: () => Promise<void> }) {
  const [bearbeiten, setBearbeiten] = useState<Kind | "neu" | null>(null);
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kinder</h2>
        <button type="button" className="knopf-sekundaer" onClick={() => setBearbeiten("neu")}>
          <IconPlus className="size-5" /> Geburt / Kind erfassen
        </button>
      </div>
      {bearbeiten && (
        <KindFormular betreuungId={betreuung.id} geburtsmodus={betreuung.geburtsmodus} kind={bearbeiten === "neu" ? undefined : bearbeiten} fertig={async () => { setBearbeiten(null); await neuLaden(); }} />
      )}
      {betreuung.kinder.length === 0 && !bearbeiten && <p className="text-slate-500">Noch nicht geboren.</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {betreuung.kinder.map((k) => (
          <div key={k.id} className="karte">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{k.vorname} {k.nachname ?? ""}</div>
                <div className="text-sm text-slate-500">
                  geboren {datum(k.geburtsdatum)}{k.geburtszeit ? `, ${k.geburtszeit} Uhr` : ""} · {lebenstag(k.geburtsdatum, heute())}. Lebenstag
                </div>
              </div>
              <button type="button" aria-label={`${k.vorname} bearbeiten`} className="knopf-sekundaer min-h-11 shrink-0 px-3" onClick={() => setBearbeiten(k)}><IconStift className="size-5" /></button>
            </div>
            <div className="mt-2 text-sm">
              {k.geburtsgewicht ? `${k.geburtsgewicht.toLocaleString("de-DE")} g` : "– g"} · {k.laenge ? `${Number(k.laenge).toLocaleString("de-DE")} cm` : "– cm"} · KU {k.kopfumfang ? `${Number(k.kopfumfang).toLocaleString("de-DE")} cm` : "–"}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5">
              <Link to={`/kinder/${k.id}/gewicht`} className="inline-flex min-h-11 items-center font-medium text-salbei-600 underline">Wachstum und Perzentilen ›</Link>
              <Link to={`/kinder/${k.id}/urkunde`} className="inline-flex min-h-11 items-center font-medium text-salbei-600 underline">Kinderurkunde ›</Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function KindFormular({ betreuungId, geburtsmodus, kind, fertig }: { betreuungId: string; geburtsmodus: string | null; kind?: Kind; fertig: () => void }) {
  const f = useFormular({
    vorname: kind?.vorname ?? "",
    nachname: kind?.nachname ?? "",
    geburtsdatum: kind?.geburtsdatum ?? heute(),
    geburtszeit: kind?.geburtszeit ?? "",
    geschlecht: kind?.geschlecht ?? "",
    geburtsgewicht: kind?.geburtsgewicht?.toString() ?? "",
    laenge: kind?.laenge ?? "",
    kopfumfang: kind?.kopfumfang ?? "",
    geburtsmodus: geburtsmodus ?? "",
  });
  return (
    <form
      className="karte mb-4 space-y-3 border-salbei-300"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await f.speichern((w) => api(kind ? `/api/kinder/${kind.id}` : `/api/betreuungen/${betreuungId}/kinder`, { method: kind ? "PUT" : "POST", body: w }))) fertig();
      }}
    >
      {f.meldung?.art === "fehler" && <Meldung art="fehler">{f.meldung.text}</Meldung>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Feld label="Vorname" fehler={f.felder.vorname}><input className="feld" value={f.werte.vorname} onChange={(e) => f.setze("vorname", e.target.value)} /></Feld>
        <Feld label="Nachname" fehler={f.felder.nachname}><input className="feld" value={f.werte.nachname} onChange={(e) => f.setze("nachname", e.target.value)} /></Feld>
        <Feld label="Geburtsdatum" fehler={f.felder.geburtsdatum}><input className="feld" type="date" value={f.werte.geburtsdatum} onChange={(e) => f.setze("geburtsdatum", e.target.value)} /></Feld>
        <Feld label="Uhrzeit" fehler={f.felder.geburtszeit}><input className="feld" type="time" value={f.werte.geburtszeit} onChange={(e) => f.setze("geburtszeit", e.target.value)} /></Feld>
        <Feld label="Geschlecht">
          <select className="feld" value={f.werte.geschlecht} onChange={(e) => f.setze("geschlecht", e.target.value as typeof f.werte.geschlecht)}>
            <option value="">–</option>
            {GESCHLECHTER.map((g) => <option key={g} value={g}>{GESCHLECHT_LABEL[g]}</option>)}
          </select>
        </Feld>
        <Feld label="Geburtsgewicht (g)" fehler={f.felder.geburtsgewicht}><input className="feld" inputMode="numeric" value={f.werte.geburtsgewicht} onChange={(e) => f.setze("geburtsgewicht", e.target.value)} /></Feld>
        <Feld label="Länge (cm)" fehler={f.felder.laenge}><input className="feld" inputMode="decimal" value={f.werte.laenge} onChange={(e) => f.setze("laenge", e.target.value)} /></Feld>
        <Feld label="Kopfumfang (cm)" fehler={f.felder.kopfumfang}><input className="feld" inputMode="decimal" value={f.werte.kopfumfang} onChange={(e) => f.setze("kopfumfang", e.target.value)} /></Feld>
        <Feld label="Art der Geburt" hilfe="Bei Kaiserschnitt erscheint im Besuch das Feld „Kaiserschnittnarbe“."><GeburtsmodusAuswahl wert={f.werte.geburtsmodus} aendern={(v) => f.setze("geburtsmodus", v)} /></Feld>
      </div>
      <div className="flex gap-2">
        <button className="knopf-primaer" disabled={f.speichert}>Speichern</button>
        <button type="button" className="knopf-sekundaer" onClick={fertig}>Abbrechen</button>
      </div>
    </form>
  );
}

function Kontingente({ betreuungId }: { betreuungId: string }) {
  const { daten } = useDaten<KontingentStand[]>(`/api/betreuungen/${betreuungId}/kontingente`);
  if (!daten?.length) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-semibold">Kontingente</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {daten.map((k) => {
          const anteil = Math.min(1, k.genutzt / k.maximum);
          return (
            <div key={k.id} className="karte">
              <div className="text-sm text-slate-500">{k.name}</div>
              <div className="mt-1 text-xl font-semibold">{k.genutzt} <span className="text-base font-normal text-slate-500">von {k.maximum} {k.einheit}</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand-200 dark:bg-salbei-700" role="progressbar" aria-valuenow={k.genutzt} aria-valuemax={k.maximum}>
                <div className={`h-full rounded-full ${anteil >= 0.9 ? "bg-tulpe-500" : "bg-salbei-500"}`} style={{ width: `${anteil * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Besuche({ betreuungId }: { betreuungId: string }) {
  const { ich } = useAuth();
  const { daten } = useDaten<BesuchKurz[]>(`/api/betreuungen/${betreuungId}/besuche`);
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-semibold">Besuche</h2>
      {!daten ? (
        <Laden />
      ) : daten.length === 0 ? (
        <p className="text-slate-500">Noch keine Besuche dokumentiert.</p>
      ) : (
        <div className="karte divide-y divide-sand-200 p-0 dark:divide-salbei-700">
          {daten.map((b) => (
            <Link key={b.id} to={b.dokumentation?.kurs ? `/kurse/${b.dokumentation.kurs.kursId}/termine/${b.dokumentation.kurs.terminId}` : `/besuche/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-sand-50 dark:hover:bg-salbei-700/30">
              <div className="w-28 shrink-0">
                <div className="font-medium">{datum(b.datum)}</div>
                <div className="text-sm text-slate-500">{b.art === 6 ? `Video ${b.bis}` : `${b.von}–${b.bis}`}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{besuchTypLabel(b.typ)} · {besuchArtLabel(b.typ, b.art)}{b.dokumentation?.kurs ? ` · ${b.dokumentation.kurs.titel}` : ""}</div>
                <div className="text-sm text-slate-500">
                  {b.hebamme}{b.hebammeId === ich?.id ? " (ich)" : ""} · GPOS {b.stamm ?? "–"}XX · {b.einheitenAbrechenbar * 5} Min. abrechenbar
                  {b.hinweise.some((h) => h.stufe !== "info") ? " · ⚠ Hinweise" : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{euro(b.summe)}</div>
                <span className={`text-xs font-medium ${b.status === "entwurf" ? "text-amber-700" : "text-salbei-600"}`}>
                  {b.status === "entwurf" ? "Entwurf" : b.unterschrift.art === "tablet" ? "✓ Tablet-Unterschrift" : b.unterschrift.art === "papier" ? "✓ Papier-Unterschrift" : "✓ abgeschlossen"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/** Auswahl der Geburtsart; ältere Freitexte bleiben als eigene Option erhalten. */
function GeburtsmodusAuswahl({ wert, aendern }: { wert: string; aendern: (v: string) => void }) {
  return (
    <select className="feld" value={wert} onChange={(e) => aendern(e.target.value)}>
      <option value="">–</option>
      {Object.entries(GEBURTSMODI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      {wert && !(wert in GEBURTSMODI) && <option value={wert}>{wert}</option>}
    </select>
  );
}
