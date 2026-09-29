import { createPalette, ALLE_TYPEN } from '../../shared/palette.js';
import { verdrahteTermToggle, erzeugeFreieFlaeche } from '../../shared/freieFlaeche.js';
import { parseTerm, formatiereKoeffizientenAlsTerm } from '../../engine/termParser.js';
import { koeffizientenAusRaster } from '../../engine/multiplikationRaster.js';
import { berechneKlammernMultiplikation } from '../../engine/rechnen.js';
import { createAndockRasterUI } from '../../shared/andockRaster.js';
import { erzeugeZeilenkette } from '../../shared/zeilenkette.js';
import { erzeugeUndoSpeicher } from '../../shared/undo.js';

// Faktoren sind lineare Klammern (nur x und Zahl) – das Produkt kann trotzdem
// x² enthalten, siehe multiplikationRaster.js.
const ACHSEN_TYPEN = [
  { kind: 'x', sign: 1 },
  { kind: 'x', sign: -1 },
  { kind: 'zahl', sign: 1 },
  { kind: 'zahl', sign: -1 },
];

/**
 * "Multiplikation von Klammern/Das Malkreuz" (Erklärungen): zeigt zunächst
 * eine GEFÜHRTE, Schritt-für-Schritt erzählte Erklärung (neu in Runde 18,
 * Nutzer-Rückmeldung Punkt 3 – bislang gab es hier nur die freie Übung
 * darunter, keine Erzählung), danach die schon bestehende freie Übung zum
 * selbstständigen Üben. Beide teilen sich dieselbe Malkreuz-Komponente
 * (shared/andockRaster.js), siehe die jeweiligen Abschnitts-Kommentare
 * unten.
 *
 * Stand bis Runde 16 als Unterpunkt unter "Terme" (daher der Ordnername
 * dieser Datei ursprünglich), seit Runde 17 (Nutzer-Rückmeldung Punkt 5) als
 * Unterpunkt unter "Erklärungen" eingehängt (siehe modules/erklaerungen/
 * module.js). Der Reiter selbst hieß bis Runde 17 "Klammern multiplizieren"
 * und heißt seit Runde 18 (Nutzer-Rückmeldung Punkt 3) "Multiplikation von
 * Klammern/Das Malkreuz" (siehe erklaerungen/module.js).
 */
