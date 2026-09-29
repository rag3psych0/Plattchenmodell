import { berechneMultiplikation, berechneDivision, berechneQuadratzahl, berechneWurzel } from '../../engine/rechnen.js';
import { createPlaettchenElement } from '../../shared/renderPlaettchen.js';
import { erzeugeFreieFlaeche } from '../../shared/freieFlaeche.js';
import { createAndockRasterUI } from '../../shared/andockRaster.js';

/**
 * Erklär-Ansicht für Multiplikation & Division.
 *
 * Bis Runde 20 standen Multiplikations- und Divisions-Beispiel gemeinsam,
 * gleichzeitig sichtbar, auf einer einzigen Seite. Runde 21 (Nutzer-
 * Rückmeldung Punkt 2: "Mache 4 Unterreiter: Multiplikation, Division,
 * Quadrat, Quadratwurzel") gliedert den Bereich stattdessen in VIER
 * gleichrangige Unterreiter (derselbe `ansicht-tabs`-Umschalter wie z. B.
 * bei modules/funktionen/parabeln.js) – jeder Unterreiter zeigt genau EIN
 * Beispiel. "Quadrat" und "Quadratwurzel" sind dabei fachlich bewusst
 * SPEZIALFÄLLE von Multiplikation/Division (siehe `berechneQuadratzahl`/
 * `berechneWurzel`, engine/rechnen.js: "a Gruppen von a Plättchen" bzw.
 * dessen Umkehrung) – Nutzer-Rückmeldung Punkt 3: "Füge unter Quadrat/
 * Wurzel eine Erklärung zum Thema 'eine Quadratzahl bilden' und eine zum
 * Thema 'Wurzel bilden' hinzu", jeweils mit nur EINEM Eingabefeld statt
 * zweier Faktoren.
 *
 * Multiplikation: a × b wird als "a Gruppen von b Plättchen" dargestellt –
 * bei negativem a werden diese Gruppen (nach Ergänzung von Nullpaaren)
 * WEGgenommen statt hinzugelegt, dieselbe Idee wie bei der Subtraktion.
 * Jedes Plättchen trägt dabei eine `.gruppe`-Nummer, damit die Tafel die
 * Gruppen einzeln untereinander darstellen kann (siehe
 * `renderGruppierteTafel`).
 *
 * Division zeigt sich als Umkehrung davon: es wird exakt dieselbe Gruppen-
 * Darstellung wie bei der passenden Multiplikation gezeigt (inkl. Gruppen-
 * Zuordnung), nur mit einer einleitenden und einer abschließenden Zeile in
 * Divisionsschreibweise. Nicht ohne Rest teilbare Aufgaben und Division
 * durch 0 werden bewusst nicht als Plättchen dargestellt, sondern als
 * eigener Fehler-Hinweis ohne Tafel-Inhalt gezeigt (`fehler`-Flag) –
 * dasselbe Muster gilt für eine nicht-ganzzahlige Quadratwurzel.
 *
 * Seit Runde 17 (Nutzer-Rückmeldung Punkt 1: "Mache eine zusätzliche
 * Erklärung mit dem Malkreuz, sodass ich später entscheiden kann welche
 * sinnvoller ist") steht bei Multiplikation UND Division zusätzlich zur
 * bisherigen Gruppen-Darstellung eine zweite, per Button einblendbare
 * Darstellung über das Malkreuz zur Verfügung (dieselbe Komponente wie in
 * "Klammern multiplizieren", siehe andockRaster.js) – für a × b als zwei
 * Faktor-Ketten aus a bzw. b Zahl-Plättchen, für a ÷ b als Umkehrung davon
 * (Faktor-Ketten aus dem Quotienten und dem Divisor). "Quadrat"/
 * "Quadratwurzel" bekommen bewusst KEINE eigene Malkreuz-Zusatzerklärung
 * (Scope-Entscheidung Runde 21) – sie sind reine Spezialfälle, die
 * Malkreuz-Darstellung bliebe dort schlicht ein Quadrat mit a=b, ohne
 * zusätzlichen Erkenntnisgewinn gegenüber der bereits vorhandenen
 * Multiplikations-Ansicht.
 */
