import { erzeugeGleichungsSeitenPaar } from '../../shared/gleichungsSeitenPaar.js';
import { nettoKoeffizienten, erzeugeZufaelligeGleichung, parseGleichung, koeffizientenGleich, istKachelnVollstaendigGekuerzt } from '../../engine/termParser.js';
import { pruefeGleichungEingabe } from '../../shared/termCheck.js';
import { ALLE_TYPEN } from '../../shared/palette.js';

/**
 * "Gleichung zu Plättchen": umgekehrte Richtung von "Plättchen zu
 * Gleichung" – OBERHALB beider Flächen wird zuerst eine Gleichung
 * eingetragen (per Hand oder per "Zufällig"-Button), dann werden dazu
 * passende Plättchen auf beiden Seiten ausgelegt. "Überprüfen" vergleicht
 * beide Flächen mit der eingetragenen Gleichung.
 *
 * Seit Runde 21 (Punkt 4, siehe modules/gleichungen/plaettchenZuGleichung.js
 * für die volle Begründung) nutzt diese Ansicht dieselbe UI-Mechanik wie die
 * Gleichungen-Sandbox (shared/gleichungsSeitenPaar.js): EINE gemeinsame
 * Auswahl für beide Seiten, ein Klick auf eine Seite macht sie zur
 * "aktiven" Seite. Die Gleichung oben bleibt fest, "Überprüfen" bezieht
 * sich auf die jeweils aktuellen Plättchen jeder Seite.
 *
 * @param {HTMLElement} container
 * @param {{typen?: {kind:string, sign:1|-1}[]}} [opts]
 */
export function mountGleichungZuPlaettchen(container, opts = {}) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Trage oben eine Gleichung ein (von Hand oder per Zufallsgenerator) und lege dann auf beiden Seiten die passenden Plättchen aus. Mit "Überprüfen" kontrollierst du dein Ergebnis.</p>
    <form class="term-check-form term-check-form--vorher" novalidate>
      <div class="feld feld--term">
        <label for="gleichung-eingabe-vorgabe">Deine Gleichung</label>
        <div class="term-eingabe-zeile">
          <input id="gleichung-eingabe-vorgabe" type="text" name="gleichung" placeholder="z. B. 2x² − x + 3 = −x + 5" autocomplete="off">
          <button type="button" class="zufall-btn">Zufällig</button>
        </div>
      </div>
      <button type="submit" class="ueberpruefen-btn">Überprüfen</button>
    </form>
    <p class="term-check-feedback" role="status" aria-live="polite"></p>
    <div class="gleichungs-seitenpaar"></div>
  `);

  const seitenpaar = erzeugeGleichungsSeitenPaar(container.querySelector('.gleichungs-seitenpaar'), {
    typen: opts.typen,
  });
  const linksFlaeche = seitenpaar.links;
  const rechtsFlaeche = seitenpaar.rechts;

  const form = container.querySelector('.term-check-form');
  const input = container.querySelector('#gleichung-eingabe-vorgabe');
  const feedbackEl = container.querySelector('.term-check-feedback');
  const zufallBtn = container.querySelector('.zufall-btn');

  const mitX2 = (opts.typen ?? ALLE_TYPEN).some((t) => t.kind === 'x2');

  zufallBtn.addEventListener('click', () => {
    input.value = erzeugeZufaelligeGleichung({ mitX2 });
    feedbackEl.textContent = '';
    feedbackEl.classList.remove('term-check-feedback--richtig', 'term-check-feedback--falsch', 'term-check-feedback--fehler');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const linksTiles = linksFlaeche.tafel.board.tiles;
    const rechtsTiles = rechtsFlaeche.tafel.board.tiles;
    const erwartetLinks = nettoKoeffizienten(linksTiles);
    const erwartetRechts = nettoKoeffizienten(rechtsTiles);

    // Runde 21 (Punkt 7): nur beidseitig vollständig GEKÜRZTE Flächen
    // zählen als Lösung – stimmt zwar schon der Netto-Wert, liegen aber auf
    // einer der beiden Seiten noch unaufgelöste Nullpaare aus, ist das noch
    // keine fertige Antwort.
    const geparst = parseGleichung(input.value);
    const wertRichtig = geparst
      && koeffizientenGleich(geparst.links, erwartetLinks)
      && koeffizientenGleich(geparst.rechts, erwartetRechts);
    const vollstaendigGekuerzt = istKachelnVollstaendigGekuerzt(linksTiles) && istKachelnVollstaendigGekuerzt(rechtsTiles);
    if (wertRichtig && !vollstaendigGekuerzt) {
      feedbackEl.classList.remove('term-check-feedback--richtig', 'term-check-feedback--falsch', 'term-check-feedback--fehler');
      feedbackEl.textContent = 'Der Wert stimmt schon, aber löse zuerst noch alle Nullpaare auf – erst zwei vollständig gekürzte Flächen zählen als Lösung.';
      feedbackEl.classList.add('term-check-feedback--falsch');
      return;
    }

    pruefeGleichungEingabe(input.value, erwartetLinks, erwartetRechts, feedbackEl);
  });
}