export function mountKlammernMultiplizierenErklaerung(container) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <section class="rechen-beispiel" data-teil="erklaerung">
      <h3 class="rechen-beispiel__titel">Geführte Erklärung: Zwei Klammern multiplizieren</h3>
    </section>
    <section class="rechen-beispiel" data-teil="uebung">
      <h3 class="rechen-beispiel__titel">Frei üben</h3>
    </section>
  `);

  mountGefuehrteErklaerung(container.querySelector('[data-teil="erklaerung"]'));
  mountUebung(container.querySelector('[data-teil="uebung"]'));
}

/**
 * Geführte, Schritt-für-Schritt erzählte Erklärung (Runde 18, Nutzer-
 * Rückmeldung Punkt 3): zwei lineare Klammern werden als Text eingegeben
 * (z. B. "x+3" und "x-2", über `parseTerm` – dieselbe Eingabe-Logik wie bei
 * "Term zu Plättchen" o. Ä., hier aber auf lineare Klammern ohne x²
 * beschränkt), danach zeigt `berechneKlammernMultiplikation`
 * (engine/rechnen.js) den Rechenweg Schritt für Schritt: erst Klammer A
 * Plättchen für Plättchen ans Malkreuz (oben links), dann Klammer B (unten
 * rechts), anschließend jede Produkt-Zelle einzeln, zuletzt das
 * ausmultiplizierte Ergebnis – folgt demselben Formular-/Frame-/"Nächster
 * Schritt"-Muster wie die übrigen Erklär-Ansichten.
 *
 * Jeder Schritt trägt statt eines Board-Snapshots einen Snapshot des
 * Malkreuz-`raster` – `zustandAusRasterSnapshot` unten übersetzt das in den
 * von `createAndockRasterUI`s `stelleZustandWieder` erwarteten Zustand
 * (dieselbe Form, die die Komponente intern für ihr eigenes "Rückgängig"
 * verwendet, hier zweckentfremdet, um "Nächster Schritt" auf einen
 * beliebigen Zwischenstand zu setzen). Diese Ansicht ist rein anschaulich
 * (nicht ziehbar, kein eigenes "Rückgängig") – die freie Übung darunter
 * (`mountUebung`) bleibt der Ort, an dem selbst gezogen werden muss.
 *
 * Wie die drei übrigen Erklär-Ansichten bietet auch diese "Frei ab hier
 * weiterarbeiten" an – vorbefüllt mit allen aktuell sichtbaren Plättchen
 * (beide Faktor-Ketten UND alle bereits gefüllten Produkt-Zellen).
 */
function mountGefuehrteErklaerung(container) {
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Gib zwei lineare Klammern ein (z. B. „x+3" und „x-2") und lass dir Schritt für Schritt zeigen, wie das Malkreuz sie multipliziert.</p>
    <form class="term-check-form" novalidate>
      <div class="feld feld--term"><label for="km-faktor-a">Klammer A</label><input id="km-faktor-a" type="text" value="x+3" autocomplete="off"></div>
      <div class="feld feld--term"><label for="km-faktor-b">Klammer B</label><input id="km-faktor-b" type="text" value="x-2" autocomplete="off"></div>
      <button type="button" class="zufall-btn">Zufällig</button>
      <button type="submit" class="ueberpruefen-btn">Neu darstellen</button>
    </form>
    <p class="term-check-feedback" role="status" aria-live="polite"></p>
    <div class="arbeitsflaeche">
      <div class="tafel-wrapper">
        <h4>Malkreuz</h4>
        <div class="malkreuz-host km-erklaerung-host"></div>
        <button type="button" class="weiter-btn">Nächster Schritt →</button>
        <button type="button" class="frei-weiterarbeiten-btn" hidden>Frei ab hier weiterarbeiten</button>
      </div>
      <div class="protokoll-wrapper">
        <h4>Rechenweg</h4>
        <ol class="schritte-log"></ol>
      </div>
    </div>
    <div class="frei-weiterarbeiten-host" hidden></div>
  `);

  const form = container.querySelector('.term-check-form');
  const faktorAInput = container.querySelector('#km-faktor-a');
  const faktorBInput = container.querySelector('#km-faktor-b');
  const zufallBtn = container.querySelector('.zufall-btn');
  const feedbackEl = container.querySelector('.term-check-feedback');
  const hostEl = container.querySelector('.km-erklaerung-host');
  const logEl = container.querySelector('.schritte-log');
  const weiterBtn = container.querySelector('.weiter-btn');
  const freiBtn = container.querySelector('.frei-weiterarbeiten-btn');
  const freiHostEl = container.querySelector('.frei-weiterarbeiten-host');

  let frames = [];
  let index = 0;
  let freieKetteErstellt = false;
  let andock = null;

  function setzeFreieFortsetzungZurueck() {
    freieKetteErstellt = false;
    freiHostEl.hidden = true;
    freiHostEl.innerHTML = '';
  }

  freiBtn.addEventListener('click', () => {
    if (freieKetteErstellt || frames.length === 0) return;
    freieKetteErstellt = true;
    // .bereich-artige Zusatzinformationen gibt es hier nicht – die freie
    // Fortsetzung übernimmt einfach ALLE aktuell sichtbaren Plättchen (beide
    // Faktor-Ketten + bereits gefüllte Produkt-Zellen) als lose Sammlung.
    const startTiles = tilesAusRasterFrame(frames[index].raster);
    freiHostEl.hidden = false;
    erzeugeFreieFlaeche(freiHostEl, {
      flaechenTitel: 'Freie Fortsetzung (Kopie des Malkreuzes)',
      initialTiles: startTiles,
    });
  });

  function zeigeFrameBis(i) {
    logEl.innerHTML = '';
    for (let j = 0; j <= i; j += 1) {
      if (frames[j].logLabel) appendLogEntry(logEl, frames[j].logLabel, frames[j].logIsResult);
    }
    const frame = frames[i];
    if (frame.emptyMessage) {
      hostEl.innerHTML = '';
      andock = null;
      const p = document.createElement('p');
      p.className = 'tafel-leer';
      p.textContent = frame.emptyMessage;
      hostEl.appendChild(p);
    } else {
      if (!andock) {
        hostEl.innerHTML = '';
        // Rein anschaulich (siehe Datei-Kommentar oben): beide Achsen fest
        // gesperrt, damit sich am Malkreuz nichts herausziehen lässt – nur
        // "Nächster Schritt"/"Frei ab hier weiterarbeiten" verändern hier
        // etwas.
        andock = createAndockRasterUI(hostEl, {
          zeilenLabel: 'Klammer A',
          spaltenLabel: 'Klammer B',
          zeilenGesperrt: () => true,
          spaltenGesperrt: () => true,
        });
      }
      andock.stelleZustandWieder(zustandAusRasterSnapshot(frame.raster));
    }
    freiBtn.hidden = false;
  }

  function aktualisiereWeiterButton() {
    const fertig = index >= frames.length - 1;
    weiterBtn.disabled = fertig;
    weiterBtn.textContent = fertig ? 'Fertig ✓' : 'Nächster Schritt →';
  }

  function starte(faktorA, faktorB) {
    setzeFreieFortsetzungZurueck();
    andock = null;
    const { steps } = berechneKlammernMultiplikation(faktorA, faktorB);
    frames = baueFrames(steps);
    index = 0;
    zeigeFrameBis(0);
    aktualisiereWeiterButton();
  }

  /** Anfangszustand: leeres Malkreuz, kein Rechenweg – erst nach "Neu darstellen" wird gerechnet. */
  function zeigeLeer() {
    setzeFreieFortsetzungZurueck();
    andock = null;
    frames = [];
    index = 0;
    logEl.innerHTML = '';
    hostEl.innerHTML = '';
    const hinweis = document.createElement('p');
    hinweis.className = 'tafel-leer';
    hinweis.textContent = 'Noch keine Klammern dargestellt – zwei Klammern eingeben und auf "Neu darstellen" klicken.';
    hostEl.appendChild(hinweis);
    weiterBtn.disabled = true;
    weiterBtn.textContent = 'Nächster Schritt →';
    freiBtn.hidden = true;
  }

  weiterBtn.addEventListener('click', () => {
    if (index >= frames.length - 1) return;
    index += 1;
    zeigeFrameBis(index);
    aktualisiereWeiterButton();
  });

  /** Liest eine Eingabe als lineare Klammer ({x, zahl}); null bei ungültiger oder quadratischer Eingabe. */
  function leseLineareKlammer(eingabe) {
    const koeffizienten = parseTerm(eingabe);
    if (!koeffizienten || koeffizienten.x2 !== 0) return null;
    return { x: koeffizienten.x, zahl: koeffizienten.zahl };
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const faktorA = leseLineareKlammer(faktorAInput.value);
    const faktorB = leseLineareKlammer(faktorBInput.value);
    feedbackEl.classList.remove('term-check-feedback--fehler');
    if (!faktorA || !faktorB) {
      feedbackEl.textContent = 'Bitte zwei gültige lineare Klammern eingeben, ohne x² (z. B. „x+3" und „x-2").';
      feedbackEl.classList.add('term-check-feedback--fehler');
      return;
    }
    feedbackEl.textContent = '';
    starte(faktorA, faktorB);
  });

  zufallBtn.addEventListener('click', () => {
    faktorAInput.value = zufaelligeLineareKlammer();
    faktorBInput.value = zufaelligeLineareKlammer();
    feedbackEl.textContent = '';
    feedbackEl.classList.remove('term-check-feedback--fehler');
  });

  zeigeLeer();
}

