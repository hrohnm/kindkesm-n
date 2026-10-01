# Betrieb auf dem Hostinger-VPS (KVM 2)

Diese Anleitung bringt die App auf einen frischen Hostinger-VPS. Zum Start läuft sie unter der Hostinger-Adresse des Servers (z. B. `srv123456.hstgr.cloud`), später unter einer eigenen Subdomain. Caddy holt das HTTPS-Zertifikat in beiden Fällen automatisch.

> **Wichtig:** Solange die App mit Demo-Daten läuft, ist sie eine Test-Umgebung. Echte Gesundheitsdaten erst eintragen, wenn die Punkte unter [Vor dem Echtbetrieb](#vor-dem-echtbetrieb) erledigt sind.

## 1. VPS vorbereiten (einmalig)

Im Hostinger-Panel (hPanel → VPS):
1. **Betriebssystem:** Ubuntu 24.04 LTS (ohne Panel).
2. **Standort:** ein Rechenzentrum in der EU.
3. **SSH-Schlüssel** hinterlegen (statt Passwort-Anmeldung).
4. **Firewall** (hPanel → Firewall): nur eingehend **22 (SSH), 80 (HTTP), 443 (HTTP/HTTPS, TCP und UDP)** erlauben.
5. Den **Hostnamen** des Servers notieren (z. B. `srv123456.hstgr.cloud`).
6. **AVV/DPA**: Den Auftragsverarbeitungsvertrag von Hostinger abschließen bzw. akzeptieren (für Gesundheitsdaten Pflicht).

Per SSH auf dem Server anmelden und als `root` ausführen:

```bash
# Updates und automatische Sicherheitsupdates
apt update && apt upgrade -y
apt install -y unattended-upgrades fail2ban git
dpkg-reconfigure -plow unattended-upgrades

# Docker installieren (offizielles Skript)
curl -fsSL https://get.docker.com | sh

# SSH härten: nur Schlüssel, kein Passwort
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

## 2. App installieren

Das Repository ist privat. Der Server braucht deshalb einen **Deploy Key** (SSH-Schlüssel mit reinem Lesezugriff auf genau dieses Repository):

```bash
# Schlüssel auf dem VPS erzeugen und den öffentlichen Teil anzeigen
ssh-keygen -t ed25519 -f /root/.ssh/kindkes_deploy -N "" -C "hostinger-vps"
cat /root/.ssh/kindkes_deploy.pub
```

Den angezeigten Schlüssel auf GitHub eintragen: Repository → **Settings → Deploy keys → Add deploy key**, Titel z. B. „Hostinger VPS“, **ohne** „Allow write access“.

```bash
# GitHub mitteilen, welcher Schlüssel für das Repository gilt
cat >> /root/.ssh/config <<'CFG'
Host github-kindkes
  HostName github.com
  User git
  IdentityFile /root/.ssh/kindkes_deploy
  IdentitiesOnly yes
CFG

mkdir -p /opt && cd /opt
git clone git@github-kindkes:hrohnm/kindkesm-n.git kindkesmoeoen
cd kindkesmoeoen
git checkout main   # bzw. den Branch mit dem gewünschten Stand

cp .env.example .env
nano .env
```

> **Klonen über das Hostinger-Panel:** Wenn du das Repository über eine Git-Funktion im hPanel klonst, gilt dasselbe: Für das private Repository muss Hostinger Zugriff bekommen (meist über einen angezeigten Deploy Key, den du wie oben bei GitHub einträgst), und es muss der richtige Branch gewählt sein. Danach geht es mit `.env` und `docker compose up -d --build` per SSH im geklonten Ordner weiter. Updates holst du dann per `git pull` (oder über die Pull-Funktion im Panel) und startest anschließend `docker compose up -d --build`.

In `.env` eintragen:

| Variable | Wert |
|---|---|
| `DOMAIN` | Hostname des VPS, z. B. `srv123456.hstgr.cloud` (später die Subdomain) |
| `DB_PASSWORT` | Ergebnis von `openssl rand -base64 32` |
| `SITZUNG_STUNDEN` | Anmeldedauer in Stunden (Standard 12) |

Starten:

```bash
docker compose up -d --build
docker compose ps              # alle drei Dienste "Up", app "healthy"
docker compose logs -f app     # Ende mit Strg+C
```

Beim ersten Start legt die App die Datenbanktabellen an. Danach die Grunddaten (Praxis, Regelwerke, Selbstzahler-Preise) einspielen:

```bash
# Test-/Demo-Umgebung: Grunddaten + drei Demo-Konten (Passwort wird ausgegeben)
docker compose exec app node apps/api/dist/seed/seed.js --demo

# Produktivumgebung: nur Grunddaten, Konten einzeln anlegen (siehe unten)
docker compose exec app node apps/api/dist/seed/seed.js
```

Die App ist jetzt unter `https://<DOMAIN>` erreichbar. Auf dem iPad in Safari öffnen und über **Teilen → Zum Home-Bildschirm** wie eine App installieren.

## 3. Konten verwalten

```bash
# Konto anlegen (gibt ein vorläufiges Passwort aus)
docker compose exec app node apps/api/dist/cli.js benutzer-anlegen --email marielena@example.de --name "Marielena Pontus" --kuerzel MP

# Passwort zurücksetzen (beendet alle Sitzungen)
docker compose exec app node apps/api/dist/cli.js passwort-zuruecksetzen --email marielena@example.de

# Konto sperren (z. B. Demo-Konten vor dem Echtbetrieb)
docker compose exec app node apps/api/dist/cli.js benutzer-sperren --email marielena@kindkesmoeoen.test
```

Nach der ersten Anmeldung das Passwort unter **Einstellungen → Passwort** ändern.

## 4. Updates einspielen

```bash
cd /opt/kindkesmoeoen
scripts/backup.sh            # vorher sichern
git pull
docker compose up -d --build
docker compose exec app node apps/api/dist/seed/seed.js   # neue Regelwerk-Entwürfe/Preise übernehmen (vorhandene Daten bleiben)
```

Datenbank-Änderungen (Migrationen) laufen beim Start der App automatisch.

## 5. Backups

```bash
# Einmalig: Passwort für die Verschlüsselung der Sicherungen erzeugen und SICHER AUFBEWAHREN
# (z. B. zusätzlich im Passwortmanager). Ohne dieses Passwort sind die Sicherungen wertlos.
openssl rand -base64 32 > /root/.kindkes-backup-passwort
chmod 600 /root/.kindkes-backup-passwort

# Test
/opt/kindkesmoeoen/scripts/backup.sh

# Täglich um 02:30 per Cron
( crontab -l 2>/dev/null; echo "30 2 * * * /opt/kindkesmoeoen/scripts/backup.sh >> /var/log/kindkes-backup.log 2>&1" ) | crontab -
```

- Sicherungen liegen verschlüsselt in `/var/backups/kindkesmoeoen` und werden nach 30 Tagen gelöscht.
- **Externe Kopie:** Zusätzlich auf einen zweiten Speicherort in der EU kopieren (z. B. mit `rclone`, siehe Kommentar in `scripts/backup.sh`). Hostinger-Snapshots allein reichen nicht.
- **Wiederherstellen:** `scripts/restore.sh /var/backups/kindkesmoeoen/kindkes-JJJJ-MM-TT_HHMM.sql.gz.enc`. Die Wiederherstellung am besten vierteljährlich testen.

## 6. Eigene Subdomain (später)

1. Beim Domain-Anbieter einen DNS-Eintrag anlegen: `app.hebammen-landkreisrostock.de` → Typ **A** → IPv4-Adresse des VPS (bei IPv6 zusätzlich **AAAA**).
2. Warten, bis der Eintrag aktiv ist (`dig +short app.hebammen-landkreisrostock.de` zeigt die IP).
3. In `.env` `DOMAIN=app.hebammen-landkreisrostock.de` setzen und `docker compose up -d` ausführen. Caddy holt das neue Zertifikat selbst.
4. Auf den iPads die App einmal unter der neuen Adresse öffnen und neu zum Home-Bildschirm hinzufügen.

## 7. E-Mail (später)

Erinnerungen per E-Mail kommen in einem späteren Meilenstein. Dann werden SMTP-Server, Benutzer und Passwort des Domain-Postfachs in `.env` eingetragen.

## Vor dem Echtbetrieb

- [ ] AVV/DPA mit Hostinger abgeschlossen, Rechenzentrum in der EU
- [ ] Firewall, SSH nur mit Schlüssel, automatische Updates aktiv
- [ ] Produktivumgebung **ohne** `--demo` eingerichtet bzw. Demo-Konten gesperrt
- [ ] Persönliche Konten angelegt, Passwörter geändert
- [ ] Tägliches Backup mit externer Kopie eingerichtet und eine Wiederherstellung getestet
- [ ] Regelwerk fachlich geprüft und freigegeben (Meilenstein 5)
- [ ] Datenschutz-Dokumente (Verzeichnis der Verarbeitungstätigkeiten, TOMs, Datenschutzinformation für Familien) erstellt

## Fehlersuche

| Problem | Prüfen |
|---|---|
| Seite nicht erreichbar | `docker compose ps`; Firewall Ports 80/443; `DOMAIN` korrekt? |
| Zertifikatsfehler | `docker compose logs caddy`; DNS zeigt auf den VPS? Port 80 offen (für die Zertifikatsprüfung nötig)? |
| App startet nicht | `docker compose logs app`; `DB_PASSWORT` nach dem ersten Start geändert? Dann muss es auch in der Datenbank geändert werden. |
| Anmeldung gesperrt | Nach 10 Fehlversuchen in 15 Minuten wartet die Anmeldung 15 Minuten. |
