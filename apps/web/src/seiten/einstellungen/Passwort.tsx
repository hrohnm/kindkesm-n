import { Feld, Meldung } from "../../komponenten/Formular";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { pruefwertMerken } from "../../lib/sperre";
import { useFormular } from "../../lib/useFormular";

export function Passwort() {
  const { ich } = useAuth();
  const f = useFormular({ altesPasswort: "", neuesPasswort: "", wiederholung: "" });
  const ungleich = f.werte.wiederholung.length > 0 && f.werte.wiederholung !== f.werte.neuesPasswort;
  return (
    <form
      className="karte max-w-lg space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (ungleich) return;
        const ok = await f.speichern(
          ({ altesPasswort, neuesPasswort }) => api("/api/auth/passwort", { method: "POST", body: { altesPasswort, neuesPasswort } }),
          "Passwort geändert. Andere Geräte wurden abgemeldet.",
        );
        // Prüfwert für die App-Sperre ohne Verbindung an das neue Passwort anpassen
        if (ok && ich) await pruefwertMerken(f.werte.neuesPasswort, ich.id);
        if (ok) f.setWerte({ altesPasswort: "", neuesPasswort: "", wiederholung: "" });
      }}
    >
      {f.meldung && <Meldung art={f.meldung.art}>{f.meldung.text}</Meldung>}
      <Feld label="Bisheriges Passwort" fehler={f.felder.altesPasswort}>
        <input className="feld" type="password" autoComplete="current-password" value={f.werte.altesPasswort} onChange={(e) => f.setze("altesPasswort", e.target.value)} />
      </Feld>
      <Feld label="Neues Passwort" fehler={f.felder.neuesPasswort} hilfe="Mindestens 12 Zeichen.">
        <input className="feld" type="password" autoComplete="new-password" value={f.werte.neuesPasswort} onChange={(e) => f.setze("neuesPasswort", e.target.value)} />
      </Feld>
      <Feld label="Neues Passwort wiederholen" fehler={ungleich ? "Die Passwörter stimmen nicht überein." : undefined}>
        <input className="feld" type="password" autoComplete="new-password" value={f.werte.wiederholung} onChange={(e) => f.setze("wiederholung", e.target.value)} />
      </Feld>
      <button className="knopf-primaer" disabled={f.speichert || ungleich}>
        Passwort ändern
      </button>
    </form>
  );
}