/**
 * Zufällige lineare Klammer für den "Zufällig"-Button, klein genug, um
 * innerhalb des Plättchen-Limits von `berechneKlammernMultiplikation` zu
 * bleiben (x-Koeffizient und Zahl je in [-3, 3], nicht beide 0).
 */
function zufaelligeLineareKlammer() {
  let x;
  let zahl;
  do {
    x = Math.floor(Math.random() * 7) - 3;
    zahl = Math.floor(Math.random() * 7) - 3;
  } while (x === 0 && zahl === 0);
  return formatiereKoeffizientenAlsTerm({ x2: 0, x, zahl });
}

/** Übersetzt die Rechenweg-Schritte in einzeln anzeigbare Frames (Feldnamen wie bei den übrigen Erklär-Ansichten). */
function baueFrames(steps) {
  return steps.map((step) => ({
    raster: step.raster,
    logLabel: step.label,
    logIsResult: step.type === 'result',
    emptyMessage: step.type === 'error' ? step.label : undefined,
  }));
}

/** Sammelt alle aktuell sichtbaren Plättchen eines Malkreuz-Rasters (beide Ketten + gefüllte Produkt-Zellen) als lose Liste. */
function tilesAusRasterFrame(raster) {
  const tiles = [];
  for (const t of raster.zeilen) tiles.push({ kind: t.kind, sign: t.sign });
  for (const t of raster.spalten) tiles.push({ kind: t.kind, sign: t.sign });
  for (const reihe of raster.zellen) {
    for (const zelle of reihe) {
      if (zelle.gefuellt) tiles.push({ kind: zelle.erwarteteArt, sign: zelle.erwartetesVorzeichen });
    }
  }
  return tiles;
}