export function mountMultiplikationDivisionErklaerung(container) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <div class="ansicht-tabs" role="tablist"></div>
    <div class="ansicht-inhalt"></div>
  `);

  const ANSICHTEN = [
    { id: 'multiplikation', titel: 'Multiplikation', mount: mountMultiplikationBeispiel },
    { id: 'division', titel: 'Division', mount: mountDivisionBeispiel },
    { id: 'quadrat', titel: 'Quadrat', mount: mountQuadratBeispiel },
    { id: 'quadratwurzel', titel: 'Quadratwurzel', mount: mountWurzelBeispiel },
  ];

  const tabsEl = container.querySelector('.ansicht-tabs');
  const inhaltEl = container.querySelector('.ansicht-inhalt');

  function zeigeAnsicht(ansicht) {
    tabsEl.querySelectorAll('.ansicht-tab').forEach((btn) => {
      const aktiv = btn.dataset.id === ansicht.id;
      btn.classList.toggle('ansicht-tab--aktiv', aktiv);
      btn.setAttribute('aria-selected', String(aktiv));
    });
    ansicht.mount(inhaltEl);
  }

  for (const ansicht of ANSICHTEN) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ansicht-tab';
    btn.dataset.id = ansicht.id;
    btn.setAttribute('role', 'tab');
    btn.textContent = ansicht.titel;
    btn.addEventListener('click', () => zeigeAnsicht(ansicht));
    tabsEl.appendChild(btn);
  }

  zeigeAnsicht(ANSICHTEN[0]);
}

function mountMultiplikationBeispiel(container) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Stelle eine Multiplikation mit ganzen Zahlen dar und gehe die Erklärung in deinem eigenen Tempo durch. Jede Gruppe wird als eigene Reihe dargestellt, damit man sie leicht erkennen kann.</p>
    <section class="rechen-beispiel" data-beispiel="mult">
      <h3 class="rechen-beispiel__titel">Beispiel: Multiplikation</h3>
    </section>
  `);
  mountEinzelBeispiel(container.querySelector('[data-beispiel="mult"]'), {
    idSuffix: 'mult',
    op: '×',
    standardA: 3,
    standardB: -4,
    berechne: berechneMultiplikation,
  });
}

function mountDivisionBeispiel(container) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Stelle eine Division mit ganzen Zahlen dar und gehe die Erklärung in deinem eigenen Tempo durch – als Umkehrung der Multiplikation.</p>
    <section class="rechen-beispiel" data-beispiel="div">
      <h3 class="rechen-beispiel__titel">Beispiel: Division</h3>
    </section>
  `);
  mountEinzelBeispiel(container.querySelector('[data-beispiel="div"]'), {
    idSuffix: 'div',
    op: '÷',
    standardA: 12,
    standardB: 4,
    berechne: berechneDivision,
  });
}

function mountQuadratBeispiel(container) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Stelle dar, wie eine Quadratzahl entsteht: a² bedeutet a × a, also a Gruppen von a Plättchen (wie bei der Multiplikation).</p>
    <section class="rechen-beispiel" data-beispiel="quadrat">
      <h3 class="rechen-beispiel__titel">Beispiel: eine Quadratzahl bilden</h3>
    </section>
  `);
  mountEinzelOperandBeispiel(container.querySelector('[data-beispiel="quadrat"]'), {
    idSuffix: 'quadrat',
    feldLabel: 'a',
    symbolVor: '',
    symbolNach: '²',
    standardA: 4,
    berechne: berechneQuadratzahl,
  });
}

