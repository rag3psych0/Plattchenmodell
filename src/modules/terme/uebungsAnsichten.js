import { mountSandbox } from './sandbox.js';
import { mountPlaettchenZuTerm } from './plaettchenZuTerm.js';
import { mountTermZuPlaettchen } from './termZuPlaettchen.js';

/**
 * Innerer Tab-Umschalter mit drei Übungsansichten – wiederverwendet für
 * "Linear" und "Quadratisch" (siehe src/modules/terme/module.js), jeweils
 * mit einer eigenen, über `typen` eingeschränkten Auswahl:
 * - "Sandbox": freies Legen ohne Vorgabe (bisherige "Terme"-Ansicht).
 * - "Plättchen zu Term": Plättchen auslegen, den abgelesenen Term eintragen.
 * - "Term zu Plättchen": zuerst einen Term eintragen, dann dazu passende
 *   Plättchen auslegen.
 * Beide Eingabe-Ansichten prüfen auf Knopfdruck ("Überprüfen") dieselbe
 * Sache – Übereinstimmung zwischen Eingabe und tatsächlichem Term –, nur in
 * umgekehrter Reihenfolge von Eingabe und Handlung.
 *
 * @param {HTMLElement} container
 * @param {{typen?: {kind:string, sign:1|-1}[]}} [opts]
 */
export function mountUebungsAnsichten(container, opts = {}) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <div class="ansicht-tabs" role="tablist"></div>
    <div class="ansicht-inhalt"></div>
  `);

  const ANSICHTEN = [
    { id: 'sandbox', titel: 'Sandbox', mount: (el) => mountSandbox(el, opts) },
    { id: 'plaettchen-zu-term', titel: 'Plättchen zu Term', mount: (el) => mountPlaettchenZuTerm(el, opts) },
    { id: 'term-zu-plaettchen', titel: 'Term zu Plättchen', mount: (el) => mountTermZuPlaettchen(el, opts) },
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
