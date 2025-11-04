# ScoreboardV2

Ein browserbasiertes Scoreboard-Overlay mit passender Controller-Oberflaeche fuer Live-Sport-Streams. Das Zuschauerfenster rendert das Overlay fuer OBS oder vergleichbare Tools, waehrend das Controllerfenster Uhr, Punkte, Spielabschnitt und Branding-Assets in Echtzeit steuert.

## Funktionen
- Zwei-Fenster-Setup: `/index.html` fuer das Overlay, `/controller.html` fuer Operatorinnen und Operatoren.
- Synchronisation zwischen Overlay, Controller und OBS ueber einen lokalen WebSocket-Server.
- Reaktives Vue-3-State-Modell (keine globalen Stores) mit berechneten Anzeige-Hilfen.
- Frame-genaue Spieluhr auf Basis von `requestAnimationFrame`.
- Streaming-taugliches Styling mit konfigurierbaren Logos und Typografie.

## Technologie-Stack
- [Vue 3](https://vuejs.org/) (Composition API + `<script setup>`)
- [Vite](https://vitejs.dev/) fuer Entwicklung und Builds
- Reines CSS fuer Layout und Themes
- WebSocket-basierter Messaging-Layer ohne externes Backend

## Erste Schritte
1. **Abhaengigkeiten installieren**
   ```bash
   npm install
   ```
2. **.env anlegen** (optional, Port/Socket-Pfad; Datei ist gitignored)
   ```bash
   cp .env.example .env
   # PORT=8090
   # SOCKET_PATH=/socket
   # VITE_SOCKET_PATH=/socket
   # MAX_MESSAGE_BYTES=2048
   ```
3. **Dev-Server starten**
   ```bash
   npm run dev
   ```
   Die Controller-Ansicht (`/controller.html`) oeffnet sich automatisch. Das Overlay (`/index.html`) kann im eingebetteten Iframe oder in einem separaten Browserfenster fuer OBS angezeigt werden.
3. *(Optional, Windows)* `start.bat` startet den Dev-Server direkt aus dem Explorer.

### Verfuegbare Skripte
- `npm run dev` - startet Vite mit Hot Module Replacement.
- `npm run build` - erzeugt ein Produktionsbundle in `dist/`.
- `npm run preview` - dient zur lokalen Vorschau des Produktionsbundles.
- `npm run serve` - baut das Bundle und startet einen Node-Server mit WebSocket-Anbindung (Port aus `.env`, Default 8080).
- `npm test` - laeuft Vitest fuer die Kernlogik (`src/shared/scoreboard.js`).

## Projektstruktur
```
.
|-- .gitignore
|-- AGENTS.md
|-- controller.html          # Einstiegspunkt fuer die Bedienoberflaeche
|-- index.html               # Einstiegspunkt fuer das Overlay
|-- package.json
|-- package-lock.json
|-- server.js              # Statischer Server + WebSocket-Relay fuer Controller/Overlay
|-- start.bat                # Windows-Helfer zum Start des Dev-Servers
|-- vite.config.js
|-- public/
|   |-- dfbl.svg             # Logos, die im Scoreboard angezeigt werden
|   |-- fbl.svg
|   `-- pokal.svg
|-- src/
    |-- App.vue              # Root-Komponente des Overlays
    |-- Controller.vue       # Controller-UI mit Tastaturkuerzel
    |-- components/
    |   `-- Scoreboard.vue   # Layout fuer Punkte, Teams und Uhr
    |-- composables/
    |   |-- useClock.js      # requestAnimationFrame-gesteuerte Tick-Events
    |   |-- useSocket.js     # WebSocket-Client fuer Controller und Overlay
    |   `-- useStore.js      # Geteilte reaktive Daten + berechnete Uhrzeit
    |-- main-controller.js   # Bootstrap fuer den Controller
    |-- main.js              # Bootstrap fuer das Overlay
    |-- shared/
    |   `-- scoreboard.js    # Gemeinsame Logik fuer Aktionen & Serialisierung
    `-- style.css            # Globales Styling des Scoreboards
`-- dist/                    # Build-Ausgabe nach `npm run build`
```

## Ablauf der Anwendung
- `src/main.js` mountet `App.vue`, startet die Uhren-Schleife (`useClock`) und initialisiert den WebSocket-Client.
- `src/main-controller.js` mountet `Controller.vue`. Interaktionen und Tastaturkuerzel rufen `send()` aus `useSocket` auf, um den Zustand fensteruebergreifend zu aktualisieren.
- `useStore.js` definiert ein gemeinsames reaktives `state`-Objekt sowie den berechneten Wert `clockText`, den das Overlay anzeigt.
- `Scoreboard.vue` rendert das Scoreboard und nutzt `v-once` fuer statische Labels gemaess der Performance-Regeln.
- Timing- und Animationsvorgaben folgen den internen Richtlinien in `AGENTS.md`: nur Transform/Opacity-Animationen, Uhr-Updates via requestAnimationFrame, Assets lokal aus `public/`.

## Bedienung & Nachrichten
- **Punktestand**: Buttons senden `HOME+/HOME-/AWAY+/AWAY-`.
- **Uhr**:
  - Uhrzeit setzen ueber Eingaben (`SET_CLOCK`)
  - Zuruecksetzen (`RESET_CLOCK`)
  - Sekunden schrittweise anpassen (`ADD_SEC`, `RM_SEC`) oder in Fuenf-Sekunden-Schritten (`ADD_5-SEC`, `RM_5-SEC`)
  - Start/Stopp ueber Tastaturkuerzel (`ä` zum Start, `ö` zum Stoppen) oder Pfeiltasten zur Feinjustierung.
- **Spielabschnitt**: Texteingabe sendet `PERIOD`.
- `useClock` haelt den Countdown exakt, indem beim aktiven Zustand `state.running` die verstrichene Zeit zwischen Animation-Frames abgezogen wird.

## Build & Deployment
1. `npm run build` ausfuehren.
2. Den Inhalt von `dist/` mit einem beliebigen Static-Webserver bereitstellen (`npm run serve` fuer lokale Tests).
3. OBS (oder aehnliche Tools) so konfigurieren, dass das gebaute `index.html` als Overlay geladen und `controller.html` fuer Operatorinnen und Operatoren erreichbar bleibt.

## Tipps zur Anpassung
- Teamnamen, Grundfarben oder Typografie in `Scoreboard.vue` und `style.css` anpassen.
- Neue Branding-Assets in `public/` ablegen und die Auswahl in `Controller.vue` erweitern.
- Neue Commands koennen zentral in `src/shared/scoreboard.js` implementiert werden, damit Server und Client identisch reagieren.