function mountWurzelBeispiel(container) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Stelle dar, wie man eine Quadratwurzel zieht: gesucht ist die Zahl a mit a² = n – die Umkehrung des Quadrierens.</p>
    <section class="rechen-beispiel" data-beispiel="wurzel">
      <h3 class="rechen-beispiel__titel">Beispiel: eine Wurzel bilden</h3>
    </section>
  `);
  mountEinzelOperandBeispiel(container.querySelector('[data-beispiel="wurzel"]'), {
    idSuffix: 'wurzel',
    feldLabel: 'n',
    symbolVor: '√',
    symbolNach: '',
    standardA: 16,
    berechne: berechneWurzel,
  });
}

/**
 * Baut EIN vollständiges, eigenständiges Rechenbeispiel (Formular + Tafel +
 * Protokoll + "Nächster Schritt"-Button) innerhalb von `sectionEl` auf. Wird
 * zweimal aufgerufen – einmal für Multiplikation, einmal für Division –
 * jeweils mit eigenem `idSuffix`, damit sich die DOM-IDs der beiden
 * gleichzeitig existierenden Beispiele nicht überschneiden.
 *
 * `op` ist rein informativ (fixes Rechenzeichen zwischen den Feldern statt
 * eines Dropdowns), `berechne` ist die passende Engine-Funktion
 * (`berechneMultiplikation` bzw. `berechneDivision`), die mit (a, b)
 * aufgerufen wird.
 */
function mountEinzelBeispiel(sectionEl, { idSuffix, op, standardA, standardB, berechne }) {
  sectionEl.insertAdjacentHTML('beforeend', `
    <form class="rechnung-form" novalidate>
      <div class="feld"><label for="feld-a-${idSuffix}">a</label><input id="feld-a-${idSuffix}" type="number" name="a" value="${standardA}" step="1" required></div>
      <span class="rechnung-operator" aria-hidden="true">${op}</span>
      <div class="feld"><label for="feld-b-${idSuffix}">b</label><input id="feld-b-${idSuffix}" type="number" name="b" value="${standardB}" step="1" required></div>
      <button type="submit">Neu darstellen</button>
    </form>
    <div class="arbeitsflaeche">
      <div class="tafel-wrapper">
        <h4>Plättchen-Tafel</h4>
        <div class="plaettchen-tafel plaettchen-tafel--gruppiert" aria-live="polite"></div>
        <button type="button" class="weiter-btn">Nächster Schritt →</button>
        <button type="button" class="frei-weiterarbeiten-btn" hidden>Frei ab hier weiterarbeiten</button>
      </div>
      <div class="protokoll-wrapper">
        <h4>Rechenweg</h4>
        <ol class="schritte-log"></ol>
      </div>
    </div>
    <div class="frei-weiterarbeiten-host" hidden></div>
    <button type="button" class="malkreuz-toggle-btn malkreuz-erklaerung-toggle-btn" hidden>Zusätzliche Erklärung mit dem Malkreuz anzeigen</button>
    <div class="malkreuz-host malkreuz-erklaerung-host" hidden></div>
  `);

  const form = sectionEl.querySelector('.rechnung-form');
  const tafelEl = sectionEl.querySelector('.plaettchen-tafel');
  const logEl = sectionEl.querySelector('.schritte-log');
  const weiterBtn = sectionEl.querySelector('.weiter-btn');
  const freiBtn = sectionEl.querySelector('.frei-weiterarbeiten-btn');
  const freiHostEl = sectionEl.querySelector('.frei-weiterarbeiten-host');
  const malkreuzErklaerungToggleBtn = sectionEl.querySelector('.malkreuz-erklaerung-toggle-btn');
  const malkreuzErklaerungHostEl = sectionEl.querySelector('.malkreuz-erklaerung-host');

  let aktuelleEingabe = null; // { a, b } der zuletzt erfolgreich dargestellten Rechnung

  /** Höchste je Achse noch sinnvoll darstellbare Kettenlänge – bei größeren Zahlen würde das Malkreuz unübersichtlich. */
  const MALKREUZ_MAX_ACHSE = 12;

  function baueMalkreuzErklaerung() {
    malkreuzErklaerungHostEl.innerHTML = '';
    if (!aktuelleEingabe) return;
    const { a, b } = aktuelleEingabe;

    let faktorA;
    let faktorB;
    let hinweis = null;
    if (idSuffix === 'mult') {
      if (a === 0 || b === 0) {
        hinweis = 'Bei 0 gibt es nichts darzustellen.';
      } else {
        faktorA = { sign: a < 0 ? -1 : 1, anzahl: Math.abs(a) };
        faktorB = { sign: b < 0 ? -1 : 1, anzahl: Math.abs(b) };
      }
    } else if (b === 0) {
      hinweis = 'Division durch 0 ist nicht möglich.';
    } else if (a % b !== 0) {
      hinweis = `${a} lässt sich nicht ohne Rest durch ${b} teilen.`;
    } else {
      const quotient = a / b;
      faktorA = { sign: quotient < 0 ? -1 : 1, anzahl: Math.abs(quotient) };
      faktorB = { sign: b < 0 ? -1 : 1, anzahl: Math.abs(b) };
    }

    if (!hinweis && (faktorA.anzahl > MALKREUZ_MAX_ACHSE || faktorB.anzahl > MALKREUZ_MAX_ACHSE)) {
      hinweis = 'Für diese Zahlen wäre das Malkreuz zu groß, um übersichtlich zu bleiben – wähle kleinere Werte.';
    }

    if (hinweis) {
      const p = document.createElement('p');
      p.className = 'tafel-leer';
      p.textContent = hinweis;
      malkreuzErklaerungHostEl.appendChild(p);
      return;
    }

    const andock = createAndockRasterUI(malkreuzErklaerungHostEl, {
      zeilenLabel: idSuffix === 'mult' ? 'Faktor a' : 'Quotient',
      spaltenLabel: idSuffix === 'mult' ? 'Faktor b' : 'Divisor',
    });
    for (let i = 0; i < faktorA.anzahl; i += 1) andock.zeileHinzufuegen({ kind: 'zahl', sign: faktorA.sign });
    for (let j = 0; j < faktorB.anzahl; j += 1) andock.spalteHinzufuegen({ kind: 'zahl', sign: faktorB.sign });
    // Alle Produkt-Zellen automatisch korrekt befüllen (keine Übung, reine
    // Veranschaulichung – siehe Datei-Kommentar oben).
    const raster = andock.getRaster();
    for (const zielEl of andock.getRasterEl().querySelectorAll('.mult-zelle--leer')) {
      const i = Number(zielEl.dataset.zeile);
      const j = Number(zielEl.dataset.spalte);
      const zelle = raster.zellen[i][j];
      andock.versucheZelleFuellen(zielEl, { kind: zelle.erwarteteArt, sign: zelle.erwartetesVorzeichen });
    }
  }

  malkreuzErklaerungToggleBtn.addEventListener('click', () => {
    const sichtbar = malkreuzErklaerungHostEl.hidden;
    if (sichtbar) baueMalkreuzErklaerung();
    malkreuzErklaerungHostEl.hidden = !sichtbar;
    malkreuzErklaerungToggleBtn.textContent = sichtbar
      ? 'Zusätzliche Erklärung mit dem Malkreuz verbergen'
      : 'Zusätzliche Erklärung mit dem Malkreuz anzeigen';
    malkreuzErklaerungToggleBtn.setAttribute('aria-expanded', String(sichtbar));
  });

  let frames = [];
  let index = 0;
  let freieKetteErstellt = false;

  function setzeFreieFortsetzungZurueck() {
    freieKetteErstellt = false;
    freiHostEl.hidden = true;
    freiHostEl.innerHTML = '';
  }

  freiBtn.addEventListener('click', () => {
    if (freieKetteErstellt) return;
    freieKetteErstellt = true;
    const startTiles = frames[index].tiles.map((t) => ({ kind: t.kind, sign: t.sign }));
    freiHostEl.hidden = false;
    erzeugeFreieFlaeche(freiHostEl, {
      flaechenTitel: 'Freie Fortsetzung (Kopie der Tafel)',
      initialTiles: startTiles,
    });
  });

  function zeigeFrameBis(i) {
    logEl.innerHTML = '';
    for (let j = 0; j <= i; j += 1) {
      if (frames[j].logLabel) appendLogEntry(logEl, frames[j].logLabel, frames[j].logIsResult);
    }
    const frame = frames[i];
    renderGruppierteTafel(tafelEl, frame.tiles, {
      highlightIds: frame.highlightIds,
      highlightClass: frame.highlightClass,
      emptyMessage: frame.emptyMessage,
    });
    freiBtn.hidden = false;
  }

  function aktualisiereWeiterButton() {
    const fertig = index >= frames.length - 1;
    weiterBtn.disabled = fertig;
    weiterBtn.textContent = fertig ? 'Fertig ✓' : 'Nächster Schritt →';
  }

  function starte(a, b) {
    setzeFreieFortsetzungZurueck();
    const { steps } = berechne(a, b);
    frames = baueFrames(steps);
    index = 0;
    zeigeFrameBis(0);
    aktualisiereWeiterButton();
    aktuelleEingabe = { a, b };
    malkreuzErklaerungToggleBtn.hidden = false;
    if (!malkreuzErklaerungHostEl.hidden) baueMalkreuzErklaerung();
  }

  /** Anfangszustand: leere Tafel, kein Rechenweg – erst nach "Neu darstellen" wird gerechnet. */
  function zeigeLeer() {
    setzeFreieFortsetzungZurueck();
    frames = [];
    index = 0;
    logEl.innerHTML = '';
    tafelEl.innerHTML = '';
    const hinweis = document.createElement('p');
    hinweis.className = 'tafel-leer';
    hinweis.textContent = 'Noch keine Rechnung dargestellt – Zahlen eingeben und auf "Neu darstellen" klicken.';
    tafelEl.appendChild(hinweis);
    weiterBtn.disabled = true;
    weiterBtn.textContent = 'Nächster Schritt →';
    freiBtn.hidden = true;
    aktuelleEingabe = null;
    malkreuzErklaerungToggleBtn.hidden = true;
    malkreuzErklaerungToggleBtn.textContent = 'Zusätzliche Erklärung mit dem Malkreuz anzeigen';
    malkreuzErklaerungToggleBtn.setAttribute('aria-expanded', 'false');
    malkreuzErklaerungHostEl.hidden = true;
    malkreuzErklaerungHostEl.innerHTML = '';
  }

  weiterBtn.addEventListener('click', () => {
    if (index >= frames.length - 1) return;
    index += 1;
    zeigeFrameBis(index);
    aktualisiereWeiterButton();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const a = Number(data.get('a'));
    const b = Number(data.get('b'));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    starte(a, b);
  });

  zeigeLeer();
}

/**
 * Baut EIN vollständiges, eigenständiges Rechenbeispiel mit nur EINEM
 * Eingabefeld auf (statt zweier Faktoren wie bei `mountEinzelBeispiel`) –
 * für "Quadrat" (a → a²) und "Quadratwurzel" (n → √n), Runde 21 (Nutzer-
 * Rückmeldung Punkt 2/3). Spiegelt bewusst dieselbe Frame-/Protokoll-/
 * "Nächster Schritt"-/"Frei ab hier weiterarbeiten"-Logik wie
 * `mountEinzelBeispiel` (dieselben `renderGruppierteTafel`/`baueFrames`/
 * `appendLogEntry`-Hilfsfunktionen), nur ohne den zweiten Faktor und ohne
 * die zusätzliche Malkreuz-Erklärung (siehe Datei-Kommentar oben, warum
 * diese hier bewusst fehlt). `symbolVor`/`symbolNach` platzieren das
 * Operator-Symbol vor bzw. nach dem Eingabefeld ("√" vor dem Feld bei der
 * Wurzel, "²" nach dem Feld beim Quadrat).
 */
function mountEinzelOperandBeispiel(sectionEl, { idSuffix, feldLabel, symbolVor, symbolNach, standardA, berechne }) {
  sectionEl.insertAdjacentHTML('beforeend', `
    <form class="rechnung-form" novalidate>
      <span class="rechnung-operator" aria-hidden="true">${symbolVor}</span>
      <div class="feld"><label for="feld-a-${idSuffix}">${feldLabel}</label><input id="feld-a-${idSuffix}" type="number" name="a" value="${standardA}" step="1" required></div>
      <span class="rechnung-operator" aria-hidden="true">${symbolNach}</span>
      <button type="submit">Neu darstellen</button>
    </form>
    <div class="arbeitsflaeche">
      <div class="tafel-wrapper">
        <h4>Plättchen-Tafel</h4>
        <div class="plaettchen-tafel plaettchen-tafel--gruppiert" aria-live="polite"></div>
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

  const form = sectionEl.querySelector('.rechnung-form');
  const tafelEl = sectionEl.querySelector('.plaettchen-tafel');
  const logEl = sectionEl.querySelector('.schritte-log');
  const weiterBtn = sectionEl.querySelector('.weiter-btn');
  const freiBtn = sectionEl.querySelector('.frei-weiterarbeiten-btn');
  const freiHostEl = sectionEl.querySelector('.frei-weiterarbeiten-host');

  let frames = [];
  let index = 0;
  let freieKetteErstellt = false;

  function setzeFreieFortsetzungZurueck() {
    freieKetteErstellt = false;
    freiHostEl.hidden = true;
    freiHostEl.innerHTML = '';
  }

  freiBtn.addEventListener('click', () => {
    if (freieKetteErstellt) return;
    freieKetteErstellt = true;
    const startTiles = frames[index].tiles.map((t) => ({ kind: t.kind, sign: t.sign }));
    freiHostEl.hidden = false;
    erzeugeFreieFlaeche(freiHostEl, {
      flaechenTitel: 'Freie Fortsetzung (Kopie der Tafel)',
      initialTiles: startTiles,
    });
  });

  function zeigeFrameBis(i) {
    logEl.innerHTML = '';
    for (let j = 0; j <= i; j += 1) {
      if (frames[j].logLabel) appendLogEntry(logEl, frames[j].logLabel, frames[j].logIsResult);
    }
    const frame = frames[i];
    renderGruppierteTafel(tafelEl, frame.tiles, {
      highlightIds: frame.highlightIds,
      highlightClass: frame.highlightClass,
      emptyMessage: frame.emptyMessage,
    });
    freiBtn.hidden = false;
  }

  function aktualisiereWeiterButton() {
    const fertig = index >= frames.length - 1;
    weiterBtn.disabled = fertig;
    weiterBtn.textContent = fertig ? 'Fertig ✓' : 'Nächster Schritt →';
  }

  function starte(a) {
    setzeFreieFortsetzungZurueck();
    const { steps } = berechne(a);
    frames = baueFrames(steps);
    index = 0;
    zeigeFrameBis(0);
    aktualisiereWeiterButton();
  }

  /** Anfangszustand: leere Tafel, kein Rechenweg – erst nach "Neu darstellen" wird gerechnet. */
  function zeigeLeer() {
    setzeFreieFortsetzungZurueck();
    frames = [];
    index = 0;
    logEl.innerHTML = '';
    tafelEl.innerHTML = '';
    const hinweis = document.createElement('p');
    hinweis.className = 'tafel-leer';
    hinweis.textContent = 'Noch keine Rechnung dargestellt – Zahl eingeben und auf "Neu darstellen" klicken.';
    tafelEl.appendChild(hinweis);
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

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const a = Number(data.get('a'));
    if (!Number.isFinite(a)) return;
    starte(a);
  });

  zeigeLeer();
}

