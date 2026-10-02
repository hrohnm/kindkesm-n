import { NavLink, Outlet } from "react-router";
import { useAuth } from "../lib/auth";
import { OfflineStatus } from "./OfflineStatus";
import { IconAbmelden, IconAbrechnung, IconAuto, IconEinstellungen, IconFamilie, IconHeute, IconRegelwerk, IconTeam, IconTour } from "./Icons";

const NAV = [
  { to: "/", label: "Heute", icon: IconHeute, ende: true },
  { to: "/tour", label: "Tour", icon: IconTour },
  { to: "/klientinnen", label: "Klientinnen", icon: IconFamilie },
  { to: "/abrechnung", label: "Abrechnung", icon: IconAbrechnung },
  // Auf dem Handy über Einstellungen bzw. die Tour erreichbar (Platz in der unteren Leiste)
  { to: "/fahrtenbuch", label: "Fahrtenbuch", icon: IconAuto, nurGross: true },
  { to: "/team", label: "Team", icon: IconTeam, nurGross: true },
  { to: "/regelwerk", label: "Regelwerk", icon: IconRegelwerk, nurGross: true },
  { to: "/einstellungen", label: "Einstellungen", icon: IconEinstellungen },
];

/** Tablet/Desktop: Seitenleiste links. Handy: Navigationsleiste unten. */
export function Layout() {
  const { ich, abmelden } = useAuth();
  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sand-200 bg-sand-50 px-4 py-6 md:flex lg:w-72 dark:border-salbei-700 dark:bg-salbei-900">
        <div className="mb-8 flex items-center gap-3 px-2">
          <img src="/logo.png" alt="" className="size-12" />
          <div>
            <div className="text-lg font-semibold leading-tight text-salbei-700 dark:text-salbei-100">Kindkesmöön</div>
            <div className="text-sm text-slate-500">Hebammenpraxis</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, ende }) => (
            <NavLink
              key={to}
              to={to}
              end={ende}
              className={({ isActive }) =>
                `flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium transition ${
                  isActive ? "bg-salbei-600 text-white" : "text-slate-700 hover:bg-sand-200 dark:text-slate-200 dark:hover:bg-salbei-700/50"
                }`
              }
            >
              <Icon className="size-6" />
              {label}
            </NavLink>
          ))}
        </nav>
        <OfflineStatus variante="seitenleiste" />
        <div className="mt-4 border-t border-sand-200 pt-4 dark:border-salbei-700">
          <div className="flex items-center gap-3 px-2">
            <span className="flex size-10 items-center justify-center rounded-full bg-salbei-100 font-semibold text-salbei-700">{ich?.kuerzel}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{ich?.name}</div>
              <div className="truncate text-sm text-slate-500">{ich?.email}</div>
            </div>
          </div>
          <button type="button" onClick={abmelden} className="mt-3 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-slate-600 hover:bg-sand-200 dark:text-slate-300 dark:hover:bg-salbei-700/50">
            <IconAbmelden className="size-6" /> Abmelden
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-clip px-4 pt-6 pb-28 sm:px-6 md:px-8 md:pb-10 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>

      <OfflineStatus variante="handy" />
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-sand-200 bg-sand-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-salbei-700 dark:bg-salbei-900/95">
        {NAV.filter((n) => !n.nurGross).map(({ to, label, icon: Icon, ende }) => (
          <NavLink
            key={to}
            to={to}
            end={ende}
            className={({ isActive }) => `flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${isActive ? "text-salbei-600 dark:text-salbei-200" : "text-slate-500"}`}
          >
            <Icon className="size-6" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
