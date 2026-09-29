import { erzeugeBereichsTabs } from '../../shared/bereichsTabs.js';
import { mountUebungsAnsichten } from './uebungsAnsichten.js';
import { ALLE_TYPEN } from '../../shared/palette.js';

// Für "Linear" fehlt x² in der Auswahl (die ersten beiden Einträge von
// ALLE_TYPEN) – der Rest (x, Zahl, je positiv/negativ) bleibt gleich.
const TYPEN_OHNE_QUADRAT = ALLE_TYPEN.slice(2);

/**
 * Bereich "Terme": Unterpunkte "Linear" (ohne x²-Plättchen) und
 * "Quadratisch" (alle sechs Typen, inkl. x²) zeigen dieselben drei
 * Übungsansichten (Sandbox / Plättchen zu Term / Term zu Plättchen, siehe
 * uebungsAnsichten.js), nur mit unterschiedlicher Auswahl.
 *
 * "Klammern multiplizieren" (Runde 12–16 hier beheimatet) zog in Runde 17
 * auf Nutzer-Rückmeldung (Punkt 5) in den Bereich "Erklärungen" um, siehe
 * modules/erklaerungen/module.js. "Division / Faktorisieren" (Runde 13/14
 * hier beheimatet) entfiel in Runde 17 auf Nutzer-Rückmeldung (Punkt 6)
 * komplett – die grundlegende Division bleibt weiterhin über "Erklärungen >
 * Multiplikation & Division" abgedeckt.
 */
export function mountTermeBereich(container) {
  container.classList.add('modul', 'modul--terme');
  erzeugeBereichsTabs(container, {
    titel: 'Terme',
    eintraege: [
      {
        id: 'linear',
        titel: 'Linear',
        mount: (el) => mountUebungsAnsichten(el, { typen: TYPEN_OHNE_QUADRAT }),
      },
      {
        id: 'quadratisch',
        titel: 'Quadratisch',
        mount: (el) => mountUebungsAnsichten(el, {}),
      },
    ],
  });
}
