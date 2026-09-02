/**
 * Kern-Engine: Plättchen-Objekt.
 *
 * Ein Plättchen hat einen Typ ("kind") und ein Vorzeichen ("sign").
 * - kind: 'zahl' | 'x' | 'x2'   (1-Plättchen, x-Plättchen, x²-Plättchen)
 * - sign: 1 (positiv) | -1 (negativ)
 *
 * Diese Datei kennt bewusst keine Farben/Formen (siehe shared/theme.js) und
 * keine UI – reine Datenlogik, damit sie unabhängig vom Rendering getestet
 * und später leicht in ein anderes Frontend (z. B. React) übernommen werden
 * kann.
 */

let idCounter = 0;

/**
 * @param {'zahl'|'x'|'x2'} kind
 * @param {1|-1} sign
 * @returns {{id: string, kind: string, sign: 1|-1}}
 */
export function createPlaettchen(kind, sign) {
  if (!['zahl', 'x', 'x2'].includes(kind)) {
    throw new Error(`Unbekannter Plättchen-Typ: ${kind}`);
  }
  if (sign !== 1 && sign !== -1) {
    throw new Error(`Vorzeichen muss 1 oder -1 sein, war: ${sign}`);
  }
  idCounter += 1;
  return { id: `p${idCounter}`, kind, sign };
}

/** Nur für Tests: setzt den internen Zähler zurück, damit IDs vorhersagbar sind. */
export function _resetIdCounterForTests() {
  idCounter = 0;
}
