# Plättchenmodell – interaktive Lernumgebung

Prototyp im Rahmen einer Masterarbeit (Mathematik/Physik, Lehramt):
*Konzeption und KI-gestützte Entwicklung einer interaktiven digitalen
Lernumgebung zur Unterstützung algebraischer Lernprozesse auf Basis des
Plättchenmodells.*

Diese README beschreibt den aktuellen Stand, wie man das Projekt startet,
wie es aufgebaut ist und wie es weitergebaut werden kann.

## Aktueller Stand

- **Kern-Engine** (Plättchen-Datenmodell, Board, Nullpaar-Erkennung) – fertig
- **Modul "Addition & Subtraktion"** – fertig, eigenständig nutzbar
- Module "Multiplikation & Division", "Lineare Terme", "Quadratische Terme &
  Ergänzung" – noch offen (Navigation ist schon vorbereitet, Buttons sind
  aktuell deaktiviert)
- Aufgabenerstellung, Bearbeitungsmodus für Schüler:innen, Studienfunktion –
  bewusst **nicht** Teil dieser Arbeit, siehe Abschnitt "Ausblick" unten

## Ausprobieren (keine Installation nötig)

Am einfachsten mit einem lokalen Server, damit ES-Module korrekt geladen
werden (direktes Doppelklick-Öffnen der `index.html` funktioniert in manchen
Browsern nicht wegen der Modul-Imports):

```bash
# Python ist auf den meisten Rechnern vorinstalliert:
python3 -m http.server 8000
# dann im Browser öffnen:
# http://localhost:8000/index.html
```

Alternativ mit Node.js (falls installiert): `npx serve .` oder eine beliebige
andere statische Server-Lösung. Es wird **kein** `npm install` benötigt – das
Projekt hat keine Abhängigkeiten.

## Tests

Die Kernlogik (Nullpaar-Erkennung, Additions-/Subtraktionsalgorithmus) ist
mit dem in Node.js eingebauten Testrunner getestet (keine Zusatzpakete
nötig, Node ≥ 18):

```bash
node --test tests/
```

`scripts/smoke-test.mjs` ist ein zusätzlicher visueller Smoke-Test mit
Playwright (lädt die Seite in einem echten Browser und prüft Ergebnis und
Konsole). Der ist **nicht** Teil des eigentlichen Produkts und braucht
Playwright separat installiert (`npm install playwright`, dann
`npx playwright install chromium`) – nur relevant für die Weiterentwicklung.

## Projektstruktur

```
plaettchenmodell/
├── index.html            Einstiegspunkt
├── styles/main.css       Gesamtes Styling
├── src/
│   ├── engine/           Reine Logik, UI-unabhängig, getestet
│   │   ├── plaettchen.js Datenmodell eines einzelnen Plättchens
│   │   ├── board.js      Board-Zustand, Nullpaar-Erkennung/-Auflösung
│   │   └── rechnen.js    Additions-/Subtraktionsalgorithmus mit Schritt-Log
│   ├── shared/
│   │   ├── theme.js            Farb-/Formkonzept (siehe unten)
│   │   └── renderPlaettchen.js SVG-Rendering eines Plättchens
│   ├── modules/
│   │   ├── addition-subtraktion/module.js   fertiges Modul
│   │   ├── multiplikation-division/         Platzhalter für Phase 3
│   │   ├── lineare-terme/                   Platzhalter für Phase 4
│   │   └── quadratische-terme/              Platzhalter für Phase 5
│   └── app.js            Navigation zwischen den Modulen
├── tests/engine.test.js  Unit-Tests der Kernlogik
└── scripts/smoke-test.mjs  optionaler Playwright-Smoke-Test
```

**Warum kein Framework/Build-Tool?** In der Cloud-Entwicklungsumgebung, in
der dieses Projekt entstanden ist, gab es keinen Netzwerkzugriff auf
npm-Paketregister – ein `npm install` (z. B. für React/Vite) war dort nicht
möglich. Reines JavaScript mit ES-Modulen umgeht das vollständig und passt
auch inhaltlich gut: keine Installation, kein Build-Schritt, eine Schule
kann die Dateien einfach irgendwo statisch hosten. Die Engine ist bewusst in
reinen Funktionen/Klassen ohne Framework-Bindung gehalten – ein späterer
Umstieg auf React o. Ä. (z. B. für die Ausblick-Phasen mit Accounts) würde
nur die UI-Schicht betreffen.

## Plättchen-Design

| Typ | Form | Positiv | Negativ |
|---|---|---|---|
| Zahl (1) | Kreis | Rot `#D62839` | Grün `#3CB371` |
| x | Balken | Blau `#3A6EA5` | Orange `#F0932B` |
| x² | Quadrat | Gelb `#F6C445` | Violett `#8E5572` |

Grundfarben = positiv, jeweilige Komplementärfarbe = negativ. Damit die
Unterscheidung nie allein von der Farbe abhängt (Rot/Grün ist die häufigste
Farbfehlsichtigkeit), zeigt jedes Plättchen zusätzlich ein **+/− Symbol**,
und negative Plättchen haben zusätzlich eine **Schraffur**. Diese Regel gilt
für alle künftigen Module.

## Wie das Modell für Subtraktion funktioniert

`src/engine/rechnen.js` bildet die didaktisch zentrale Idee des
Plättchenmodells ab: Um `a - b` darzustellen, werden zunächst `|a|`
Plättchen mit dem Vorzeichen von `a` gelegt. Um `b` "wegzunehmen", müssen
`|b|` Plättchen mit dem Vorzeichen von `b` entfernt werden – reichen die
vorhandenen nicht aus (z. B. bei `2 - 5`), werden vorher passend viele
**Nullpaare ergänzt** (die den Wert nicht verändern), bis genug Plättchen
zum Wegnehmen da sind. Jeder Schritt wird sowohl als Text als auch als
Board-Snapshot festgehalten, damit die Oberfläche ihn einzeln animieren
kann.

## Ausblick: Aufgabenerstellung, Bearbeitungsmodus, Studie

Diese drei Bausteine sind laut Aufgabenstellung nicht Teil dieser
Masterarbeit, sollen aber für spätere Arbeiten anschlussfähig bleiben. Damit
das ohne Umbau der Kern-Engine möglich ist:

- Die Engine kennt nur Plättchen-Typ, Vorzeichen und Board-Zustand – keine
  Kopplung an eine bestimmte Aufgabe oder einen Nutzer. Eine Aufgabe wäre
  im einfachsten Fall nur ein Datensatz `{ modul, parameter }`, der ein
  Modul mit vorgegebenen Startwerten öffnet.
- Für Accounts (Lehrkraft/Schüler:in), gespeicherte Aufgaben und
  Studiendaten (Consent, anonymisierte Logs, CSV-Export) empfiehlt der
  Ablaufplan einen Dienst wie Supabase (Postgres + Auth) – unabhängig von
  der Wahl des Frontends und erst relevant, sobald diese Phasen tatsächlich
  umgesetzt werden.
- Der Bearbeitungsweg (nicht nur das Endergebnis) lässt sich bereits heute
  aus den `steps`, die `berechneAddition`/`berechneSubtraktion` zurückgeben,
  ableiten – das wäre die Grundlage für ein späteres Interaktions-Logging.

Der vollständige Ablaufplan mit allen Phasen steht im begleitenden
Planungsdokument der Masterarbeit.
