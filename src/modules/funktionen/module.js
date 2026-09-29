import { erzeugeBereichsTabs } from '../../shared/bereichsTabs.js';
import { mountParabeln } from './parabeln.js';

/**
 * Bereich "Funktionen": lineare und quadratische Funktionen (Graphen,
 * Funktionsgleichungen). "Lineare Funktionen"/"Quadratische Funktionen"
 * sind fachlich noch nicht umgesetzt – dieser Bereich war nicht Teil des
 * ursprünglichen Ablaufplans der Masterarbeit (der bei Termen/Gleichungen
 * endet); die Navigation ist auf Nutzerwunsch bereits vorbereitet, der
 * Inhalt folgt in einer späteren Ausbaustufe.
 *
 * Seit Runde 21 (Punkt 10, Nutzer-Vorgabe: "Erstelle einen Reiter unter
 * Funktionen: Parabeln") kommt "Parabeln" als dritter, bereits FUNKTIONS-
 * FÄHIGER Unterpunkt hinzu (siehe parabeln.js) – `erzeugeBereichsTabs` wählt
 * automatisch den ersten Unterpunkt MIT `mount`-Funktion als Vorauswahl, das
 * ist also weiterhin "Parabeln" (die anderen beiden bleiben deaktiviert).
 */
export function mountFunktionenBereich(container) {
  container.classList.add('modul', 'modul--funktionen');
  erzeugeBereichsTabs(container, {
    titel: 'Funktionen',
    eintraege: [
      { id: 'lineare-funktionen', titel: 'Lineare Funktionen' },
      { id: 'quadratische-funktionen', titel: 'Quadratische Funktionen' },
      { id: 'parabeln', titel: 'Parabeln', mount: mountParabeln },
    ],
  });
}
