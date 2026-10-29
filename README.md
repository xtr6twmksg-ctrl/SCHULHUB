# SCHULHUB BS

Eine Web-App für Schülerinnen und Schüler in Braunschweig: Stundenplan und Vertretungen (WebUntis), Bus & Straßenbahn (mit Echtzeit, wo vorhanden) und ein Schnellzugang zu IServ – im hellen „Liquid Glass“-Stil, optimiert fürs iPhone.

> Inoffizielles Projekt. Keine Verbindung zur Sally-Perel-Gesamtschule, zu Untis, IServ oder der BSVG.

---

## 1. Was funktioniert – und was nicht

| Bereich | Status | Datenquelle |
|---|---|---|
| Haltestellensuche Braunschweig | ✅ funktioniert (live getestet) | Transitous |
| Abfahrten mit Auto-Aktualisierung (30 s) | ✅ funktioniert | Transitous (BSVG-/VBN-Fahrplandaten) |
| Echtzeit / Verspätungen / Ausfälle | ⚠️ nur wenn die Quelle Echtzeit liefert, sonst Kennzeichnung „Fahrplan“ | Transitous |
| Verbindungssuche (A → B) | ✅ funktioniert | Transitous |
| Linienfilter an einer Haltestelle | ✅ funktioniert | Transitous |
| Stundenplan, nächste Stunde, Vertretungen, Räume | 🟡 fertig programmiert, braucht WebUntis-Daten der Schule + dein Login | WebUntis JSON-RPC |
| IServ-E-Mails | ❌ keine freigegebene Schnittstelle → Hinweis + Link zu IServ | – |
| Als App auf dem Homescreen (PWA) | ✅ | – |

**Wichtig:** Die App erfindet keine Daten. Fehlt etwas, steht dort ein klarer Hinweis.

---

## 2. Ergebnis der Schnittstellen-Prüfung (einfach erklärt)

### WebUntis
- Untis hat eine dokumentierte **JSON-RPC-Schnittstelle** (`https://<server>.webuntis.com/WebUntis/jsonrpc.do?school=<schule>`). Das offizielle Handbuch dazu („WebUntis JSON-RPC API“) gibt Untis auf Anfrage heraus.
- Anmeldung: mit **WebUntis-Benutzername und -Passwort** (Methode `authenticate`). Man sieht damit genau das, was man auch im WebUntis-Portal sehen darf.
- Abrufbar: eigener Stundenplan (`getTimetable`) inkl. **Entfall**, **Vertretung** (geänderte Lehrkraft), **Raumänderung** und **Vertretungstext**. Die Methode `getSubstitutions` ist meist nur für Lehrkräfte freigeschaltet, deshalb liest die App die Änderungen direkt aus dem Stundenplan.
- Für große, offizielle Integrationen bietet Untis zusätzlich eine Partner-Schnittstelle an. Dafür braucht man aber einen Vertrag mit Untis und die Freigabe der Schule. Für dieses Projekt ist das nicht nötig.
- **Grenze:** Wenn du dich in der WebUntis-App nur per **QR-Code** oder über **„Mit IServ anmelden“** einloggst, hast du eventuell kein eigenes WebUntis-Passwort. Dann klappt die Anmeldung in SCHULHUB BS nicht. Frag in diesem Fall die Schule, ob du ein WebUntis-Passwort setzen kannst.
- Ich hatte **keine echten Zugangsdaten**. Deshalb ist die WebUntis-Anbindung nur mit erfundenen Testdaten geprüft, nicht mit dem echten Schulserver.

### IServ (https://sp-gs.de)
- IServ hat **keine öffentlich dokumentierte Schnittstelle (API)**, über die fremde Apps E-Mails abrufen dürfen.
- IServ kann zwar oft per **IMAP** mit Mailprogrammen genutzt werden. Dann müsste aber dieser Server dein IServ-Passwort kennen und an IServ weitergeben. Das widerspricht den Sicherheitsvorgaben dieses Projekts, deshalb ist es **nicht** eingebaut.
- Login-Automatisierung oder das Auslesen von IServ-Seiten (Scraping) ist ebenfalls bewusst **nicht** eingebaut.
- Stattdessen gibt es einen sauberen Platzhalter mit Link zu IServ und Tipps (offizielle IServ-App, Apple Mail per IMAP).
- **Mögliche Alternative:** IServ kann als Anmeldedienst (Single Sign-On / OAuth / OpenID Connect) für andere Apps dienen. Das muss der IServ-Admin der Schule für diese App einrichten. Ob dabei auch E-Mail-Daten freigegeben werden können, müsste die Schule mit IServ klären.

