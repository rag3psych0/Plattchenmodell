import { erzeugeFreieFlaeche } from '../../shared/freieFlaeche.js';
import { nettoKoeffizienten, erzeugeZufaelligeKachelsammlung } from '../../engine/termParser.js';
import { pruefeTermEingabe } from '../../shared/termCheck.js';
import { ALLE_TYPEN } from '../../shared/palette.js';

/**
 * "Plättchen zu Term": Die Schülerin/der Schüler legt frei Plättchen aus
 * (identische Mechanik wie in der Sandbox) und trägt UNTER der
 * Bearbeitungsfläche den Term ein, den sie/er daraus abliest. Ein Klick auf
 * "Überprüfen" vergleicht die Eingabe mit den tatsächlichen, bereits
 * vereinfachten Koeffizienten der ausliegenden Plättchen – unabhängig davon,
 * ob eventuelle Nullpaare schon per Ziehen entfernt wurden. Der Button
 * "Zufällige Plättchensammlung generieren" befüllt die Fläche auf Knopfdruck,
 * damit nicht erst selbst ein Term ausgedacht werden muss.
 *
 * Seit Runde 17 lässt sich über "+ Neue Zeile darunter" beliebig oft eine
 * weitere, gespiegelte Kästchenfläche anhängen (siehe shared/freieFlaeche.js)
 * – "Zufällig" und "Überprüfen" beziehen sich auf die AKTIVE Fläche, was
 * gleichwertig zu jeder anderen Fläche ist, da alle stets denselben
 * Plättchen-Bestand zeigen.
 *
 * @param {HTMLElement} container
 * @param {{typen?: {kind:string, sign:1|-1}[]}} [opts]
 */
export function mountPlaettchenZuTerm(container, opts = {}) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Lege mit den Plättchen einen beliebigen Term aus (frei oder per Zufallsgenerator). Lies ihn ab, trage ihn unten ein und überprüfe deine Antwort.</p>
    <button type="button" class="zufall-btn">Zufällige Plättchensammlung generieren</button>
    <div class="freie-flaeche"></div>
    <form class="term-check-form" novalidate>
      <div class="feld feld--term">
        <label for="term-eingabe-lesen">Dein abgelesener Term</label>
        <input id="term-eingabe-lesen" type="text" name="term" placeholder="z. B. 2x² − x + 3" autocomplete="off">
      </div>
      <button type="submit" class="ueberpruefen-btn">Überprüfen</button>
    </form>
    <p class="term-check-feedback" role="status" aria-live="polite"></p>
  `);

  const flaeche = erzeugeFreieFlaeche(container.querySelector('.freie-flaeche'), {
    flaechenTitel: 'Bearbeitungsfläche',
    typen: opts.typen,
  });

  const form = container.querySelector('.term-check-form');
  const input = container.querySelector('#term-eingabe-lesen');
  const feedbackEl = container.querySelector('.term-check-feedback');
  const zufallBtn = container.querySelector('.zufall-btn');

  const mitX2 = (opts.typen ?? ALLE_TYPEN).some((t) => t.kind === 'x2');

  zufallBtn.addEventListener('click', () => {
    flaeche.tafel.clear();
    flaeche.tafel.addTiles(erzeugeZufaelligeKachelsammlung({ mitX2 }));
    input.value = '';
    feedbackEl.textContent = '';
    feedbackEl.classList.remove('term-check-feedback--richtig', 'term-check-feedback--falsch', 'term-check-feedback--fehler');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const erwartet = nettoKoeffizienten(flaeche.tafel.board.tiles);
    // Runde 21 (Punkt 6): nur der vollständig vereinfachte Term zählt als
    // Lösung, nicht nur ein wertgleicher (z. B. "2x+3x" statt "5x").
    pruefeTermEingabe(input.value, erwartet, feedbackEl, { erfordertVereinfachteForm: true });
  });
}
