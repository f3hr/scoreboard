# ScoreboardV2

Ein browserbasiertes Scoreboard-Overlay mit passender Controller-Oberflaeche fuer Live-Sport-Streams. Das Zuschauerfenster rendert das Overlay fuer OBS oder vergleichbare Tools, waehrend das Controllerfenster Uhr, Punkte, Spielabschnitt und Branding-Assets in Echtzeit steuert.

## Funktionen
- Zwei-Fenster-Setup: `/index.html` fuer das Overlay, `/controller.html` fuer Operatorinnen und Operatoren.
- Lokale Kommunikation zwischen Fenstern ueber die BroadcastChannel API, ganz ohne Backend.
- Reaktives Vue-3-State-Modell (keine globalen Stores) mit berechneten Anzeige-Hilfen.
- Frame-genaue Spieluhr auf Basis von `requestAnimationFrame`.
- Streaming-taugliches Styling mit konfigurierbaren Logos und Typografie.

## Technologie-Stack
- [Vue 3](https://vuejs.org/) (Composition API + `<script setup>`)
- [Vite](https://vitejs.dev/) fuer Entwicklung und Builds
- Reines CSS fuer Layout und Themes
- BroadcastChannel API fuer Messaging

## Erste Schritte
1. **Abhaengigkeiten installieren**
   ```bash
   npm install
   ```
2. **Dev-Server starten**
   ```bash
   npm run dev
   ```
   Die Controller-Ansicht (`/controller.html`) oeffnet sich automatisch. Das Overlay (`/index.html`) kann im eingebetteten Iframe oder in einem separaten Browserfenster fuer OBS angezeigt werden.
3. *(Optional, Windows)* `start.bat` startet den Dev-Server direkt aus dem Explorer.

### Verfuegbare Skripte
- `npm run dev` - startet Vite mit Hot Module Replacement.
- `npm run build` - erzeugt ein Produktionsbundle in `dist/`.
- `npm run preview` - dient zur lokalen Vorschau des Produktionsbundles.
- `npm run serve` - liefert das gebaute Bundle ueber `http-server` auf Port 8080 aus.

## Projektstruktur
```
.
|-- .gitignore
|-- AGENTS.md
|-- controller.html          # Einstiegspunkt fuer die Bedienoberflaeche
|-- index.html               # Einstiegspunkt fuer das Overlay
|-- package.json
|-- package-lock.json
|-- start.bat                # Windows-Helfer zum Start des Dev-Servers
|-- vite.config.js
|-- public/
|   |-- dfbl.svg             # Logos, die im Scoreboard angezeigt werden
|   |-- fbl.svg
|   `-- pokal.svg
`-- src/
    |-- App.vue              # Root-Komponente des Overlays
    |-- Controller.vue       # Controller-UI mit Tastaturkuerzel
    |-- components/
    |   `-- Scoreboard.vue   # Layout fuer Punkte, Teams und Uhr
    |-- composables/
    |   |-- useBroadcast.js  # BroadcastChannel-Helfer
    |   |-- useClock.js      # Countdown-Uhr via requestAnimationFrame
    |   `-- useStore.js      # Geteilte reaktive Daten + berechnete Uhrzeit
    |-- main-controller.js   # Bootstrap fuer den Controller
    |-- main.js              # Bootstrap fuer das Overlay
    `-- style.css            # Globales Styling des Scoreboards
```

## Ablauf der Anwendung
- `src/main.js` mountet `App.vue`, startet die Uhren-Schleife (`useClock`) und hoert auf eingehende Nachrichten (`useBroadcast`).
- `src/main-controller.js` mountet `Controller.vue`. Interaktionen und Tastaturkuerzel rufen `send()` aus `useBroadcast` auf, um den Zustand fensteruebergreifend zu aktualisieren.
- `useStore.js` definiert ein gemeinsames reaktives `state`-Objekt sowie den berechneten Wert `clockText`, den das Overlay anzeigt.
- `Scoreboard.vue` rendert das Scoreboard und nutzt `v-once` fuer statische Labels gemaess der Performance-Regeln.
- Timing- und Animationsvorgaben folgen den internen Richtlinien in `AGENTS.md`: nur Transform/Opacity-Animationen, Uhr-Updates via requestAnimationFrame, Assets lokal aus `public/`.

## Bedienung & Nachrichten
- **Punktestand**: Buttons senden `HOME+/HOME-/AWAY+/AWAY-`.
- **Spieltyp**: Dropdown verschickt `SET_GAME-TYP` mit dem ausgewaehlten SVG.
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
- Das Broadcast-Protokoll in `useBroadcast.js` um zusaetzliche Aktionen (z. B. Strafen, Auszeiten) erweitern.
