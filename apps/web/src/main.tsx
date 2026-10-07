import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { Layout } from "./komponenten/Layout";
import "./index.css";
import { AuthProvider, useAuth } from "./lib/auth";
import { AbrechnungSeite } from "./seiten/AbrechnungSeite";
import { Akte } from "./seiten/Akte";
import { AnfrageDetail } from "./seiten/AnfrageDetail";
import { Anfragen } from "./seiten/Anfragen";
import { Belegung } from "./seiten/Belegung";
import { Anmelden } from "./seiten/Anmelden";
import { Besuch } from "./seiten/Besuch";
import { Cockpit } from "./seiten/Cockpit";
import { Einstellungen } from "./seiten/Einstellungen";
import { Fahrtenbuch } from "./seiten/Fahrtenbuch";
import { Anmeldung } from "./seiten/Anmeldung";
import { Gewicht } from "./seiten/Gewicht";
import { Kurs } from "./seiten/Kurs";
import { Kurse } from "./seiten/Kurse";
import { KursTermin } from "./seiten/KursTermin";
import { Urkunde } from "./seiten/Urkunde";
import { Abrechnung } from "./seiten/einstellungen/Abrechnung";
import { Ansicht } from "./seiten/einstellungen/Ansicht";
import { Offline } from "./seiten/einstellungen/Offline";
import { OrteTouren } from "./seiten/einstellungen/OrteTouren";
import { Passwort } from "./seiten/einstellungen/Passwort";
import { Sicherheit } from "./seiten/einstellungen/Sicherheit";
import { ZweiFaktorPflicht } from "./seiten/ZweiFaktorPflicht";
import { Sperre } from "./komponenten/Sperre";
import { Praxis } from "./seiten/einstellungen/Praxis";
import { Profil } from "./seiten/einstellungen/Profil";
import { Klientinnen } from "./seiten/Klientinnen";
import { Regelwerk } from "./seiten/Regelwerk";
import { Team } from "./seiten/Team";
import { Tour } from "./seiten/Tour";

function App() {
  const { ich } = useAuth();
  const ort = useLocation();
  // Öffentliche Kursanmeldung: ohne Konto erreichbar
  if (ort.pathname === "/anmeldung") return <Anmeldung />;
  if (ich === undefined) return null;
  if (ich === null) return <Anmelden />;
  if (ich.zweiFaktorPflicht && !ich.zweiFaktor) return <ZweiFaktorPflicht />;
  return (
    <>
    <Sperre />
    <div id="app-inhalt" className="contents">
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Cockpit />} />
        <Route path="klientinnen" element={<Klientinnen />} />
        <Route path="klientinnen/:id" element={<Akte />} />
        <Route path="betreuungen/:betreuungId/besuch" element={<Besuch />} />
        <Route path="besuche/:id" element={<Besuch />} />
        <Route path="tour" element={<Tour />} />
        <Route path="tour/:datum" element={<Tour />} />
        <Route path="fahrtenbuch" element={<Fahrtenbuch />} />
        <Route path="kinder/:id/gewicht" element={<Gewicht />} />
        <Route path="kinder/:id/urkunde" element={<Urkunde />} />
        <Route path="abrechnung" element={<AbrechnungSeite />} />
        <Route path="kurse" element={<Kurse />} />
        <Route path="kurse/:id" element={<Kurs />} />
        <Route path="kurse/:id/termine/:terminId" element={<KursTermin />} />
        <Route path="team" element={<Team />} />
        <Route path="anfragen" element={<Anfragen />} />
        <Route path="anfragen/:id" element={<AnfrageDetail />} />
        <Route path="belegung" element={<Belegung />} />
        <Route path="regelwerk" element={<Regelwerk />} />
        <Route path="einstellungen" element={<Einstellungen />}>
          <Route index element={<Profil />} />
          <Route path="orte" element={<OrteTouren />} />
          <Route path="dokumentation" element={<Ansicht />} />
          <Route path="abrechnung" element={<Abrechnung />} />
          <Route path="praxis" element={<Praxis />} />
          <Route path="offline" element={<Offline />} />
          <Route path="passwort" element={<Passwort />} />
          <Route path="sicherheit" element={<Sicherheit />} />
        </Route>
        <Route path="*" element={<Cockpit />} />
      </Route>
    </Routes>
    </div>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
