import { mountErklaerungenBereich } from './modules/erklaerungen/module.js';
import { mountTermeBereich } from './modules/terme/module.js';
import { mountGleichungenBereich } from './modules/gleichungen/module.js';
import { mountFunktionenBereich } from './modules/funktionen/module.js';

/**
 * Oberste Navigationsebene der Lernumgebung: vier Reiter, die jeweils nach
 * Aufgabentyp weiter unterteilt sind (siehe die einzelnen module.js-Dateien
 * unter src/modules/*):
 * - Erklärungen: vorgegebene Rechnung Schritt für Schritt (nach Operation)
 * - Terme: freie Übungsfläche zum eigenständigen Legen eines Terms (nach Grad: linear/quadratisch)
 * - Gleichungen: dieselbe freie Übungsfläche, aber für zwei Seiten einer Gleichung (nach Grad: linear/quadratisch)
 * - Funktionen: (Ausbaustufe, noch nicht umgesetzt)
 */
const BEREICHE = [
  { id: 'erklaerungen', titel: 'Erklärungen', mount: mountErklaerungenBereich },
  { id: 'terme', titel: 'Terme', mount: mountTermeBereich },
  { id: 'gleichungen', titel: 'Gleichungen', mount: mountGleichungenBereich },
  { id: 'funktionen', titel: 'Funktionen', mount: mountFunktionenBereich },
];

function renderNav(navEl, contentEl) {
  navEl.innerHTML = '';
  for (const bereich of BEREICHE) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = bereich.titel;
    button.className = 'nav__item';
    button.dataset.id = bereich.id;
    button.addEventListener('click', () => {
      navEl.querySelectorAll('.nav__item').forEach((b) => b.classList.remove('nav__item--aktiv'));
      button.classList.add('nav__item--aktiv');
      bereich.mount(contentEl);
    });
    navEl.appendChild(button);
  }
}

function init() {
  const navEl = document.querySelector('#modul-nav');
  const contentEl = document.querySelector('#modul-content');
  renderNav(navEl, contentEl);

  navEl.querySelector('.nav__item')?.classList.add('nav__item--aktiv');
  BEREICHE[0].mount(contentEl);
}

document.addEventListener('DOMContentLoaded', init);
