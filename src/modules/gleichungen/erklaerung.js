import { erzeugeBereichsTabs } from '../../shared/bereichsTabs.js';
import { erzeugeGleichungsKette } from '../../shared/gleichungsKette.js';
import { createPlaettchenElement } from '../../shared/renderPlaettchen.js';
import { ALLE_TYPEN } from '../../shared/palette.js';
import { planeGleichungsLoesung } from '../../engine/gleichungen.js';

// Für "Linear" fehlt x² in der Auswahl der freien Fortsetzung (analog
// modules/gleichungen/module.js) – "Quadratisch" bekommt alle sechs Typen.
const TYPEN_OHNE_QUADRAT = ALLE_TYPEN.slice(2);

/**
 * Bereich "Gleichungen" innerhalb von "Erklärungen" (Runde 19, Nutzer-
 * Vorgabe: "Baue auch unter Erklärungen einen Reiter Gleichungen und
 * Unterpunkte Linear und Quadratisch und mache wie der eine
 * Erklärungssimulation"). Nutzt exakt dasselbe verschachtelte Tab-Muster wie
 * modules/gleichungen/module.js (dort auf oberster Ebene "Linear"/
 * "Quadratisch" für die freien Übungen) – hier innerhalb von "Erklärungen".
 */
export function mountGleichungenErklaerungenBereich(container) {
  erzeugeBereichsTabs(container, {
    titel: 'Gleichungen',
    tabsKlasse: 'gleichungen-erklaerung-tabs',
    eintraege: [
      { id: 'linear', titel: 'Linear', mount: (el) => mountGleichungErklaerung(el, { kind: 'x' }) },
      { id: 'quadratisch', titel: 'Quadratisch', mount: (el) => mountGleichungErklaerung(el, { kind: 'x2' }) },
    ],
  });
}

const KIND_SYMBOL = { x: 'x', x2: 'x²' };
const STANDARD_WERTE = { x: { a: 1, b: 3, c: 7 }, x2: { a: 2, b: 1, c: 9 } };

/**
 * Geführte, Schritt-für-Schritt erzählte Erklärung EINER Äquivalenzumformungs-
 * Lösung (Runde 19): a/b/c werden eingegeben (Form "a·kind + b = c"),
 * `planeGleichungsLoesung` (engine/gleichungen.js) plant den Lösungsweg –
 * dieselbe Engine-Funktion, die auch die freie Sandbox für "Auf beide Seiten
 * anwenden" nutzt (shared/gleichungsKette.js). Folgt demselben Formular-/
 * Frame-/"Nächster Schritt"-Muster wie die übrigen Erklär-Ansichten (siehe
 * z. B. modules/addition-subtraktion/erklaerung.js).
 *
 * Anders als bei Addition/Subtraktion zeigt jeder Frame hier ZWEI Tafeln
 * nebeneinander (linke/rechte Seite der Gleichung, getrennt durch ein
 * dauerhaft sichtbares "="), da eine Äquivalenzumformung per Definition
 * beide Seiten gleichzeitig betrifft.
 *
 * "Frei ab hier weiterarbeiten" baut darunter eine vollwertige Gleichungs-
 * Kette auf (shared/gleichungsKette.js) – ab dort lässt sich mit "Auf beide
 * Seiten anwenden" frei weiterrechnen, z. B. um einen anderen Lösungsweg
 * auszuprobieren.
 */
