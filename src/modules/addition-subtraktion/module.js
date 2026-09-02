import { berechneAddition, berechneSubtraktion } from '../../engine/rechnen.js';
import { createPlaettchenElement } from '../../shared/renderPlaettchen.js';

const STEP_DELAY_MS = 700;

/**
 * Baut das Modul "Addition & Subtraktion" in `container` auf.
 * Eigenständig lauffähig – braucht nur die Engine und das Theme.
 */
export function mountAdditionSubtraktion(container) {
  container.innerHTML = '';
  container.classList.add('modul', 'modul--addition-subtraktion');

  container.insertAdjacentHTML(
    'beforeend',
    `
    <h2>Addition &amp; Subtraktion mit dem Plättchenmodell</h2>
    <p class="modul__intro">
      Stelle eine Rechnung mit ganzen Zahlen dar. Positive Zahlen werden als
      rote, negative Zahlen als grüne Plättchen gelegt – ein rotes und ein
      grünes Plättchen zusammen ergeben ein <strong>Nullpaar</strong> und
      heben sich gegenseitig auf.
    </p>
    <form class="rechnung-form" novalidate>
      <label>a
        <input type="number" name="a" value="3" step="1" required>
      </label>
      <select name="op" aria-label="Rechenzeichen">
        <option value="+">+</option>
        <option value="-">−</option>
      </select>
      <label>b
        <input type="number" name="b" value="-5" step="1" required>
      </label>
      <button type="submit">Darstellen</button>
      <label class="rechnung-form__animate">
        <input type="checkbox" name="animate" checked>
        Schritt für Schritt animieren
      </label>
    </form>
    <div class="plaettchen-board" aria-live="polite"></div>
    <ol class="schritte-log"></ol>
  `,
  );

  const form = container.querySelector('.rechnung-form');
  const boardEl = container.querySelector('.plaettchen-board');
  const logEl = container.querySelector('.schritte-log');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const a = Number(data.get('a'));
    const b = Number(data.get('b'));
    const op = data.get('op');
    const animate = data.get('animate') === 'on';

    if (!Number.isFinite(a) || !Number.isFinite(b)) return;

    const { steps } = op === '+' ? berechneAddition(a, b) : berechneSubtraktion(a, b);
    await playSteps(boardEl, logEl, steps, animate);
  });

  // Erste Beispielrechnung direkt beim Laden anzeigen.
  form.requestSubmit();
}

async function playSteps(boardEl, logEl, steps, animate) {
  boardEl.innerHTML = '';
  logEl.innerHTML = '';

  for (const step of steps) {
    if (step.type === 'cancel' && step.snapshotBefore) {
      renderBoard(boardEl, step.snapshotBefore, { highlightIds: step.cancelIds, highlightClass: 'wird-neutralisiert' });
      appendLogEntry(logEl, step.label);
      if (animate) await wait(STEP_DELAY_MS);
      renderBoard(boardEl, step.snapshot);
    } else if (step.type === 'remove' && step.removedIds) {
      renderBoard(boardEl, step.snapshot);
      appendLogEntry(logEl, step.label);
    } else {
      renderBoard(boardEl, step.snapshot);
      appendLogEntry(logEl, step.label, step.type === 'result');
    }
    if (animate) await wait(STEP_DELAY_MS);
  }
}

function renderBoard(container, tiles, opts = {}) {
  container.innerHTML = '';
  if (tiles.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'plaettchen-board__empty';
    empty.textContent = 'Keine Plättchen übrig – Ergebnis: 0.';
    container.appendChild(empty);
    return;
  }
  for (const tile of tiles) {
    const el = createPlaettchenElement(tile.kind, tile.sign, { id: tile.id });
    if (opts.highlightIds?.includes(tile.id)) {
      el.classList.add(opts.highlightClass);
    }
    container.appendChild(el);
  }
}

function appendLogEntry(logEl, text, isResult = false) {
  const li = document.createElement('li');
  li.textContent = text;
  if (isResult) li.classList.add('schritte-log__ergebnis');
  logEl.appendChild(li);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