/**
 * Wandelt einen reinen Raster-Snapshot (wie ihn `berechneKlammernMultiplikation`
 * liefert) in den Zustand um, den `createAndockRasterUI`s `stelleZustandWieder`
 * erwartet ({raster, zellTiles, naechsteZellId}) – `zellTiles` ist reine
 * Render-Buchhaltung (DOM-Element-Ids je gefüllter Zelle) ohne fachliche
 * Bedeutung, siehe shared/andockRaster.js.
 */
function zustandAusRasterSnapshot(raster) {
  const rasterKopie = typeof structuredClone === 'function' ? structuredClone(raster) : JSON.parse(JSON.stringify(raster));
  const zellTiles = new Map();
  let naechsteZellId = 0;
  rasterKopie.zellen.forEach((reihe, i) => {
    reihe.forEach((zelle, j) => {
      if (zelle.gefuellt) {
        naechsteZellId += 1;
        zellTiles.set(`${i},${j}`, `km-erklaerung-zelle-${naechsteZellId}`);
      }
    });
  });
  return { raster: rasterKopie, zellTiles, naechsteZellId };
}

function appendLogEntry(logEl, text, isResult = false) {
  const li = document.createElement('li');
  li.textContent = text;
  if (isResult) li.classList.add('schritte-log__ergebnis');
  logEl.appendChild(li);
}

