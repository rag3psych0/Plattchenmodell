import { mountNormalformZuScheitelform } from './normalformZuScheitelform.js';

/**
 * Innerer Tab-Umschalter unter "Funktionen > Parabeln" (Runde 21, Punkt 10)
 * – bislang ein einzelner Unterpunkt ("Normalform zu Scheitelform"), aber
 * bewusst als erweiterbare Liste aufgebaut (spiegelt dasselbe Muster wie
 * modules/gleichungen/uebungsAnsichten.js), damit spätere Ergänzungen (z. B.
 * "Scheitelform zu Normalform") sich ohne strukturelle Änderung ergänzen
 * lassen.
 *
 * @param {HTMLElement} container
 */
export function mountParabeln(container) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <div class="ansicht-tabs" role="tablist"></div>
    <div class="ansicht-inhalt"></div>
  `);

  const ANSICHTEN = [
    { id: 'normalform-zu-scheitelform', titel: 'Normalform zu Scheitelform', mount: mountNormalformZuScheitelform },
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