### Bus & Straßenbahn
- **BSVG/VRB:** Ich habe kein offenes Echtzeit-Angebot (GTFS-Realtime o. Ä.) der BSVG oder des VRB gefunden.
- Die Fahrplandaten der BSVG sind über die offenen Fahrplandaten (VBN/DELFI) verfügbar. **Transitous** ([transitous.org](https://transitous.org)) ist ein freier, gemeinnütziger Dienst, der genau diese Daten und – wo vorhanden – Echtzeitdaten über eine offene Schnittstelle bereitstellt.
- Live getestet: Für die meisten BSVG-Linien lagen im Test **nur Fahrplandaten** vor, für einige Regionallinien (z. B. Bus 230) Echtzeit. Die App zeigt das pro Abfahrt an: „Fahrplan“ (grau) = keine Echtzeit, grünes Funk-Symbol = Echtzeit, gelb = Verspätung, rot = Ausfall.
- **Nutzungsbedingungen von Transitous:** Das Projekt muss **Open Source** und **nicht kommerziell** sein, jede Anfrage braucht einen User-Agent mit Kontaktadresse (Variable `TRANSIT_CONTACT`), und es muss ein sichtbarer Quellenhinweis angezeigt werden (ist eingebaut). Keine Massenabfragen.

---

## 3. Projektstruktur

```
schulhub-bs/
├─ api/                    ← kleines Backend (läuft bei Vercel als „Serverless Functions“)
│  ├─ _lib/                ← Hilfsdateien (werden nicht selbst veröffentlicht)
│  │  ├─ http.ts           ← Antworten, Cookies, Schutz gegen fremde Webseiten
│  │  ├─ session.ts        ← verschlüsseltes Sitzungs-Cookie (AES-256-GCM)
│  │  ├─ untis.ts          ← WebUntis JSON-RPC-Client
│  │  ├─ lessons.ts        ← wandelt WebUntis-Daten in Unterrichtsstunden um
│  │  └─ transit.ts        ← Transitous-Client
│  ├─ config.ts            ← GET  /api/config        (was ist eingerichtet?)
│  ├─ untis/login.ts       ← POST /api/untis/login
│  ├─ untis/logout.ts      ← POST /api/untis/logout
│  ├─ untis/timetable.ts   ← GET  /api/untis/timetable?start=…&end=…
│  └─ transit/
│     ├─ stops.ts          ← GET  /api/transit/stops?q=…
│     ├─ departures.ts     ← GET  /api/transit/departures?stopId=…
│     └─ plan.ts           ← GET  /api/transit/plan?from=…&to=…
├─ public/                 ← Icons, Web-App-Manifest, Service Worker
├─ src/                    ← die Oberfläche (React)
│  ├─ components/          ← Bausteine: Karten, Buttons, Abfahrtszeile, Login …
│  ├─ pages/               ← Start, Stundenplan, Fahrplan, E-Mail, Einstellungen
│  ├─ lib/                 ← Datenabruf, Zeitfunktionen, Favoriten
│  ├─ App.tsx              ← Rahmen mit Tab-Leiste
│  └─ index.css            ← Design (Farben, Glas-Effekt, Animationen)
├─ .env.example            ← Vorlage für die Einstellungen (ohne Geheimnisse)
├─ vercel.json             ← Hosting-Einstellungen + Sicherheits-Header
└─ vite.config.ts          ← Build-Einstellungen + lokaler API-Server
```

Technik: React 19, TypeScript, Vite 7, Tailwind CSS 4, Lucide-Icons. Keine Datenbank nötig.

---

## 4. Lokal starten (Windows)

Voraussetzung: [Node.js](https://nodejs.org) ab Version 20 (ist auf deinem PC bereits installiert).

1. Ein Terminal (PowerShell) im Ordner `schulhub-bs` öffnen.
2. Abhängigkeiten installieren (nur beim ersten Mal):
   ```bash
   npm install
   ```
3. Datei `.env.example` kopieren und die Kopie `.env` nennen. Werte eintragen (siehe Abschnitt 5). Für den Fahrplan reicht schon `TRANSIT_CONTACT`.
4. Starten:
   ```bash
   npm run dev
   ```
5. Im Browser `http://localhost:5173` öffnen.

Weitere Befehle: `npm run build` (fertige Version bauen und prüfen), `npm run preview` (fertige Version ansehen).

---

## 5. WebUntis einrichten

Du brauchst zwei Angaben über deine Schule – **keine** Passwörter:

1. Öffne [webuntis.com](https://webuntis.com) und suche nach „Sally-Perel-Gesamtschule“.
2. Wähle die Schule aus. Danach steht in der Adresszeile etwas wie
   `https://XXXX.webuntis.com/WebUntis/?school=YYYY#/basic/login`
3. Trage ein:
   - `WEBUNTIS_SERVER=XXXX.webuntis.com`
   - `WEBUNTIS_SCHOOL=YYYY` (genau so wie in der Adresse; steht dort `%20` oder `+`, ist das ein Leerzeichen)
4. `SESSION_SECRET` erzeugen (zufälliger Schlüssel):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
   Die Ausgabe hinter `SESSION_SECRET=` einfügen.
5. App neu starten. Unter **Stundenplan** erscheint jetzt das Anmeldeformular.

Falls die Anmeldung nicht klappt: Prüfe, ob du dich mit denselben Daten auf der WebUntis-Webseite (nicht in der App) einloggen kannst.

---

## 6. Auf dem iPhone testen

### Variante A – im gleichen WLAN (schnell, ohne Hosting)
1. PC und iPhone im **selben WLAN**.
2. `npm run dev` starten. Im Terminal steht eine Zeile `Network: http://192.168.x.x:5173`.
3. Diese Adresse in **Safari** auf dem iPhone öffnen.
4. Windows fragt evtl., ob Node.js im Netzwerk erreichbar sein darf → für **private Netzwerke** erlauben.

Hinweis: Ohne HTTPS funktionieren „Zum Home-Bildschirm“ und Offline-Start nur eingeschränkt. Zum Testen der Oberfläche und des Fahrplans reicht es.

### Variante B – nach dem Hosting (empfohlen)
1. Deine Vercel-Adresse (z. B. `https://schulhub-bs.vercel.app`) in Safari öffnen.
2. Teilen-Symbol → **„Zum Home-Bildschirm“**.
3. Die App startet dann wie eine normale App im Vollbild.

---

## 7. Kostenlos im Internet veröffentlichen (GitHub + Vercel)

Beides ist kostenlos. Vercel liefert automatisch HTTPS.

**Schritt 1 – GitHub**
1. Konto auf [github.com](https://github.com) anlegen.
2. Oben rechts **„+“ → New repository**, Name `schulhub-bs`, Sichtbarkeit **Public** (Transitous verlangt Open Source), **ohne** README erstellen.
3. Am einfachsten mit [GitHub Desktop](https://desktop.github.com): *File → Add local repository* → Ordner `schulhub-bs` wählen → „create a repository“ → *Publish repository*.
   Die Datei `.env` wird dank `.gitignore` **nicht** hochgeladen. Prüfe das trotzdem: In der Dateiliste von GitHub Desktop darf `.env` nicht auftauchen.

**Schritt 2 – Vercel**
1. Auf [vercel.com](https://vercel.com) mit dem GitHub-Konto anmelden (Plan „Hobby“, kostenlos).
2. **Add New → Project** → Repository `schulhub-bs` → **Import**.
3. Framework „Vite“ wird erkannt. Nichts ändern.
4. Unter **Environment Variables** eintragen:
   | Name | Wert |
   |---|---|
   | `TRANSIT_CONTACT` | deine E-Mail oder die GitHub-Adresse des Projekts |
   | `SESSION_SECRET` | neuer Zufallsschlüssel (siehe Abschnitt 5, **nicht** denselben wie lokal) |
   | `WEBUNTIS_SERVER` | z. B. `XXXX.webuntis.com` |
   | `WEBUNTIS_SCHOOL` | Schulname aus der WebUntis-Adresse |
   | `ISERV_URL` | `https://sp-gs.de` |
5. **Deploy** klicken. Nach ca. 1 Minute bekommst du eine Adresse wie `https://schulhub-bs.vercel.app`.
6. Unter *Settings → Functions* die Region **Frankfurt (fra1)** prüfen (ist in `vercel.json` voreingestellt).

Jede Änderung, die du später zu GitHub hochlädst, veröffentlicht Vercel automatisch neu.

---

## 8. Datenschutz & Sicherheit

**Was verarbeitet wird**
- **WebUntis-Login:** Benutzername und Passwort gehen per HTTPS an die Funktion `/api/untis/login` und von dort direkt an WebUntis. Sie werden **nie protokolliert** und **nicht auf dem Server gespeichert**.
- **Sitzung:** Auf deinem Gerät liegt ein **verschlüsseltes** Cookie (`HttpOnly`, `Secure`, `SameSite=Strict`), das ohne `SESSION_SECRET` unlesbar ist und das JavaScript nicht auslesen kann:
  - **ohne „Angemeldet bleiben“:** max. 8 Stunden, nur WebUntis-Sitzungskennung und Personen-ID.
  - **mit „Angemeldet bleiben“ (Standard):** max. 90 Tage, zusätzlich **verschlüsselt** Benutzername und Passwort. Damit meldet sich der Server automatisch neu bei WebUntis an, wenn dessen Sitzung abläuft. „Abmelden“ löscht das Cookie sofort. Auf fremden oder geteilten Geräten das Häkchen weglassen.
  - Wird `SESSION_SECRET` geändert, sind alle gespeicherten Anmeldungen sofort ungültig (Notfall-Schalter).
- **Stundenplan:** wird nur durchgereicht und **nirgends gespeichert**. Auch der Service Worker speichert keine API-Antworten.
- **Favoriten-Haltestellen:** nur im Browser deines Geräts (localStorage).
- **Fahrplan-Anfragen:** Haltestellen-IDs und Suchtext gehen an Transitous, **ohne** persönliche Daten.
- **Hosting-Logs:** Vercel protokolliert technische Zugriffe (Adresse, Uhrzeit, IP) für kurze Zeit. Passwörter stehen nicht darin, weil sie im Anfrage-Körper und nicht in der Adresse stehen.

**Schutzmaßnahmen:** keine Konten, keine Datenbank, keine Tracker, keine externen Schriften. Strenge Content-Security-Policy und weitere Sicherheits-Header (`vercel.json`). Schreibende Anfragen werden nur von der eigenen Seite angenommen. WebUntis-Anfragen gehen nur an `*.webuntis.com`. Alle Eingaben werden geprüft.

**Tipp:** Teile deine Vercel-Adresse nur mit Leuten, denen du vertraust. Jeder Nutzer meldet sich mit seinem **eigenen** WebUntis-Konto an und sieht nur seinen eigenen Plan. Es gibt keine öffentlichen Profile.

---

## 9. Noch benötigte Freigaben und Zugangsdaten

| Was | Wofür | Von wem |
|---|---|---|
| `WEBUNTIS_SERVER` und `WEBUNTIS_SCHOOL` | Stundenplan | webuntis.com-Schulsuche (siehe Abschnitt 5) |
| Eigenes WebUntis-**Passwort** (nicht nur QR-Code/IServ-Login) | Anmeldung in der App | Schule / WebUntis-Admin, falls du keins hast |
| Zustimmung der Schule (empfohlen) | Schüler-Projekt mit Schuldaten | Schulleitung / Datenschutzbeauftragte(r) |
| Offizielles JSON-RPC-Handbuch (optional) | Genaue Feld-Dokumentation | Untis-Support |
| IServ-Schnittstelle oder SSO-Freigabe | E-Mail-Anzeige | IServ-Admin der Schule (aktuell nicht verfügbar) |
| `TRANSIT_CONTACT` | Pflichtangabe für Transitous | du selbst (E-Mail oder GitHub-Link) |
| `SESSION_SECRET` | Verschlüsselung | selbst erzeugen (Abschnitt 5) |
| Öffentliches GitHub-Repo | Open-Source-Pflicht von Transitous | du selbst |
| Echtzeitdaten der BSVG (optional) | Mehr Verspätungsinfos | BSVG / VRB – bisher kein offenes Angebot gefunden |

---

## 10. Bekannte Grenzen

- Mit „Angemeldet bleiben“ hält die Anmeldung bis zu 90 Tage, ohne das Häkchen bis zu 8 Stunden. Änderst du dein WebUntis-Passwort, musst du dich neu anmelden.
- Auf dem iPhone haben Safari und die Homescreen-App getrennte Speicher: Melde dich in der Homescreen-App einmal selbst an.
- Die Haltestellensuche nutzt einen deutschlandweiten Suchdienst. Manche Ortsteil-Namen (z. B. „Volkmarode“) findet man besser über eine konkrete Haltestelle wie „Moorhüttenweg“ oder „Seikenkamp“.
- Transitous ist ein ehrenamtlicher Dienst ohne Garantie. Fällt er aus, zeigt die App eine Fehlermeldung mit „Erneut versuchen“.
- Echtzeit gibt es nur, wo die Verkehrsunternehmen Echtzeitdaten offen bereitstellen.

## Quellen
- Transitous API & Nutzungsbedingungen: https://transitous.org/api/
- MOTIS API-Dokumentation: https://redocly.github.io/redoc/?url=https://raw.githubusercontent.com/motis-project/motis/refs/tags/v2.10.2/openapi.yaml
- Untis Hilfe – Schnittstellen: https://help.untis.at
- Datenquellen von Transitous: https://transitous.org/sources/

Lizenz: MIT (siehe `LICENSE`).