/**
 * Freie Übung zur Multiplikation zweier linearer Klammern nach dem
 * Flächenmodell (unverändert seit Runde 12, siehe unten) – ergänzt seit
 * Runde 18 die neue geführte Erklärung oben (`mountGefuehrteErklaerung`).
 *
 * Seit Runde 14 (Nutzer-Rückmeldung: "Das komplette Andockverfahren
 * funktioniert nicht wie ich das wollte") entsteht ein echtes "Malkreuz":
 * zwei sich kreuzende Linien, unten links ein festes Malzeichen, oben links
 * ein Faktor stehend/übereinander, unten rechts der andere Faktor
 * liegend/nebeneinander, oben rechts das zu füllende Produkt-Raster.
 * Angedockt wird an die Seite des jeweils letzten Plättchens einer Kette
 * (bzw. an den gestrichelten Platzhalter direkt danach) – siehe
 * andockRaster.js für die vollständige Begründung der Geometrie. Die
 * Produkt-Plättchen selbst müssen weiterhin von Hand aus einer eigenen
 * Auswahl in die leeren Zellen gezogen werden – das war schon in Runde 12
 * der eigentliche Lern-Kern und bleibt unverändert (jede Zelle wird einzeln
 * geprüft, kein automatisches Einfüllen).
 *
 * Seit Runde 15 steckt das Malkreuz in einer Zeilenkette (shared/
 * zeilenkette.js): "+ Neue Zeile darunter" hängt ein weiteres, gleichwertiges
 * Malkreuz an, dessen beide Faktoren (Zeilen-/Spalten-Plättchen) bereits aus
 * der vorherigen Zeile übernommen sind – das Produkt-Raster selbst startet
 * bewusst wieder leer, damit die eigentliche Lern-Aufgabe (Zellen befüllen)
 * in der neuen Zeile erneut bearbeitet wird. Diese Zeilenkette ist seit
 * Runde 17 nur noch hier im Einsatz (die freie Kästchenfläche hat seither
 * ihre eigene, gespiegelte Verkettung, siehe shared/freieFlaeche.js).
 */
