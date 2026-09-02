import { mountAdditionSubtraktion } from './modules/addition-subtraktion/module.js';

/**
 * Modul-Registry. Weitere Themen (Phase 3-5) werden hier einfach ergänzt,
 * sobald sie fertig sind – die Navigation und der App-Rahmen ändern sich
 * dafür nicht.
 */
const MODULES = [
  {
    id: 'addition-subtraktion',
    titel: 'Addition & Subtraktion',
    mount: mountAdditionSubtraktion,
    verfuegbar: true,
  },
  { id: 'multiplikation-division', titel: 'Multiplikation & Division', verfuegbar: false },
  { id: 'lineare-terme', titel: 'Lineare Terme', verfuegbar: false },
  { id: 'quadratische-terme', titel: 'Quadratische Terme & Ergänzung', verfuegbar: false },
];

function renderNav(navEl, contentEl) {
  navEl.innerHTML = '';
  for (const modul of MODULES) {
    const button = document.createElement('button');
    button.textContent = modul.titel;
    button.className = 'nav__item';
    button.disabled = !modul.verfuegbar;
    button.title = modul.verfuegbar ? '' : 'Noch nicht umgesetzt';
    button.addEventListener('click', () => {
      navEl.querySelectorAll('.nav__item').forEach((b) => b.classList.remove('nav__item--aktiv'));
      button.classList.add('nav__item--aktiv');
      modul.mount(contentEl);
    });
    navEl.appendChild(button);
  }
}

function init() {
  const navEl = document.querySelector('#modul-nav');
  const contentEl = document.querySelector('#modul-content');
  renderNav(navEl, contentEl);

  const erstesVerfuegbares = MODULES.find((m) => m.verfuegbar);
  if (erstesVerfuegbares) {
    navEl.querySelector('.nav__item')?.classList.add('nav__item--aktiv');
    erstesVerfuegbares.mount(contentEl);
  }
}

document.addEventListener('DOMContentLoaded', init);