/**
 * Übersetzt die Rechenschritte der Engine in einzeln anzeigbare Frames.
 * Ein "zero-pairs"-Schritt (Nullpaar-Ergänzung vor dem Wegnehmen einer
 * Gruppe) wird – anders als bei der Addition – NICHT in zwei Frames
 * aufgeteilt, weil hier nichts aufgehoben, sondern lediglich vorbereitend
 * ergänzt wird (siehe `berechneMultiplikation`). Ein "error"-Schritt
 * (Division durch 0 / nicht ohne Rest teilbar) bekommt eine eigene
 * Hinweis-Meldung auf der sonst leeren Tafel statt der generischen
 * "Ergebnis: 0"-Meldung.
 */
function baueFrames(steps) {
  const frames = [];
  for (const step of steps) {
    frames.push({
      tiles: step.snapshot,
      logLabel: step.label,
      logIsResult: step.type === 'result',
      emptyMessage: step.type === 'error' ? 'Keine Darstellung möglich.' : undefined,
    });
  }
  return frames;
}

/**
 * Wie `renderTafel` bei Addition/Subtraktion, stellt aber jede Gruppe
 * (`tile.gruppe`) als eigene Reihe dar, statt alle Plättchen in einem
 * einzigen Fluss zu zeigen – so ist "a Gruppen von b Plättchen" auf einen
 * Blick erkennbar. Plättchen ohne Gruppen-Nummer (sollte hier nicht
 * vorkommen, ist aber ein sicherer Fallback) landen gemeinsam in einer
 * letzten Reihe.
 */