function mountUebung(container) {
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Ziehe Plättchen aus der <strong>linken Auswahl</strong> an die Seite des jeweils letzten Plättchens oben links (wird Stück für Stück zu einem Faktor, stehend) oder unten rechts (wird Stück für Stück zum anderen Faktor, liegend). Sobald beide Faktoren mindestens ein Plättchen haben, öffnet sich oben rechts das Produkt-Raster – die passenden Produkt-Plättchen musst du selbst aus der <strong>rechten Auswahl</strong> in die leeren Zellen ziehen.</p>
    <div class="zeilenkette-host"></div>
  `);

  erzeugeZeilenkette(container.querySelector('.zeilenkette-host'), {
    mountZeile(inhaltEl, { vorherigerZustand }) {
      inhaltEl.insertAdjacentHTML('beforeend', `
        <div class="klammern-layout">
          <div class="klammern-palette-spalte">
            <h3>Faktor-Plättchen <span class="klammer-baustein__hinweis">ans Kreuz ziehen</span></h3>
            <div class="achsen-palette"></div>
            <button type="button" class="mult-zuruecksetzen-btn">Zurücksetzen</button>
          </div>
          <div class="klammern-andock-spalte">
            <div class="andock-host"></div>
            <p class="mult-status" aria-live="polite"></p>
            <button type="button" class="rueckgaengig-btn" disabled>↶ Rückgängig</button>
          </div>
          <div class="klammern-palette-spalte">
            <h3>Produkt-Plättchen <span class="klammer-baustein__hinweis">in leere Zellen ziehen</span></h3>
            <div class="mult-palette"></div>
          </div>
        </div>
        <button type="button" class="term-toggle-btn" hidden>Ausmultiplizierten Term anzeigen</button>
        <div class="term-anzeige" hidden>
          <span class="term-anzeige__label">Ausmultiplizierter Term</span>
          <span class="term-anzeige__wert">0</span>
        </div>
      `);

      const statusEl = inhaltEl.querySelector('.mult-status');
      const termToggleBtn = inhaltEl.querySelector('.term-toggle-btn');
      const termAnzeigeEl = inhaltEl.querySelector('.term-anzeige');
      const termWertEl = inhaltEl.querySelector('.term-anzeige__wert');

      verdrahteTermToggle(termToggleBtn, termAnzeigeEl, {
        textAnzeigen: 'Ausmultiplizierten Term anzeigen',
        textVerbergen: 'Ausmultiplizierten Term verbergen',
      });

      const rueckgaengigBtn = inhaltEl.querySelector('.rueckgaengig-btn');
      // Runde 16 (Nutzer-Rückmeldung "Rückgängig button"): pro Zeile ein
      // eigener Undo-Speicher – jede Zeile der Zeilenkette ist eine eigene
      // Bearbeitungsfläche mit eigener Undo-Historie.
      const undo = erzeugeUndoSpeicher({ onChange: (n) => { rueckgaengigBtn.disabled = n === 0; } });
      rueckgaengigBtn.addEventListener('click', () => undo.rueckgaengig());

      const andock = createAndockRasterUI(inhaltEl.querySelector('.andock-host'), {
        zeilenLabel: 'Faktor A',
        spaltenLabel: 'Faktor B',
        onChange: aktualisiereStatus,
        undo,
      });

      function aktualisiereStatus() {
        const raster = andock.getRaster();
        if (raster.zeilen.length === 0 || raster.spalten.length === 0) {
          statusEl.textContent = 'Noch keine Zeile/Spalte angedockt.';
          termToggleBtn.hidden = true;
          termAnzeigeEl.hidden = true;
          return;
        }
        const gesamt = raster.zeilen.length * raster.spalten.length;
        const gefuellt = raster.zellen.flat().filter((z) => z.gefuellt).length;
        if (andock.istVollstaendig()) {
          statusEl.textContent = '🎉 Vollständig ausmultipliziert! Alle Zellen sind richtig gefüllt.';
          termToggleBtn.hidden = false;
        } else {
          statusEl.textContent = `${gefuellt} von ${gesamt} Zellen richtig gefüllt.`;
          termToggleBtn.hidden = true;
          termAnzeigeEl.hidden = true;
        }
        termWertEl.textContent = formatiereKoeffizientenAlsTerm(koeffizientenAusRaster(raster));
      }

      createPalette(inhaltEl.querySelector('.achsen-palette'), {
        typen: ACHSEN_TYPEN,
        onDrop(typ, punkt) {
          if (andock.punktTrifftZone(andock.getSpaltenZoneEl(), punkt)) {
            andock.spalteHinzufuegen(typ);
          } else if (andock.punktTrifftZone(andock.getZeilenZoneEl(), punkt)) {
            andock.zeileHinzufuegen(typ);
          }
        },
      });

      createPalette(inhaltEl.querySelector('.mult-palette'), {
        typen: ALLE_TYPEN,
        onDrop(typ, punkt) {
          const zielEl = andock.findeZelleAnPunkt(punkt);
          if (zielEl) andock.versucheZelleFuellen(zielEl, typ);
        },
      });

      inhaltEl.querySelector('.mult-zuruecksetzen-btn').addEventListener('click', () => {
        andock.reset();
        // Kompletter Neustart – siehe andockRaster.js: "Rückgängig" soll
        // danach NICHT auf einen Zustand vor dem Zurücksetzen zeigen.
        undo.leeren();
      });

      if (vorherigerZustand) {
        for (const t of vorherigerZustand.zeilen) andock.zeileHinzufuegen(t);
        for (const t of vorherigerZustand.spalten) andock.spalteHinzufuegen(t);
        // Das Übernehmen der Vorzeile ist kein Nutzer-Schritt in DIESER
        // Zeile – "Rückgängig" soll hier erst bei der ersten eigenen
        // Aktion etwas zu tun haben.
        undo.leeren();
      }

      aktualisiereStatus();

      return {
        kopiereZustand: () => {
          const raster = andock.getRaster();
          return {
            zeilen: raster.zeilen.map((z) => ({ kind: z.kind, sign: z.sign })),
            spalten: raster.spalten.map((s) => ({ kind: s.kind, sign: s.sign })),
          };
        },
      };
    },
  });
}
