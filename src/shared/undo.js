/**
 * Einfacher, mehrstufiger Rückgängig-Speicher für EINE Bearbeitungsfläche
 * (Runde 16, Nutzer-Rückmeldung: "Rückgängig button").
 *
 * Eine Bearbeitungsfläche kann aus mehreren, unabhängig mutierenden
 * Teil-Komponenten bestehen (z. B. eine freie Tafel UND ein optionales
 * Malkreuz, siehe shared/freieFlaeche.js) – weil beide Komponenten in
 * DENSELBEN Speicher aufzeichnen, bleibt die Reihenfolge über beide hinweg
 * korrekt: ein Klick auf "Rückgängig" macht immer die zeitlich LETZTE
 * Aktion rückgängig, unabhängig davon, welche Teil-Komponente sie ausgelöst
 * hat. Jede mutierende Aktion zeichnet VOR der Änderung eine
 * Wiederherstellungs-Funktion auf; "Rückgängig" ruft die zuletzt
 * aufgezeichnete Funktion auf und entfernt sie vom Stapel – klassischer,
 * beliebig oft hintereinander nutzbarer Undo-Stapel (kein Redo).
 */
export function erzeugeUndoSpeicher(opts = {}) {
  const stapel = [];
  const onChange = opts.onChange; // z. B. um einen "Rückgängig"-Button (de)aktivieren zu können

  function melde() { onChange?.(stapel.length); }
  melde();

  return {
    /** Zeichnet eine Wiederherstellungs-Funktion für die soeben erfolgte Änderung auf. */
    aufzeichnen(wiederherstellen) {
      stapel.push(wiederherstellen);
      melde();
    },
    kannRueckgaengig: () => stapel.length > 0,
    /** Macht die zuletzt aufgezeichnete Änderung rückgängig. @returns {boolean} ob etwas rückgängig gemacht wurde. */
    rueckgaengig() {
      const wiederherstellen = stapel.pop();
      if (!wiederherstellen) return false;
      wiederherstellen();
      melde();
      return true;
    },
    /** Leert den Stapel, ohne etwas rückgängig zu machen (z. B. beim Verlassen einer Zeile). */
    leeren() {
      if (stapel.length === 0) return;
      stapel.length = 0;
      melde();
    },
    /**
     * Ersetzt den zuletzt aufgezeichneten Schritt durch `wiederherstellen`,
     * OHNE den alten auszuführen (kein `rueckgaengig()` – nur Austauschen).
     * Für Fälle, in denen eine Aktion ZWEI unabhängige Zustände gemeinsam
     * ändert, von denen einer automatisch (z. B. von shared/andockRaster.js)
     * aufgezeichnet wurde: die aufrufende Stelle ersetzt diesen Ein-Zustand-
     * Schritt durch einen gebündelten, der beide Zustände zusammen
     * wiederherstellt (Runde 16, siehe division-faktorisieren.js).
     */
    ersetzeLetzten(wiederherstellen) {
      if (stapel.length > 0) stapel.pop();
      stapel.push(wiederherstellen);
      melde();
    },
  };
}
