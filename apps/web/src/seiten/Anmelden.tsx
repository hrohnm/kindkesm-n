import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { Meldung } from "../komponenten/Formular";
import { useAuth } from "../lib/auth";

export function Anmelden() {
  const { anmelden } = useAuth();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  // Zweiter Schritt: Code aus der Authenticator-App (oder Wiederherstellungscode)
  const [codeNoetig, setCodeNoetig] = useState(false);
  const [code, setCode] = useState("");
  const [fehler, setFehler] = useState<string>();
  const [laeuft, setLaeuft] = useState(false);
  const [demo, setDemo] = useState<{ passwort: string; konten: Array<{ email: string; name: string; status: string }> }>();

  // Schnellanmeldung mit Demo-Konten (nur in Test-Umgebungen aktiv)
  useEffect(() => {
    api<{ aktiv: boolean; passwort: string; konten: Array<{ email: string; name: string; status: string }> }>("/api/demo")
      .then((d) => d.aktiv && setDemo(d))
      .catch(() => {});
  }, []);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setLaeuft(true);
    setFehler(undefined);
    try {
      const r = await anmelden(email, passwort, codeNoetig ? code : undefined);
      if (r === "zweiter_faktor") setCodeNoetig(true);
    } catch (err) {
      setFehler((err as Error).message);
      setCode("");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <form onSubmit={absenden} className="karte w-full max-w-md space-y-5 p-8">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="size-16" />
          <div>
            <h1 className="text-2xl font-semibold text-salbei-700 dark:text-salbei-100">Kindkesmöön</h1>
            <p className="text-slate-500">Hebammenpraxis Bad Doberan</p>
          </div>
        </div>
        {fehler && <Meldung art="fehler">{fehler}</Meldung>}
        {codeNoetig ? (
          <>
            <p className="text-slate-600 dark:text-slate-300">Bitte den 6-stelligen Code aus deiner Authenticator-App eingeben.</p>
            <label className="block">
              <span className="etikett">Code</span>
              <input className="feld text-center text-2xl tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={9} value={code} onChange={(e) => setCode(e.target.value)} required />
            </label>
            <p className="text-sm text-slate-500">Handy nicht zur Hand? Einen der Wiederherstellungscodes (z. B. ABCD-EFGH) eingeben – jeder gilt nur einmal.</p>
            <button className="knopf-primaer w-full" disabled={laeuft}>{laeuft ? "Prüfen …" : "Bestätigen"}</button>
            <button type="button" className="w-full text-sm text-slate-500 underline" onClick={() => { setCodeNoetig(false); setCode(""); setFehler(undefined); }}>Zurück</button>
          </>
        ) : (
          <>
            <label className="block">
              <span className="etikett">E-Mail</span>
              <input className="feld" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="block">
              <span className="etikett">Passwort</span>
              <input className="feld" type="password" autoComplete="current-password" value={passwort} onChange={(e) => setPasswort(e.target.value)} required />
            </label>
            <button className="knopf-primaer w-full" disabled={laeuft}>
              {laeuft ? "Anmelden …" : "Anmelden"}
            </button>
          </>
        )}
        {demo && !codeNoetig && (
          <div className="border-t border-sand-200 pt-4 dark:border-salbei-700">
            <p className="mb-2 text-sm text-slate-500">Test-Umgebung – Demo-Zugang eintragen:</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {demo.konten.map((k) => (
                <button
                  key={k.email}
                  type="button"
                  className="knopf-sekundaer flex-col gap-0 px-3 py-2 text-sm"
                  onClick={() => {
                    setEmail(k.email);
                    setPasswort(demo.passwort);
                    setFehler(undefined);
                  }}
                >
                  <span>{k.name.split(" ")[0]}</span>
                  {k.status === "babypause" && <span className="text-xs font-normal text-slate-500">Babypause</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
