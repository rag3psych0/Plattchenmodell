import { berechneQuadratischeErgaenzung } from '../../engine/rechnen.js';
import { createPlaettchenElement } from '../../shared/renderPlaettchen.js';
import { TILE_UNIT, TILE_LONG } from '../../shared/theme.js';
import { erzeugeFreieFlaeche } from '../../shared/freieFlaeche.js';
import { createAndockRasterUI } from '../../shared/andockRaster.js';

/**
 * Erklär-Ansicht für die quadratische Ergänzung: zeigt geometrisch, wie
 * x² + px durch Hinzufügen von (p/2)² zu einem vollständigen Quadrat
 * (x + p/2)² ergänzt wird (siehe `berechneQuadratischeErgaenzung`,
 * engine/rechnen.js). Folgt demselben Formular-/Frame-/"Nächster
 * Schritt"-Muster wie die anderen Erklär-Ansichten (Tafel startet leer).
 *
 * Anders als bei Addition/Subtraktion/Multiplikation/Division reicht ein
 * einfacher Fluss aus Plättchen nicht aus, um die charakteristische
 * Quadrat-Form zu zeigen: die ersten zwei Schritte (x²-Plättchen legen,
 * dann die p x-Plättchen noch unsortiert dazulegen) werden deshalb flach
 * dargestellt (`renderFlachTafel`), ab dem Aufteilen in zwei Hälften
 * übernimmt `renderQuadratTafel` eine exakte, absolut positionierte
 * Geometrie anhand des `.bereich`-Felds jedes Plättchens
 * ('quadrat'/'seite-a'/'seite-b'/'ecke').
 *
 * Seit Runde 15 ("Frei ab hier weiterarbeiten") lässt sich ab jedem Schritt
 * eine gewöhnliche, vollwertige Bearbeitungsfläche (shared/freieFlaeche.js)
 * anhängen, vorbefüllt mit den Plättchen (ohne die Quadrat-spezifische
 * `.bereich`-Information, die dort keine Bedeutung hat) – die geführte
 * Quadrat-Darstellung selbst bleibt davon unberührt und weiterhin nur-lesend.
 *
 * Seit Runde 20 (Nutzer-Rückmeldung Punkt 3) wird statt eines einzelnen `p`
 * eine vollständige Startgleichung `x² + p·x + c` eingegeben (siehe
 * `berechneQuadratischeErgaenzung`, engine/rechnen.js). Die geometrische
 * Konstruktion (Quadrat, zwei Seiten, Ecke) hängt weiterhin nur von `p` ab;
 * weicht `c` von der für die Ecke tatsächlich benötigten Konstante `(p/2)²`
 * ab, entsteht ein positiver ODER negativer "Rest" (`.bereich === 'rest'`),
 * der als eigene Plättchengruppe NEBEN dem fertigen Quadrat erscheint (siehe
 * `renderQuadratTafel` unten) – z. B. x² + 4x + 10 → (x+2)² + 6.
 *
 * Seit Runde 18 (Nutzer-Rückmeldung Punkt 2) steht nach einer erfolgreichen
 * Darstellung zusätzlich eine per Button einblendbare Malkreuz-Ansicht zur
 * Verfügung (dieselbe Komponente wie bei "Multiplikation von Klammern/Das
 * Malkreuz" und der Malkreuz-Erklärung bei Multiplikation & Division, siehe
 * andockRaster.js): x² + px + (p/2)² lässt sich nämlich exakt als Produkt
 * zweier gleicher linearer Klammern (x + p/2)(x + p/2) lesen – Zeile UND
 * Spalte bestehen also aus denselben Plättchen (1 x-Plättchen, gefolgt von
 * |p/2| Zahl-Plättchen mit dem Vorzeichen von p/2). Anders als beim
 * bisherigen `renderQuadratTafel` (das zwar geometrisch bereits dieselbe
 * Fläche zeichnet, aber ohne Kreuzlinien/×-Zeichen/Achsenbeschriftung)
 * macht das Malkreuz die beiden Faktoren "x + p/2" explizit an den Achsen
 * lesbar. Wie bei der Malkreuz-Erklärung von Multiplikation & Division wird
 * hier automatisch (nicht durch Ziehen) korrekt befüllt – reine
 * Veranschaulichung, keine eigene Übung.
 */
