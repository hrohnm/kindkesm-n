import { NavLink, Outlet } from "react-router";
import { Seitenkopf } from "../komponenten/Formular";

const UNTER = [
  { to: "/einstellungen", label: "Mein Profil", ende: true },
  { to: "/einstellungen/orte", label: "Orte & Touren" },
  { to: "/einstellungen/dokumentation", label: "Dokumentation" },
  { to: "/einstellungen/abrechnung", label: "Abrechnung" },
  { to: "/einstellungen/praxis", label: "Praxis" },
  { to: "/einstellungen/offline", label: "Offline" },
  { to: "/einstellungen/passwort", label: "Passwort" },
  // Auf dem Handy fehlen diese in der unteren Leiste, daher nur dort hier verlinkt
  { to: "/team", label: "Team ›", nurHandy: true },
  { to: "/fahrtenbuch", label: "Fahrtenbuch ›", nurHandy: true },
  { to: "/regelwerk", label: "Regelwerk ›", nurHandy: true },
];

export function Einstellungen() {
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
    </>
  );
}
