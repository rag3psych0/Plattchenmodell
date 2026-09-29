import { erzeugeGleichungsSeitenPaar } from '../../shared/gleichungsSeitenPaar.js';
import { nettoKoeffizienten, erzeugeZufaelligeKachelsammlung } from '../../engine/termParser.js';
import { pruefeGleichungEingabe } from '../../shared/termCheck.js';
import { ALLE_TYPEN } from '../../shared/palette.js';

/**
 * "Plättchen zu Gleichung": auf beiden Seiten frei Plättchen auslegen, die
 * abgelesene Gleichung UNTER beiden Flächen eintragen und überprüfen.
 * Der Button "Zufällige Plättchensammlung generieren" befüllt beide Seiten
 * auf einen Schlag mit einer zufälligen Sammlung, damit nicht erst selbst
 * eine Gleichung ausgedacht werden muss.
 *
 * Seit Runde 21 (Punkt 4, Nutzer-Vorgabe: "So wie du die Sandbox aufgebaut
 * hast ... so baue auch Plättchen zu Gleichung und Gleichung zu Plättchen
 * auf") nutzt diese Ansicht dieselbe UI-Mechanik wie die Gleichungen-Sandbox
 * (shared/gleichungsSeitenPaar.js, eine abgespeckte Variante von
 * shared/gleichungsKette.js OHNE deren Umformungs-Werkzeug): EINE
 * gemeinsame Auswahl für beide Seiten, ein Klick auf eine Seite macht sie
 * zur "aktiven" Seite. "Zufällig" und "Überprüfen" beziehen sich auf die
 * jeweils aktuellen Plättchen jeder Seite.
 *
 * @param {HTMLElement} container
 * @param {{typen?: {kind:string, sign:1|-1}[]}} [opts]
 */
export function mountPlaettchenZuGleichung(container, opts = {}) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Lege auf beiden Seiten Plättchen aus (frei oder per Zufallsgenerator), lies die entstandene Gleichung ab, trage sie unten ein und überprüfe deine Antwort.</p>
    <button type="button" class="zufall-btn">Zufällige Plättchensammlung generieren</button>
    <div class="gleichungs-seitenpaar"></div>
    <form class="term-check-form" novalidate>
      <div class="feld feld--term">
        <label for="gleichung-eingabe-lesen">Deine abgelesene Gleichung</label>
        <input id="gleichung-eingabe-lesen" type="text" name="gleichung" placeholder="z. B. 2x² − x + 3 = −x + 5" autocomplete="off">
      </div>
      <button type="submit" class="ueberpruefen-btn">Überprüfen</button>
    </form>
    <p class="term-check-feedback" role="status" aria-live="polite"></p>
  `);

  const seitenpaar = erzeugeGleichungsSeitenPaar(container.querySelector('.gleichungs-seitenpaar'), {
    typen: opts.typen,
  });
  const linksFlaeche = seitenpaar.links;
  const rechtsFlaeche = seitenpaar.rechts;

  const form = container.querySelector('.term-check-form');
  const input = container.querySelector('#gleichung-eingabe-lesen');
  const feedbackEl = container.querySelector('.term-check-feedback');
  const zufallBtn = container.querySelector('.zufall-btn');

  const mitX2 = (opts.typen ?? ALLE_TYPEN).some((t) => t.kind === 'x2');

  zufallBtn.addEventListener('click', () => {
    linksFlaeche.tafel.clear();
    linksFlaeche.tafel.addTiles(erzeugeZufaelligeKachelsammlung({ mitX2 }));
    rechtsFlaeche.tafel.clear();
    rechtsFlaeche.tafel.addTiles(erzeugeZufaelligeKachelsammlung({ mitX2 }));
    input.value = '';
    feedbackEl.textContent = '';
    feedbackEl.classList.remove('term-check-feedback--richtig', 'term-check-feedback--falsch', 'term-check-feedback--fehler');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const erwartetLinks = nettoKoeffizienten(linksFlaeche.tafel.board.tiles);
    const erwartetRechts = nettoKoeffizienten(rechtsFlaeche.tafel.board.tiles);
    // Runde 21 (Punkt 6): nur die vollständig vereinfachte Gleichung zählt
    // als Lösung, nicht nur eine wertgleiche.
    pruefeGleichungEingabe(input.value, erwartetLinks, erwartetRechts, feedbackEl, { erfordertVereinfachteForm: true });
  });
}
