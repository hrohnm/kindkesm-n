import { NavLink, Outlet } from "react-router";
import { Seitenkopf } from "../komponenten/Formular";
import { IconAbmelden } from "../komponenten/Icons";
import { useAuth } from "../lib/auth";

const UNTER = [
  { to: "/einstellungen", label: "Mein Profil", ende: true },
  { to: "/einstellungen/orte", label: "Orte & Touren" },
  { to: "/einstellungen/dokumentation", label: "Dokumentation" },
  { to: "/einstellungen/textbausteine", label: "Textbausteine" },
  { to: "/einstellungen/abrechnung", label: "Abrechnung" },
  { to: "/einstellungen/praxis", label: "Praxis" },
  { to: "/einstellungen/offline", label: "Offline" },
  { to: "/einstellungen/passwort", label: "Passwort" },
  { to: "/einstellungen/sicherheit", label: "Sicherheit" },
  // Auf dem Handy fehlen diese in der unteren Leiste, daher nur dort hier verlinkt
  { to: "/anfragen", label: "Anfragen ›", nurHandy: true },
  { to: "/belegung", label: "Belegungsplan ›", nurHandy: true },
  { to: "/kurse", label: "Kurse ›", nurHandy: true },
  { to: "/team", label: "Team ›", nurHandy: true },
  { to: "/fahrtenbuch", label: "Fahrtenbuch ›", nurHandy: true },
  { to: "/regelwerk", label: "Regelwerk ›", nurHandy: true },
];

export function Einstellungen() {
  const { ich, abmelden } = useAuth();
  return (
    <>
      <Seitenkopf titel="Einstellungen" />
      <div className="mb-6 flex flex-wrap gap-2">
        {UNTER.map((u) => (
          <NavLink
            key={u.to}
            to={u.to}
            end={u.ende}
            className={({ isActive }) => `${"nurHandy" in u && u.nurHandy ? "md:hidden " : ""}flex min-h-12 shrink-0 items-center rounded-full px-5 font-medium ${isActive ? "bg-salbei-600 text-white" : "bg-white text-slate-600 dark:bg-salbei-900/50 dark:text-slate-300"}`}
          >
            {u.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
      {/* Auf dem Handy fehlt die Seitenleiste mit dem Abmelden-Knopf */}
      <div className="mt-8 flex items-center gap-3 border-t border-sand-200 pt-4 md:hidden dark:border-salbei-700">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{ich?.name}</div>
          <div className="truncate text-sm text-slate-500">{ich?.email}</div>
        </div>
        <button type="button" onClick={abmelden} className="knopf-sekundaer shrink-0">
          <IconAbmelden className="size-5" /> Abmelden
        </button>
      </div>
    </>
  );
}
