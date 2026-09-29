import { erzeugeBereichsTabs } from '../../shared/bereichsTabs.js';
import { mountGleichungenUebungsAnsichten } from './uebungsAnsichten.js';
import { ALLE_TYPEN } from '../../shared/palette.js';

// Für "Linear" fehlt x² in der Auswahl (die ersten beiden Einträge von
// ALLE_TYPEN) – der Rest (x, Zahl, je positiv/negativ) bleibt gleich.
const TYPEN_OHNE_QUADRAT = ALLE_TYPEN.slice(2);

/**
 * Bereich "Gleichungen": Unterpunkte "Linear" (ohne x²-Plättchen) und
 * "Quadratisch" (alle sechs Typen, inkl. x²) – beide zeigen dieselben drei
 * Übungsansichten (Sandbox / Plättchen zu Gleichung / Gleichung zu
 * Plättchen, siehe uebungsAnsichten.js), nur mit unterschiedlicher
 * Auswahl. Spiegelt die Struktur von src/modules/terme/module.js.
 */
export function mountGleichungenBereich(container) {
  container.classList.add('modul', 'modul--gleichungen');
  erzeugeBereichsTabs(container, {
    titel: 'Gleichungen',
    eintraege: [
      {
        id: 'linear',
        titel: 'Linear',
        mount: (el) => mountGleichungenUebungsAnsichten(el, { typen: TYPEN_OHNE_QUADRAT }),
      },
      {
        id: 'quadratisch',
        titel: 'Quadratisch',
        mount: (el) => mountGleichungenUebungsAnsichten(el, {}),
      },
    ],
  });
}
