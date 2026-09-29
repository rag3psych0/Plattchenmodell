/**
 * "Zeilenkette" (Runde 15, Nutzer-Rückmeldung Punkt 3+4): eine vertikal
 * gestapelte Liste von Bearbeitungsflächen-"Zeilen", bei der jede Zeile
 * einen eigenen "+ Neue Zeile darunter"-Button trägt. Klickt man ihn, wird
 * die AKTUELLE Zeile höhenmäßig komprimiert (bleibt sichtbar, nimmt aber
 * weniger Platz ein) und direkt darunter erscheint eine neue, UNABHÄNGIGE
 * Zeile – mit einem "=" links am Anfang und den Plättchen der vorherigen
 * Zeile bereits hineinkopiert (aber danach eigenständig weiter bearbeitbar,
 * ohne Rückwirkung auf die vorherige Zeile). Da JEDE Zeile (auch eine neu
 * entstandene) ihren eigenen "+"-Button besitzt, lässt sich beliebig oft
 * weiterketten, und der Nutzer wählt selbst, an welcher vorhandenen Zeile er
 * weiterarbeiten möchte (nicht zwingend an der zuletzt erzeugten).
 *
 * Seit Runde 17 wird diese Datei NUR NOCH von "Klammern multiplizieren"
 * verwendet (siehe modules/erklaerungen/klammern-multiplizieren.js) – dort
 * bleibt die bisherige Semantik (unabhängige Folge-Zeilen, Faktoren werden
 * übernommen, das Produkt-Raster startet bewusst wieder leer zum erneuten
 * Üben) unverändert sinnvoll. Die freie Kästchenfläche (shared/
 * freieFlaeche.js) hat seit Runde 17 eine EIGENE, davon unabhängige
 * "+ Neue Zeile darunter"-Verkettung mit GESPIEGELTEN (statt unabhängigen)
 * Flächen – auf Nutzer-Rückmeldung hin ein bewusst anderes Verhalten, siehe
 * dort für die Begründung.
 *
 * Diese Datei kennt nichts über den INHALT einer Zeile – das liefert die
 * aufrufende Stelle über `opts.mountZeile`.
 *
 * @param {HTMLElement} container Ziel-Element, wird komplett befüllt.
 * @param {{
 *   mountZeile: (inhaltEl: HTMLElement, kontext: { istErste: boolean, vorherigerZustand: any }) => { kopiereZustand?: () => any },
 *   neueZeileLabel?: string,
 * }} opts
 *   mountZeile MUSS den Inhalt der Zeile in `inhaltEl` aufbauen und darf
 *   optional `kopiereZustand()` zurückgeben – wird beim Klick auf "+ Neue
 *   Zeile" aufgerufen, ihr Rückgabewert landet unverändert als
 *   `vorherigerZustand` in der neu erzeugten Folge-Zeile.
 * @returns {{ getZeilen: () => any[] }}
 */

// Faktor, um den eine komprimierte Zeile visuell verkleinert wird. Die
// Interaktionsflächen bleiben dabei korrekt klickbar/ziehbar, weil CSS
// `transform: scale()` die von `getBoundingClientRect()` gemeldeten
// Koordinaten mit verändert – Drag&Drop-Trefferprüfungen (z. B. im
// Malkreuz, siehe andockRaster.js) funktionieren daher unverändert weiter,
// nur eben in kleinerem Maßstab.
const KOMPAKT_FAKTOR = 0.55;

export function erzeugeZeilenkette(container, opts = {}) {
  const { mountZeile, neueZeileLabel = '+ Neue Zeile darunter' } = opts;
  if (typeof mountZeile !== 'function') {
    throw new Error('erzeugeZeilenkette benötigt opts.mountZeile');
  }

  container.innerHTML = '';
  container.classList.add('zeilenkette');

  const zeilen = [];

  function kompaktSchalten(eintrag) {
    if (eintrag.kompakt) return;
    eintrag.kompakt = true;
    const rect = eintrag.inhaltEl.getBoundingClientRect();
    // Innen-Element auf seiner natürlichen Größe "einfrieren", bevor die
    // Verkleinerung greift, damit responsive Inhalte (z. B. die Palette
    // einer freien Fläche) nicht plötzlich umbrechen.
    eintrag.inhaltEl.style.width = `${rect.width}px`;
    eintrag.inhaltEl.style.height = `${rect.height}px`;
    // Rahmen auf die tatsächlich benötigte (verkleinerte) Höhe/Breite
    // schrumpfen – das komprimiert die Zeile für den Seitenfluss.
    eintrag.rahmenEl.style.width = `${rect.width * KOMPAKT_FAKTOR}px`;
    eintrag.rahmenEl.style.height = `${rect.height * KOMPAKT_FAKTOR}px`;
    eintrag.el.classList.add('zeilenkette__zeile--kompakt');
  }

  function baueZeile(vorherigerZustand, istErste) {
    const zeileEl = document.createElement('div');
    zeileEl.className = 'zeilenkette__zeile';

    if (!istErste) {
      const gleichEl = document.createElement('span');
      gleichEl.className = 'zeilenkette__gleich';
      gleichEl.textContent = '=';
      gleichEl.setAttribute('aria-hidden', 'true');
      zeileEl.appendChild(gleichEl);
    }

    const rahmenEl = document.createElement('div');
    rahmenEl.className = 'zeilenkette__inhalt-rahmen';
    const inhaltEl = document.createElement('div');
    inhaltEl.className = 'zeilenkette__inhalt';
    rahmenEl.appendChild(inhaltEl);
    zeileEl.appendChild(rahmenEl);

    const toolbarEl = document.createElement('div');
    toolbarEl.className = 'zeilenkette__toolbar';
    const neueZeileBtn = document.createElement('button');
    neueZeileBtn.type = 'button';
    neueZeileBtn.className = 'zeilenkette__neue-zeile-btn';
    neueZeileBtn.textContent = neueZeileLabel;
    toolbarEl.appendChild(neueZeileBtn);
    zeileEl.appendChild(toolbarEl);

    container.appendChild(zeileEl);

    const api = mountZeile(inhaltEl, { istErste, vorherigerZustand: vorherigerZustand ?? null }) ?? {};

    const eintrag = { el: zeileEl, rahmenEl, inhaltEl, api, kompakt: false };

    neueZeileBtn.addEventListener('click', () => {
      kompaktSchalten(eintrag);
      const zustand = typeof api.kopiereZustand === 'function' ? api.kopiereZustand() : null;
      const neuerEintrag = baueZeile(zustand, false);
      zeileEl.after(neuerEintrag.el);
      const idx = zeilen.indexOf(eintrag);
      zeilen.splice(idx + 1, 0, neuerEintrag);
    });

    return eintrag;
  }

  const erste = baueZeile(null, true);
  zeilen.push(erste);

  return {
    getZeilen: () => zeilen.map((z) => z.api),
  };
}
