import { mountGleichungenSandbox } from './sandbox.js';
import { mountPlaettchenZuGleichung } from './plaettchenZuGleichung.js';
import { mountGleichungZuPlaettchen } from './gleichungZuPlaettchen.js';

/**
 * Innerer Tab-Umschalter mit drei Übungsansichten – wiederverwendet für
 * "Linear" und "Quadratisch" unter dem Reiter "Gleichungen" (siehe
 * src/modules/gleichungen/module.js), jeweils mit einer eigenen, über
 * `typen` eingeschränkten Auswahl. Spiegelt exakt die Struktur von
 * src/modules/terme/uebungsAnsichten.js, nur mit je zwei freien Flächen
 * (links/rechts einer Gleichung) statt einer einzelnen.
 *
 * @param {HTMLElement} container
 * @param {{typen?: {kind:string, sign:1|-1}[]}} [opts]
 */
export function mountGleichungenUebungsAnsichten(container, opts = {}) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <div class="ansicht-tabs" role="tablist"></div>
    <div class="ansicht-inhalt"></div>
  `);

  const ANSICHTEN = [
    { id: 'sandbox', titel: 'Sandbox', mount: (el) => mountGleichungenSandbox(el, opts) },
    { id: 'plaettchen-zu-gleichung', titel: 'Plättchen zu Gleichung', mount: (el) => mountPlaettchenZuGleichung(el, opts) },
    { id: 'gleichung-zu-plaettchen', titel: 'Gleichung zu Plättchen', mount: (el) => mountGleichungZuPlaettchen(el, opts) },
  ];

  const tabsEl = container.querySelector('.ansicht-tabs');
  const inhaltEl = container.querySelector('.ansicht-inhalt');

  function zeigeAnsicht(ansicht) {
    tabsEl.querySelectorAll('.ansicht-tab').forEach((btn) => {
      const aktiv = btn.dataset.id === ansicht.id;
      btn.classList.toggle('ansicht-tab--aktiv', aktiv);
      btn.setAttribute('aria-selected', String(aktiv));
    });
    ansicht.mount(inhaltEl);
  }

  for (const ansicht of ANSICHTEN) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ansicht-tab';
    btn.dataset.id = ansicht.id;
    btn.setAttribute('role', 'tab');
    btn.textContent = ansicht.titel;
    btn.addEventListener('click', () => zeigeAnsicht(ansicht));
    tabsEl.appendChild(btn);
  }

  zeigeAnsicht(ANSICHTEN[0]);
}
