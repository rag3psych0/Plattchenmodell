import { erzeugeFreieFlaeche } from '../../shared/freieFlaeche.js';

/**
 * "Sandbox"-Ansicht: eine freie Kästchenfläche, auf der Plättchen über die
 * Auswahl hinzugefügt werden (Button "Plättchen hinzufügen" oder Ziehen).
 * Gleiche Plättchen stapeln sich automatisch in einer Spalte nach unten,
 * verschiedene Typen stehen nebeneinander (wie beim Term). Ob zwei
 * Plättchen ein Nullpaar bilden, wird NICHT automatisch angezeigt – das
 * soll die Schülerin/der Schüler selbst erkennen.
 *
 * Aufgelöst wird ausschließlich per Ziehen: ein Plättchen wird auf sein
 * Gegenstück gezogen, trifft es dort, verschwinden beide – sonst springt es
 * zurück auf seinen Platz. Mit gedrückter Maustaste über der Fläche lässt
 * sich außerdem ein Auswahlrechteck aufziehen, das mehrere Plättchen
 * DERSELBEN SORTE zu einer Gruppe zusammenfasst, die sich dann gemeinsam
 * ziehen lässt.
 *
 * Der dargestellte Term bleibt zunächst verborgen (Kontrolle erst nach
 * eigenem Rechnen) und wird über einen Button eingeblendet.
 *
 * Wird sowohl für "Linear" (ohne x², siehe `typen`) als auch für
 * "Quadratisch" (alle sechs Typen) verwendet – der Übungsmechanismus selbst
 * ist identisch, nur die Auswahl unterscheidet sich.
 *
 * Seit Runde 17 lässt sich über "+ Neue Zeile darunter" beliebig oft eine
 * weitere, mit der bestehenden Fläche gespiegelte Kästchenfläche anhängen
 * (siehe shared/freieFlaeche.js) – Änderungen an irgendeiner Fläche der so
 * entstehenden Gruppe wirken sich sofort auf alle übrigen aus.
 *
 * @param {HTMLElement} container
 * @param {{typen?: {kind:string, sign:1|-1}[]}} [opts]
 */
export function mountSandbox(container, opts = {}) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Füge über die Auswahl Plättchen hinzu. Erkennst du ein Nullpaar (ein positives und ein negatives Plättchen derselben Sorte), ziehe eines der beiden auf das andere, um es aufzulösen – trifft es nicht, springt es zurück. Mit gedrückter Maustaste über der Fläche kannst du mehrere gleichartige Plättchen zu einer Gruppe zusammenfassen und gemeinsam verschieben.</p>
    <div class="freie-flaeche"></div>
  `);

  erzeugeFreieFlaeche(container.querySelector('.freie-flaeche'), {
    flaechenTitel: 'Bearbeitungsfläche',
    typen: opts.typen,
  });
}
