import { erzeugeBereichsTabs } from '../../shared/bereichsTabs.js';
import { mountErklaerung } from '../addition-subtraktion/erklaerung.js';
import { mountMultiplikationDivisionErklaerung } from '../multiplikation-division/erklaerung.js';
import { mountKlammernMultiplizierenErklaerung } from './klammern-multiplizieren.js';
import { mountQuadratischeErgaenzungErklaerung } from '../quadratische-ergaenzung/erklaerung.js';
import { mountGleichungenErklaerungenBereich } from '../gleichungen/erklaerung.js';

/**
 * Bereich "Erklärungen": vorgegebene Rechnungen, Schritt für Schritt im
 * eigenen Tempo per Button durchklickbar – gruppiert nach Operation.
 *
 * "Klammern multiplizieren" stand ursprünglich (Runde 12–16) als Unterpunkt
 * unter "Terme" – seit Runde 17 (Nutzer-Rückmeldung Punkt 5) hier unter
 * "Erklärungen", da es inhaltlich eine geführte Erklärung der Multiplikation
 * zweier Klammern ist, keine freie Übung.
 *
 * "Gleichungen" (Runde 19, Nutzer-Vorgabe) ist selbst wieder in "Linear" und
 * "Quadratisch" unterteilt (verschachtelte Tabs, siehe
 * modules/gleichungen/erklaerung.js) – dieselbe Struktur wie
 * modules/gleichungen/module.js auf oberster Ebene.
 */
export function mountErklaerungenBereich(container) {
  container.classList.add('modul', 'modul--erklaerungen');
  erzeugeBereichsTabs(container, {
    titel: 'Erklärungen',
    eintraege: [
      { id: 'addition-subtraktion', titel: 'Addition & Subtraktion', mount: mountErklaerung },
      { id: 'multiplikation-division', titel: 'Multiplikation & Division', mount: mountMultiplikationDivisionErklaerung },
      { id: 'klammern-multiplizieren', titel: 'Multiplikation von Klammern/Das Malkreuz', mount: mountKlammernMultiplizierenErklaerung },
      { id: 'quadratische-ergaenzung', titel: 'Quadratische Ergänzung', mount: mountQuadratischeErgaenzungErklaerung },
      { id: 'gleichungen', titel: 'Gleichungen', mount: mountGleichungenErklaerungenBereich },
    ],
  });
}