function renderGruppierteTafel(container, tiles, opts = {}) {
  container.innerHTML = '';
  if (tiles.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'tafel-leer';
    empty.textContent = opts.emptyMessage ?? 'Keine Plättchen übrig – Ergebnis: 0.';
    container.appendChild(empty);
    return;
  }

  const gruppen = new Map();
  for (const tile of tiles) {
    const key = tile.gruppe ?? 0;
    if (!gruppen.has(key)) gruppen.set(key, []);
    gruppen.get(key).push(tile);
  }
  const sortierteSchluessel = [...gruppen.keys()].sort((x, y) => x - y);

  for (const key of sortierteSchluessel) {
    const gruppeEl = document.createElement('div');
    gruppeEl.className = 'plaettchen-gruppe';
    for (const tile of gruppen.get(key)) {
      const el = createPlaettchenElement(tile.kind, tile.sign, { id: tile.id });
      if (opts.highlightIds?.includes(tile.id)) el.classList.add(opts.highlightClass);
      gruppeEl.appendChild(el);
    }
    container.appendChild(gruppeEl);
  }
}

function appendLogEntry(logEl, text, isResult = false) {
  const li = document.createElement('li');
  li.textContent = text;
  if (isResult) li.classList.add('schritte-log__ergebnis');
  logEl.appendChild(li);
}