export function mountQuadratischeErgaenzungErklaerung(container) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Gib eine Startgleichung x² + p·x + c ein und lass dir zeigen, wie sie zu einem vollständigen Quadrat (x + p/2)² ergänzt wird. Wähle eine gerade Zahl für p, damit sich die Hälfte als ganze Plättchen darstellen lässt – c darf beliebig sein; passt es nicht genau zur Ecke, bleibt ein Rest neben dem Quadrat übrig.</p>
    <form class="rechnung-form" novalidate>
      <span class="qe-form__symbol">x² +</span>
      <div class="feld"><label for="feld-p-qe">p</label><input id="feld-p-qe" type="number" name="p" value="6" step="2" required></div>
      <span class="qe-form__symbol">x +</span>
      <div class="feld"><label for="feld-c-qe">c</label><input id="feld-c-qe" type="number" name="c" value="9" step="1" required></div>
      <button type="submit">Neu darstellen</button>
    </form>
    <div class="arbeitsflaeche">
      <div class="tafel-wrapper">
        <h3>Plättchen-Tafel</h3>
        <div class="plaettchen-tafel" aria-live="polite"></div>
        <button type="button" class="weiter-btn">Nächster Schritt →</button>
        <button type="button" class="frei-weiterarbeiten-btn" hidden>Frei ab hier weiterarbeiten</button>
      </div>
      <div class="protokoll-wrapper">
        <h3>Rechenweg</h3>
        <ol class="schritte-log"></ol>
      </div>
    </div>
    <div class="frei-weiterarbeiten-host" hidden></div>
    <button type="button" class="malkreuz-toggle-btn malkreuz-erklaerung-toggle-btn" hidden>Zusätzliche Erklärung mit dem Malkreuz anzeigen</button>
    <div class="malkreuz-host malkreuz-erklaerung-host" hidden></div>
  `);

  const form = container.querySelector('.rechnung-form');
  const tafelEl = container.querySelector('.plaettchen-tafel');
  const logEl = container.querySelector('.schritte-log');
  const weiterBtn = container.querySelector('.weiter-btn');
  const freiBtn = container.querySelector('.frei-weiterarbeiten-btn');
  const freiHostEl = container.querySelector('.frei-weiterarbeiten-host');
  const malkreuzErklaerungToggleBtn = container.querySelector('.malkreuz-erklaerung-toggle-btn');
  const malkreuzErklaerungHostEl = container.querySelector('.malkreuz-erklaerung-host');

  /** Höchste je Achse noch sinnvoll darstellbare Kettenlänge (1 x-Plättchen + |p/2| Zahl-Plättchen) – bei größeren Werten würde das Malkreuz unübersichtlich. */
  const MALKREUZ_MAX_ACHSE = 12;

  let aktuellesP = null; // zuletzt erfolgreich dargestelltes p (null, solange kein/ein fehlerhaftes p vorliegt)

  function baueMalkreuzErklaerung() {
    malkreuzErklaerungHostEl.innerHTML = '';
    if (aktuellesP === null) return;
    const half = aktuellesP / 2;
    const n = Math.abs(half);
    const signHalf = half < 0 ? -1 : 1;

    if (n > MALKREUZ_MAX_ACHSE) {
      const p = document.createElement('p');
      p.className = 'tafel-leer';
      p.textContent = 'Für dieses p wäre das Malkreuz zu groß, um übersichtlich zu bleiben – wähle ein kleineres p.';
      malkreuzErklaerungHostEl.appendChild(p);
      return;
    }

    const faktorTiles = [{ kind: 'x', sign: 1 }];
    for (let i = 0; i < n; i += 1) faktorTiles.push({ kind: 'zahl', sign: signHalf });
    const faktorLabel = `x ${half >= 0 ? '+' : '−'} ${n}`;

    const andock = createAndockRasterUI(malkreuzErklaerungHostEl, {
      zeilenLabel: faktorLabel,
      spaltenLabel: faktorLabel,
    });
    for (const t of faktorTiles) andock.zeileHinzufuegen(t);
    for (const t of faktorTiles) andock.spalteHinzufuegen(t);
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
    // .bereich (Quadrat-Geometrie) ist nur für die geführte Darstellung
    // relevant – die freie Fortsetzung übernimmt bewusst nur kind/sign,
    // da dort (wie überall sonst) automatisch in Spalten sortiert wird.
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
    tafelEl.classList.toggle('plaettchen-tafel--quadrat', frame.layout === 'quadrat');
    if (frame.layout === 'quadrat') {
      renderQuadratTafel(tafelEl, frame.tiles, { emptyMessage: frame.emptyMessage, zeigeEckePlatzhalter: frame.zeigeEckePlatzhalter });
    } else {
      renderFlachTafel(tafelEl, frame.tiles, { emptyMessage: frame.emptyMessage });
    }
    freiBtn.hidden = false;
  }

  function aktualisiereWeiterButton() {
    const fertig = index >= frames.length - 1;
    weiterBtn.disabled = fertig;
    weiterBtn.textContent = fertig ? 'Fertig ✓' : 'Nächster Schritt →';
  }

  function starte(p, c) {
    setzeFreieFortsetzungZurueck();
    const { steps, fehler } = berechneQuadratischeErgaenzung(p, c);
    frames = baueFrames(steps);
    index = 0;
    zeigeFrameBis(0);
    aktualisiereWeiterButton();

    aktuellesP = fehler === null ? p : null;
    malkreuzErklaerungToggleBtn.hidden = aktuellesP === null;
    if (aktuellesP === null) {
      malkreuzErklaerungHostEl.hidden = true;
      malkreuzErklaerungHostEl.innerHTML = '';
      malkreuzErklaerungToggleBtn.textContent = 'Zusätzliche Erklärung mit dem Malkreuz anzeigen';
      malkreuzErklaerungToggleBtn.setAttribute('aria-expanded', 'false');
    } else if (!malkreuzErklaerungHostEl.hidden) {
      baueMalkreuzErklaerung();
    }
  }

  /** Anfangszustand: leere Tafel, kein Rechenweg – erst nach "Neu darstellen" wird gerechnet. */
  function zeigeLeer() {
    setzeFreieFortsetzungZurueck();
    frames = [];
    index = 0;
    logEl.innerHTML = '';
    tafelEl.classList.remove('plaettchen-tafel--quadrat');
    tafelEl.style.width = '';
    tafelEl.style.height = '';
    tafelEl.innerHTML = '';
    const hinweis = document.createElement('p');
    hinweis.className = 'tafel-leer';
    hinweis.textContent = 'Noch keine Rechnung dargestellt – p und c eingeben und auf "Neu darstellen" klicken.';
    tafelEl.appendChild(hinweis);
    weiterBtn.disabled = true;
    weiterBtn.textContent = 'Nächster Schritt →';
    freiBtn.hidden = true;
    aktuellesP = null;
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
    const p = Number(data.get('p'));
    const c = Number(data.get('c'));
    if (!Number.isFinite(p) || !Number.isFinite(c)) return;
    starte(p, c);
  });

  zeigeLeer();
}

/**
 * Übersetzt die Rechenschritte der Engine in einzeln anzeigbare Frames.
 * Die ersten beiden Schritte (x²-Plättchen legen, p x-Plättchen unsortiert
 * dazulegen) werden flach dargestellt; ab dem Aufteilen in zwei Hälften
 * ("split") übernimmt die Quadrat-Geometrie. Ein "error"-Schritt (p = 0
 * oder p ungerade) zeigt statt der generischen "Ergebnis: 0"-Meldung den
 * Hinweis "Keine Darstellung möglich."
 */
function baueFrames(steps) {
  const frames = [];
  for (const step of steps) {
    frames.push({
      tiles: step.snapshot,
      logLabel: step.label,
      logIsResult: step.type === 'result',
      emptyMessage: step.type === 'error' ? 'Keine Darstellung möglich.' : undefined,
      layout: (step.type === 'start' || step.type === 'add-linear') ? 'flach' : 'quadrat',
      zeigeEckePlatzhalter: step.zeigeEckePlatzhalter === true,
    });
  }
  return frames;
}

function renderFlachTafel(container, tiles, opts = {}) {
  container.style.width = '';
  container.style.height = '';
  container.innerHTML = '';
  if (tiles.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'tafel-leer';
    empty.textContent = opts.emptyMessage ?? 'Keine Plättchen übrig.';
    container.appendChild(empty);
    return;
  }
  for (const tile of tiles) {
    container.appendChild(createPlaettchenElement(tile.kind, tile.sign, { id: tile.id }));
  }
}

/** Innerer Abstand der Quadrat-Zeichnung zum Tafel-Rand (in px). */
const PAD = 16;
/** Abstand zwischen den einzelnen Rest-Plättchen (Runde 20, siehe unten). */
const REST_GAP = 6;
/** Platz oberhalb der Rest-Spalte für die Beschriftung "Rest". */
const REST_LABEL_HOEHE = 22;

/**
 * Zeichnet die charakteristische "Quadrat mit angelegten Streifen und
 * Ecke"-Figur der quadratischen Ergänzung, absolut positioniert anhand des
 * `.bereich`-Felds jedes Plättchens:
 * - 'quadrat' (das x²-Plättchen) oben links.
 * - 'seite-a' (Hälfte der x-Plättchen, liegend) darunter gestapelt –
 *   bildet zusammen mit dem Quadrat eine Fläche x·n.
 * - 'seite-b' (die andere Hälfte, hochkant über `vertical`) rechts daneben
 *   aufgereiht – bildet eine Fläche n·x.
 * - 'ecke' (n×n Eins-Plättchen) füllt die verbleibende Ecke (Fläche n²).
 * Zusammen ergibt sich ein Quadrat der Seitenlänge (x + n).
 *
 * Seit Runde 20 (Nutzer-Rückmeldung Punkt 3) kann zusätzlich eine 'rest'-
 * Gruppe vorkommen (positiv ODER negativ, siehe `berechneQuadratischeErgaenzung`,
 * engine/rechnen.js): Sie ist AUSDRÜCKLICH NICHT Teil des Quadrats, sondern
 * wird als eigene, senkrechte Plättchenspalte NEBEN dem fertigen Quadrat
 * dargestellt (Nutzer-Vorgabe: "dieser [Rest] soll dann neben dem Quadrat
 * dargestellt werden").
 */
function renderQuadratTafel(container, tiles, opts = {}) {
  container.innerHTML = '';
  if (tiles.length === 0) {
    container.style.width = '';
    container.style.height = '';
    const empty = document.createElement('p');
    empty.className = 'tafel-leer';
    empty.textContent = opts.emptyMessage ?? 'Keine Plättchen übrig.';
    container.appendChild(empty);
    return;
  }

  const quadrat = tiles.find((t) => t.bereich === 'quadrat');
  const seiteA = tiles.filter((t) => t.bereich === 'seite-a');
  const seiteB = tiles.filter((t) => t.bereich === 'seite-b');
  const ecke = tiles.filter((t) => t.bereich === 'ecke');
  const rest = tiles.filter((t) => t.bereich === 'rest');
  const n = Math.max(seiteA.length, seiteB.length, Math.round(Math.sqrt(ecke.length)) || 0);

  const groesse = PAD * 2 + TILE_LONG + n * TILE_UNIT;
  const restBreite = rest.length > 0 ? PAD + TILE_UNIT : 0;
  const restHoehe = REST_LABEL_HOEHE + rest.length * TILE_UNIT + Math.max(0, rest.length - 1) * REST_GAP;
  container.style.width = `${groesse + restBreite}px`;
  container.style.height = `${Math.max(groesse, PAD + restHoehe)}px`;

  function platziere(el, left, top) {
    el.style.position = 'absolute';
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    container.appendChild(el);
  }

  if (quadrat) {
    platziere(createPlaettchenElement(quadrat.kind, quadrat.sign, { id: quadrat.id }), PAD, PAD);
  }
  seiteA.forEach((tile, i) => {
    platziere(createPlaettchenElement(tile.kind, tile.sign, { id: tile.id }), PAD, PAD + TILE_LONG + i * TILE_UNIT);
  });
  seiteB.forEach((tile, i) => {
    platziere(createPlaettchenElement(tile.kind, tile.sign, { id: tile.id, vertical: true }), PAD + TILE_LONG + i * TILE_UNIT, PAD);
  });
  ecke.forEach((tile, j) => {
    const row = Math.floor(j / n);
    const col = j % n;
    platziere(createPlaettchenElement(tile.kind, tile.sign, { id: tile.id }), PAD + TILE_LONG + col * TILE_UNIT, PAD + TILE_LONG + row * TILE_UNIT);
  });

  if (opts.zeigeEckePlatzhalter && ecke.length === 0 && n > 0) {
    const platzhalter = document.createElement('div');
    platzhalter.className = 'ecke-platzhalter';
    platzhalter.style.left = `${PAD + TILE_LONG}px`;
    platzhalter.style.top = `${PAD + TILE_LONG}px`;
    platzhalter.style.width = `${n * TILE_UNIT}px`;
    platzhalter.style.height = `${n * TILE_UNIT}px`;
    platzhalter.textContent = `${n}×${n}`;
    container.appendChild(platzhalter);
  }

  if (rest.length > 0) {
    const restLeft = groesse + PAD;
    const labelEl = document.createElement('span');
    labelEl.className = 'quadrat-rest__label';
    labelEl.textContent = 'Rest';
    labelEl.style.position = 'absolute';
    labelEl.style.left = `${restLeft}px`;
    labelEl.style.top = `${PAD}px`;
    container.appendChild(labelEl);
    rest.forEach((tile, i) => {
      platziere(
        createPlaettchenElement(tile.kind, tile.sign, { id: tile.id }),
        restLeft,
        PAD + REST_LABEL_HOEHE + i * (TILE_UNIT + REST_GAP),
      );
    });
  }
}

function appendLogEntry(logEl, text, isResult = false) {
  const li = document.createElement('li');
  li.textContent = text;
  if (isResult) li.classList.add('schritte-log__ergebnis');
  logEl.appendChild(li);
}