function mountGleichungErklaerung(container, { kind }) {
  const symbol = KIND_SYMBOL[kind];
  const standard = STANDARD_WERTE[kind];
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Gib eine Gleichung der Form „a·${symbol} + b = c" ein und lass dir Schritt für Schritt zeigen, wie man sie durch Äquivalenzumformungen (auf beiden Seiten zugleich) nach ${symbol} auflöst.</p>
    <form class="rechnung-form gleichung-erklaerung-form" novalidate>
      <div class="feld"><label for="ge-${kind}-a">a</label><input id="ge-${kind}-a" type="number" value="${standard.a}" step="1" min="1" required></div>
      <span class="gleichung-erklaerung-form__symbol">·${symbol} +</span>
      <div class="feld"><label for="ge-${kind}-b">b</label><input id="ge-${kind}-b" type="number" value="${standard.b}" step="1" required></div>
      <span class="gleichung-erklaerung-form__symbol">=</span>
      <div class="feld"><label for="ge-${kind}-c">c</label><input id="ge-${kind}-c" type="number" value="${standard.c}" step="1" required></div>
      <button type="submit" class="ueberpruefen-btn">Neu darstellen</button>
    </form>
    <p class="term-check-feedback" role="status" aria-live="polite"></p>
    <div class="arbeitsflaeche">
      <div class="tafel-wrapper">
        <h4>Gleichung</h4>
        <div class="gleichung-bereich ge-tafeln">
          <div class="gleichung-seite gleichung-seite--links ge-tafel-links"></div>
          <div class="gleichung-istgleich" aria-hidden="true">=</div>
          <div class="gleichung-seite gleichung-seite--rechts ge-tafel-rechts"></div>
        </div>
        <div class="ge-wurzel-zweige" hidden>
          <div class="ge-wurzel-zweig ge-wurzel-zweig--plus">
            <h5 class="ge-wurzel-zweig__titel"></h5>
            <div class="gleichung-bereich">
              <div class="gleichung-seite gleichung-seite--links"></div>
              <div class="gleichung-istgleich" aria-hidden="true">=</div>
              <div class="gleichung-seite gleichung-seite--rechts"></div>
            </div>
          </div>
          <div class="ge-wurzel-zweig ge-wurzel-zweig--minus">
            <h5 class="ge-wurzel-zweig__titel"></h5>
            <div class="gleichung-bereich">
              <div class="gleichung-seite gleichung-seite--links"></div>
              <div class="gleichung-istgleich" aria-hidden="true">=</div>
              <div class="gleichung-seite gleichung-seite--rechts"></div>
            </div>
          </div>
        </div>
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

  const form = container.querySelector('.gleichung-erklaerung-form');
  const aInput = container.querySelector(`#ge-${kind}-a`);
  const bInput = container.querySelector(`#ge-${kind}-b`);
  const cInput = container.querySelector(`#ge-${kind}-c`);
  const feedbackEl = container.querySelector('.term-check-feedback');
  const tafelnEl = container.querySelector('.ge-tafeln');
  const linksEl = container.querySelector('.ge-tafel-links');
  const rechtsEl = container.querySelector('.ge-tafel-rechts');
  const zweigeEl = container.querySelector('.ge-wurzel-zweige');
  const zweigPlusEl = container.querySelector('.ge-wurzel-zweig--plus');
  const zweigMinusEl = container.querySelector('.ge-wurzel-zweig--minus');
  const logEl = container.querySelector('.schritte-log');
  const weiterBtn = container.querySelector('.weiter-btn');
  const freiBtn = container.querySelector('.frei-weiterarbeiten-btn');
  const freiHostEl = container.querySelector('.frei-weiterarbeiten-host');

  let frames = [];
  let index = 0;
  let freieKetteErstellt = false;

  function setzeFreieFortsetzungZurueck() {
    freieKetteErstellt = false;
    freiHostEl.hidden = true;
    freiHostEl.innerHTML = '';
  }

  freiBtn.addEventListener('click', () => {
    if (freieKetteErstellt || frames.length === 0) return;
    freieKetteErstellt = true;
    const frame = frames[index];
    freiHostEl.hidden = false;
    erzeugeGleichungsKette(freiHostEl, {
      typen: kind === 'x2' ? undefined : TYPEN_OHNE_QUADRAT,
      initialLinks: frame.links.map((t) => ({ kind: t.kind, sign: t.sign })),
      initialRechts: frame.rechts.map((t) => ({ kind: t.kind, sign: t.sign })),
    });
  });

  /**
   * Zeigt EINEN Frame an – ein normaler Frame hat genau ein links/rechts-
   * Paar, ein `wurzel-ergebnis`-Frame (Runde 21, Punkt 1: Wurzelziehen bei
   * quadratischen Gleichungen mit "zwei vollständig parallelen
   * Lösungswegen") trägt stattdessen `zweige` (zwei {label, links, rechts})
   * und wird ZWEISPALTIG nebeneinander dargestellt – die normale
   * Ein-Gleichung-Ansicht wird dafür ausgeblendet, nicht ersetzt (derselbe
   * `.ge-tafeln`-Container bleibt für alle übrigen Frames unverändert
   * nutzbar). "Frei ab hier weiterarbeiten" ergibt bei einer Verzweigung
   * keinen eindeutigen Startzustand und bleibt deshalb dort verborgen – auf
   * einem früheren Frame (z. B. "x² = wert") lässt sie sich weiterhin nutzen.
   */
  function zeigeFrameBis(i) {
    logEl.innerHTML = '';
    for (let j = 0; j <= i; j += 1) {
      appendLogEntry(logEl, frames[j].label, frames[j].isResult);
    }
    const frame = frames[i];
    if (frame.zweige) {
      tafelnEl.hidden = true;
      zweigeEl.hidden = false;
      renderZweig(zweigPlusEl, frame.zweige[0]);
      renderZweig(zweigMinusEl, frame.zweige[1]);
      freiBtn.hidden = true;
    } else {
      zweigeEl.hidden = true;
      tafelnEl.hidden = false;
      renderSeite(linksEl, frame.links);
      renderSeite(rechtsEl, frame.rechts);
      freiBtn.hidden = false;
    }
  }

  function aktualisiereWeiterButton() {
    const fertig = index >= frames.length - 1;
    weiterBtn.disabled = fertig;
    weiterBtn.textContent = fertig ? 'Fertig ✓' : 'Nächster Schritt →';
  }

  function starte(a, b, c) {
    setzeFreieFortsetzungZurueck();
    const { schritte, fehler } = planeGleichungsLoesung(kind, a, b, c);
    if (fehler) {
      frames = [];
      index = 0;
      feedbackEl.textContent = fehlerText(fehler, a);
      feedbackEl.classList.add('term-check-feedback--fehler');
      zeigeLeer(false);
      return;
    }
    feedbackEl.textContent = '';
    feedbackEl.classList.remove('term-check-feedback--fehler');
    frames = schritte.map((s) => ({
      links: s.links,
      rechts: s.rechts,
      zweige: s.zweige,
      label: s.label,
      isResult: s.typ === 'ergebnis' || s.typ === 'wurzel-ergebnis',
    }));
    index = 0;
    zeigeFrameBis(0);
    aktualisiereWeiterButton();
  }

  function fehlerText(fehler, a) {
    if (fehler === 'nicht-teilbar') {
      return `Diese Gleichung lässt sich mit ganzzahligen Plättchen nicht ohne Rest lösen – (c − b) ist nicht ohne Rest durch a = ${a} teilbar. Wähle andere Zahlen.`;
    }
    if (fehler === 'keine-ganzzahlige-wurzel') {
      return 'Der Wert unter der Wurzel (x² = …) ist keine Quadratzahl – mit ganzen Plättchen lässt sich hier keine exakte Lösung darstellen. Wähle andere Zahlen.';
    }
    if (fehler === 'keine-loesung') {
      return 'Diese Gleichung hat keine reelle Lösung, da x² dabei negativ werden müsste. Wähle andere Zahlen.';
    }
    return 'Bitte für a eine ganze Zahl ≥ 1 eingeben.';
  }

  /** Anfangszustand: leere Tafeln, kein Rechenweg – erst nach "Neu darstellen" wird gerechnet. `mitReset=false`, wenn der Aufrufer (starte(), im Fehlerfall) die freie Fortsetzung bereits selbst zurückgesetzt hat. */
  function zeigeLeer(mitReset = true) {
    if (mitReset) setzeFreieFortsetzungZurueck();
    frames = [];
    index = 0;
    logEl.innerHTML = '';
    zweigeEl.hidden = true;
    tafelnEl.hidden = false;
    linksEl.innerHTML = '<p class="tafel-leer">Noch keine Gleichung dargestellt.</p>';
    rechtsEl.innerHTML = '<p class="tafel-leer">Noch keine Gleichung dargestellt.</p>';
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
    const a = Number(aInput.value);
    const b = Number(bInput.value);
    const c = Number(cInput.value);
    if (!Number.isInteger(a) || a < 1 || !Number.isInteger(b) || !Number.isInteger(c)) {
      feedbackEl.textContent = 'Bitte ganze Zahlen eingeben (a mindestens 1).';
      feedbackEl.classList.add('term-check-feedback--fehler');
      return;
    }
    starte(a, b, c);
  });

  zeigeLeer();
}

