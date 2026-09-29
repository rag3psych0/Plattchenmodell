import { berechneAddition, berechneSubtraktion } from '../../engine/rechnen.js';
import { createPlaettchenElement } from '../../shared/renderPlaettchen.js';
import { erzeugeFreieFlaeche } from '../../shared/freieFlaeche.js';

/**
 * Erklär-Ansicht: zeigt eine vorgegebene Rechnung als Plättchen-Darstellung.
 * Die Schülerin/der Schüler klickt sich mit "Nächster Schritt" selbst durch
 * den Rechenweg – keine automatische, zeitgesteuerte Animation.
 *
 * Ein Nullpaar wird dabei in zwei Klicks aufgelöst: zuerst wird gezeigt,
 * *welche* Plättchen sich gegenseitig aufheben (hervorgehoben, aber noch auf
 * der Tafel), und erst der nächste Klick auf "Nächster Schritt" entfernt sie
 * tatsächlich. Dafür wird jeder Rechenschritt der Engine (`steps`) in ein
 * oder zwei anzeigbare "Frames" übersetzt (`baueFrames`).
 *
 * Die Tafel startet beim Aufruf dieser Ansicht immer LEER (keine automatisch
 * vorgerechnete Beispielrechnung) – erst nach Eingabe von a/b und Klick auf
 * "Neu darstellen" wird tatsächlich etwas dargestellt.
 *
 * Seit Runde 15 (Nutzer-Rückmeldung: "wirklich überall, auch die Erklärungen-
 * Tafeln" soll das Malkreuz als Option verfügbar sein) bleibt die geführte
 * Tafel selbst unverändert schrittgesteuert/nur-lesend – ein zusätzlicher
 * Button "Frei ab hier weiterarbeiten" baut darunter eine ganz normale,
 * vollwertige Bearbeitungsfläche (shared/freieFlaeche.js) auf, vorbefüllt mit
 * den Plättchen des GERADE angezeigten Schritts. Ab dort gilt (seit Runde 17)
 * dieselbe gespiegelte "+ Neue Zeile darunter"-Verkettung und Malkreuz-Option
 * wie überall sonst in der Anwendung.
 */
export function mountErklaerung(container) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Stelle eine Rechnung mit ganzen Zahlen dar und gehe die Erklärung in deinem eigenen Tempo durch.</p>
    <form class="rechnung-form" novalidate>
      <div class="feld"><label for="feld-a">a</label><input id="feld-a" type="number" name="a" value="3" step="1" required></div>
      <div class="feld"><label for="feld-op">Zeichen</label><select id="feld-op" name="op" aria-label="Rechenzeichen"><option value="+">+</option><option value="-">−</option></select></div>
      <div class="feld"><label for="feld-b">b</label><input id="feld-b" type="number" name="b" value="-5" step="1" required></div>
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
  `);

  const form = container.querySelector('.rechnung-form');
  const tafelEl = container.querySelector('.plaettchen-tafel');
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
    renderTafel(tafelEl, frame.tiles, { highlightIds: frame.highlightIds, highlightClass: frame.highlightClass });
    freiBtn.hidden = false;
  }

  function aktualisiereWeiterButton() {
    const fertig = index >= frames.length - 1;
    weiterBtn.disabled = fertig;
    weiterBtn.textContent = fertig ? 'Fertig ✓' : 'Nächster Schritt →';
  }

  function starte(a, b, op) {
    setzeFreieFortsetzungZurueck();
    const steps = (op === '+' ? berechneAddition(a, b) : berechneSubtraktion(a, b)).steps;
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
    hinweis.textContent = 'Noch keine Rechnung dargestellt – Zahlen eingeben und auf "Neu darstellen" klicken.';
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
    const b = Number(data.get('b'));
    const op = data.get('op');
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    starte(a, b, op);
  });

  zeigeLeer();
}

/**
 * Übersetzt die Rechenschritte der Engine in einzeln anzeigbare Frames.
 * Ein "cancel"-Schritt (Nullpaar-Auflösung) wird zu ZWEI Frames: erst das
 * Vorher-Bild mit hervorgehobenem Nullpaar (noch nicht entfernt), dann das
 * Nachher-Bild ohne die aufgehobenen Plättchen. So braucht es zwei Klicks
 * auf "Nächster Schritt", um ein Nullpaar tatsächlich verschwinden zu lassen.
 */
function baueFrames(steps) {
  const frames = [];
  for (const step of steps) {
    if (step.type === 'cancel' && step.snapshotBefore) {
      frames.push({
        tiles: step.snapshotBefore,
        highlightIds: step.cancelIds,
        highlightClass: 'wird-neutralisiert',
        logLabel: step.label,
        logIsResult: false,
      });
      frames.push({
        tiles: step.snapshot,
        logLabel: null,
        logIsResult: false,
      });
    } else {
      frames.push({
        tiles: step.snapshot,
        logLabel: step.label,
        logIsResult: step.type === 'result',
      });
    }
  }
  return frames;
}

function renderTafel(container, tiles, opts = {}) {
  container.innerHTML = '';
  if (tiles.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'tafel-leer';
    empty.textContent = 'Keine Plättchen übrig – Ergebnis: 0.';
    container.appendChild(empty);
    return;
  }
  for (const tile of tiles) {
    const el = createPlaettchenElement(tile.kind, tile.sign, { id: tile.id });
    if (opts.highlightIds?.includes(tile.id)) el.classList.add(opts.highlightClass);
    container.appendChild(el);
  }
}

function appendLogEntry(logEl, text, isResult = false) {
  const li = document.createElement('li');
  li.textContent = text;
  if (isResult) li.classList.add('schritte-log__ergebnis');
  logEl.appendChild(li);
}
