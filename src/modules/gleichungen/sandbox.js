import { erzeugeGleichungsKette } from '../../shared/gleichungsKette.js';

/**
 * "Sandbox"-Ansicht für Gleichungen: freies Legen einer Gleichung (linke und
 * rechte Seite räumlich getrennt, das "=" dauerhaft sichtbar dazwischen) UND
 * – seit Runde 19 (Nutzer-Vorgabe) – Äquivalenzumformungen über "Auf beide
 * Seiten anwenden": dieselbe Operation (Plättchen hinzufügen/entfernen,
 * multiplizieren, dividieren) wird auf beiden Seiten zugleich ausgeführt und
 * erzeugt eine neue, eigenständig weiterbearbeitbare Zeile darunter (siehe
 * shared/gleichungsKette.js für die vollständige Begründung des Zeilen-
 * Verhaltens und shared/../engine/gleichungen.js für die fachliche Logik).
 *
 * Bis Runde 18 bestand diese Ansicht aus zwei unabhängigen, über
 * shared/freieFlaeche.js aufgebauten Flächen ohne Verbindung zueinander –
 * Äquivalenzumformungen und Multiplikation/Division waren hier nicht
 * möglich. shared/gleichungsKette.js übernimmt seither die räumliche
 * Trennung/das zentrale "=" UND ergänzt die neue Umformungs-Funktion.
 *
 * @param {HTMLElement} container
 * @param {{typen?: {kind:string, sign:1|-1}[]}} [opts]
 */
export function mountGleichungenSandbox(container, opts = {}) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Lege auf beiden Seiten Plättchen aus, um eine Gleichung darzustellen – und forme sie mit "Auf beide Seiten anwenden" äquivalent um.</p>
    <div class="gleichungs-kette-host"></div>
  `);

  erzeugeGleichungsKette(container.querySelector('.gleichungs-kette-host'), {
    typen: opts.typen,
  });
}
