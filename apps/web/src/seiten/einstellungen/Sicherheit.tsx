import { SPERRE_MINUTEN } from "@kindkesmoeoen/shared";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Feld, Laden, Meldung } from "../../komponenten/Formular";
import { ApiFehler, api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useDaten } from "../../lib/useDaten";

type Stand = { zweiFaktor: boolean; pflicht: boolean; wiederherstellungscodes: number; sperreMinuten: number };
type Geraet = { kennung: string; userAgent: string | null; erstelltAm: string; letzteAktivitaet: string | null; aktuell: boolean };

const zeit = (iso: string | null) => (iso ? new Date(iso).toLocaleString("de-DE", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–");

/** Grobe Gerätebezeichnung aus dem User-Agent (nur zur Wiedererkennung) */
export function geraetName(ua: string | null) {
  if (!ua) return "Unbekanntes Gerät";
  const system = /iPad/.test(ua) ? "iPad" : /iPhone/.test(ua) ? "iPhone" : /Android/.test(ua) ? (/Mobile/.test(ua) ? "Android-Handy" : "Android-Tablet") : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows-PC" : /Linux/.test(ua) ? "Linux" : "Gerät";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${system} · ${browser}`;
}

/** Einstellungen → Sicherheit (M25) */
export function Sicherheit() {
  const stand = useDaten<Stand>("/api/ich/sicherheit");
  if (!stand.daten) return <Laden />;
  return (
    <div className="grid max-w-3xl gap-6">
      <ZweiFaktor stand={stand.daten} neuLaden={stand.laden} />
      <SperreEinstellen minuten={stand.daten.sperreMinuten} />
      <Geraete />
      <Export />
    </div>
  );
}

function ZweiFaktor({ stand, neuLaden }: { stand: Stand; neuLaden: () => Promise<void> }) {
  const [passwort, setPasswort] = useState("");
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string }>();
  const [codes, setCodes] = useState<string[]>();
  const [einrichten, setEinrichten] = useState(false);

  async function aktion(pfad: string, ok: (r: { wiederherstellungscodes?: string[] }) => void) {
    setMeldung(undefined);
    try {
      ok(await api<{ wiederherstellungscodes?: string[] }>(pfad, { method: "POST", body: { passwort } }));
      setPasswort("");
      await neuLaden();
    } catch (e) {
      setMeldung({ art: "fehler", text: e instanceof ApiFehler && e.felder.passwort ? e.felder.passwort : (e as Error).message });
    }
  }

  return (
    <section className="karte space-y-4" aria-labelledby="zwei-faktor-titel">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="zwei-faktor-titel" className="text-lg font-semibold">Zwei-Faktor-Anmeldung</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stand.zweiFaktor ? "bg-salbei-100 text-salbei-700" : "bg-amber-100 text-amber-800"}`}>{stand.zweiFaktor ? "eingeschaltet" : "aus"}</span>
        {stand.pflicht && <span className="rounded-full bg-sand-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">in der Praxis Pflicht</span>}
      </div>
      <p className="text-slate-600 dark:text-slate-300">Bei der Anmeldung braucht es zusätzlich zum Passwort einen Code aus einer Authenticator-App auf dem Handy (z. B. Google Authenticator, Microsoft Authenticator, 2FAS oder die Passwörter-App des iPhones). Ein gestohlenes Passwort allein reicht dann nicht.</p>
      {meldung && <Meldung art={meldung.art}>{meldung.text}</Meldung>}
      {codes && <Wiederherstellungscodes codes={codes} fertig={() => setCodes(undefined)} />}
      {!stand.zweiFaktor ? (
        einrichten ? (
          <Einrichten fertig={(c) => { setCodes(c); setEinrichten(false); void neuLaden(); }} abbrechen={() => setEinrichten(false)} />
        ) : (
          <button type="button" className="knopf-primaer" onClick={() => setEinrichten(true)}>Einrichten</button>
        )
      ) : (
        !codes && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Noch {stand.wiederherstellungscodes} von 8 Wiederherstellungscodes übrig.</p>
            <Feld label="Passwort (zur Bestätigung)">
              <input className="feld max-w-sm" type="password" autoComplete="current-password" value={passwort} onChange={(e) => setPasswort(e.target.value)} />
            </Feld>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="knopf-sekundaer" disabled={!passwort} onClick={() => aktion("/api/ich/2fa/neue-codes", (r) => setCodes(r.wiederherstellungscodes))}>Neue Wiederherstellungscodes</button>
              {!stand.pflicht && (
                <button type="button" className="knopf-sekundaer text-tulpe-500" disabled={!passwort} onClick={() => confirm("Zwei-Faktor-Anmeldung wirklich ausschalten?") && aktion("/api/ich/2fa/aus", () => setMeldung({ art: "ok", text: "Zwei-Faktor-Anmeldung ausgeschaltet." }))}>Ausschalten</button>
              )}
            </div>
          </div>
        )
      )}
    </section>
  );
}

/** Einrichtung in drei Schritten: Passwort → QR-Code scannen → Code bestätigen. Auch für die Pflicht-Einrichtung nach der Anmeldung. */
export function Einrichten({ fertig, abbrechen }: { fertig: (codes: string[]) => void; abbrechen?: () => void }) {
  const [passwort, setPasswort] = useState("");
  const [schluessel, setSchluessel] = useState<{ geheimnis: string; uri: string; qr: string }>();
  const [code, setCode] = useState("");
  const [fehler, setFehler] = useState<string>();
  const [laeuft, setLaeuft] = useState(false);

  async function starten() {
    setFehler(undefined);
    setLaeuft(true);
    try {
      const r = await api<{ geheimnis: string; uri: string }>("/api/ich/2fa/start", { method: "POST", body: { passwort } });
      setSchluessel({ ...r, qr: await QRCode.toDataURL(r.uri, { margin: 1, width: 220 }) });
    } catch (e) {
      setFehler(e instanceof ApiFehler && e.felder.passwort ? e.felder.passwort : (e as Error).message);
    } finally {
      setLaeuft(false);
    }
  }
  async function bestaetigen() {
    setFehler(undefined);
    setLaeuft(true);
    try {
      const r = await api<{ wiederherstellungscodes: string[] }>("/api/ich/2fa/bestaetigen", { method: "POST", body: { code } });
      fertig(r.wiederherstellungscodes);
    } catch (e) {
      setFehler(e instanceof ApiFehler && e.felder.code ? e.felder.code : (e as Error).message);
      setCode("");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-sand-200 p-4 dark:border-salbei-700">
      {fehler && <Meldung art="fehler">{fehler}</Meldung>}
      {!schluessel ? (
        <>
          <Feld label="1. Passwort eingeben">
            <input className="feld max-w-sm" type="password" autoComplete="current-password" value={passwort} onChange={(e) => setPasswort(e.target.value)} autoFocus />
          </Feld>
          <div className="flex gap-2">
            <button type="button" className="knopf-primaer" disabled={!passwort || laeuft} onClick={starten}>Weiter</button>
            {abbrechen && <button type="button" className="knopf-sekundaer" onClick={abbrechen}>Abbrechen</button>}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-6">
            <img src={schluessel.qr} alt="QR-Code für die Authenticator-App" className="size-52 rounded-xl bg-white p-2" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-medium">2. QR-Code mit der Authenticator-App scannen</p>
              <p className="text-sm text-slate-500">Oder den Schlüssel von Hand eintragen:</p>
              <code className="block break-all rounded-xl bg-sand-100 p-3 font-mono text-sm tracking-wider dark:bg-salbei-900/50" data-testid="totp-schluessel">{schluessel.geheimnis.match(/.{1,4}/g)!.join(" ")}</code>
            </div>
          </div>
          <Feld label="3. Angezeigten 6-stelligen Code eingeben">
            <input className="feld max-w-[12rem] text-center text-2xl tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </Feld>
          <div className="flex gap-2">
            <button type="button" className="knopf-primaer" disabled={code.length !== 6 || laeuft} onClick={bestaetigen}>Einschalten</button>
            {abbrechen && <button type="button" className="knopf-sekundaer" onClick={abbrechen}>Abbrechen</button>}
          </div>
        </>
      )}
    </div>
  );
}

export function Wiederherstellungscodes({ codes, fertig }: { codes: string[]; fertig: () => void }) {
  return (
    <div className="space-y-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 dark:bg-amber-900/20" role="status">
      <p className="font-semibold">Wiederherstellungscodes – jetzt sicher aufbewahren</p>
      <p className="text-sm">Falls das Handy verloren geht, kannst du dich mit einem dieser Codes anmelden. Jeder Code gilt nur einmal. Sie werden nur jetzt angezeigt – ausdrucken oder im Passwortmanager speichern.</p>
      <ul className="grid grid-cols-2 gap-2 font-mono text-lg sm:grid-cols-4" data-testid="wiederherstellungscodes">
        {codes.map((c) => <li key={c} className="rounded-lg bg-white px-3 py-1 text-center dark:bg-salbei-900">{c}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="knopf-sekundaer" onClick={() => window.print()}>Drucken</button>
        <button type="button" className="knopf-primaer" onClick={fertig}>Ich habe die Codes gespeichert</button>
      </div>
    </div>
  );
}

function SperreEinstellen({ minuten }: { minuten: number }) {
  const { neuLaden } = useAuth();
  const [wert, setWert] = useState(minuten);
  const [gespeichert, setGespeichert] = useState(false);
  return (
    <section className="karte space-y-3" aria-labelledby="sperre-einstellen">
      <h2 id="sperre-einstellen" className="text-lg font-semibold">App-Sperre</h2>
      <p className="text-slate-600 dark:text-slate-300">Liegt das Tablet unbeaufsichtigt, verdeckt die App nach dieser Zeit ohne Bedienung alle Daten, bis das Passwort eingegeben wird – auch ohne Verbindung.</p>
      <label className="flex flex-wrap items-center gap-3">
        <span className="etikett mb-0">Sperren nach</span>
        <select
          className="feld w-auto"
          value={wert}
          onChange={async (e) => {
            const m = Number(e.target.value);
            setWert(m);
            await api("/api/ich/sperre", { method: "PUT", body: { minuten: m } });
            await neuLaden();
            setGespeichert(true);
          }}
        >
          {SPERRE_MINUTEN.map((m) => <option key={m} value={m}>{m === 0 ? "nie (nicht empfohlen)" : `${m} Minuten`}</option>)}
        </select>
        {gespeichert && <span className="text-sm text-salbei-600">Gespeichert</span>}
      </label>
    </section>
  );
}

function Geraete() {
  const liste = useDaten<Geraet[]>("/api/ich/sitzungen");
  const [meldung, setMeldung] = useState<string>();
  async function abmelden(kennung: string) {
    const r = await api<{ diesesGeraet: boolean }>(`/api/ich/sitzungen/${kennung}`, { method: "DELETE" });
    if (r.diesesGeraet) return window.dispatchEvent(new Event("kk:abgemeldet"));
    await liste.laden();
  }
  return (
    <section className="karte space-y-3" aria-labelledby="geraete-titel">
      <h2 id="geraete-titel" className="text-lg font-semibold">Angemeldete Geräte</h2>
      <p className="text-slate-600 dark:text-slate-300">Gerät verloren? Hier abmelden – die App auf dem Gerät hat dann keinen Zugriff mehr, und beim nächsten Öffnen werden die gespeicherten Daten gelöscht.</p>
      {meldung && <Meldung art="ok">{meldung}</Meldung>}
      {!liste.daten ? (
        <Laden />
      ) : (
        <ul className="divide-y divide-sand-200 dark:divide-salbei-700">
          {liste.daten.map((g) => (
            <li key={g.kennung} className="flex flex-wrap items-center gap-3 py-3" data-testid="geraet">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{geraetName(g.userAgent)} {g.aktuell && <span className="ml-1 rounded-full bg-salbei-100 px-2 py-0.5 text-xs text-salbei-700">dieses Gerät</span>}</div>
                <div className="text-sm text-slate-500">angemeldet {zeit(g.erstelltAm)} · zuletzt aktiv {zeit(g.letzteAktivitaet ?? g.erstelltAm)}</div>
              </div>
              {!g.aktuell && <button type="button" className="knopf-sekundaer" onClick={() => abmelden(g.kennung)}>Abmelden</button>}
            </li>
          ))}
        </ul>
      )}
      {liste.daten && liste.daten.length > 1 && (
        <button
          type="button"
          className="knopf-sekundaer"
          onClick={async () => {
            const r = await api<{ anzahl: number }>("/api/ich/sitzungen/andere-beenden", { method: "POST" });
            setMeldung(`${r.anzahl} ${r.anzahl === 1 ? "Gerät" : "Geräte"} abgemeldet.`);
            await liste.laden();
          }}
        >
          Alle anderen Geräte abmelden
        </button>
      )}
    </section>
  );
}

function Export() {
  const { ich } = useAuth();
  const [bereit, setBereit] = useState(false);
  useEffect(() => setBereit(ich?.rolle === "hebamme"), [ich]);
  if (!bereit) return null;
  return (
    <section className="karte space-y-3" aria-labelledby="export-titel">
      <h2 id="export-titel" className="text-lg font-semibold">Export aller Daten</h2>
      <p className="text-slate-600 dark:text-slate-300">Alle Daten der Praxis als eine Datei (JSON) – z. B. für ein zusätzliches Archiv oder einen späteren Wechsel. Die Datei enthält Gesundheitsdaten: nur verschlüsselt speichern. Der Export wird protokolliert.</p>
      <a className="knopf-sekundaer" href="/api/export" download>Export herunterladen</a>
    </section>
  );
}