/** Zeigt EINEN der beiden parallelen Wurzelzieh-Lösungswege (Runde 21, Punkt 1) in seinem `.ge-wurzel-zweig`-Panel: Titel + eigene links/rechts-Gleichung. */
function renderZweig(zweigEl, zweig) {
  zweigEl.querySelector('.ge-wurzel-zweig__titel').textContent = zweig.label;
  renderSeite(zweigEl.querySelector('.gleichung-seite--links'), zweig.links);
  renderSeite(zweigEl.querySelector('.gleichung-seite--rechts'), zweig.rechts);
}

/** Zeigt die Plättchen einer Gleichungsseite (ohne Ziehen/Interaktion – rein anschaulich, wie die übrigen Erklär-Tafeln). */
function renderSeite(container, tiles) {
  container.innerHTML = '';
  if (tiles.length === 0) {
    const p = document.createElement('p');
    p.className = 'tafel-leer';
    p.textContent = '0';
    container.appendChild(p);
    return;
  }
  const listeEl = document.createElement('div');
  listeEl.className = 'plaettchen-tafel';
  for (const tile of tiles) {
    listeEl.appendChild(createPlaettchenElement(tile.kind, tile.sign));
  }
  container.appendChild(listeEl);
}

function appendLogEntry(logEl, text, isResult = false) {
  const li = document.createElement('li');
  li.textContent = text;
  if (isResult) li.classList.add('schritte-log__ergebnis');
  logEl.appendChild(li);
}
