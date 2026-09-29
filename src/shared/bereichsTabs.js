/**
 * Wiederverwendbarer Tab-Umschalter für einen Bereich (z. B. "Erklärungen",
 * "Terme", "Funktionen") mit mehreren Unterpunkten. Unterpunkte OHNE
 * `mount`-Funktion gelten als noch nicht umgesetzt und werden deaktiviert
 * angezeigt (die Navigation ist schon vorbereitet, der Inhalt kommt in
 * einer späteren Ausbaustufe) – genau wie zuvor auf der obersten Ebene.
 *
 * @param {HTMLElement} container Ziel-Element, wird komplett befüllt.
 * @param {{
 *   titel: string,
 *   eintraege: {id:string, titel:string, mount?: (el: HTMLElement) => void}[],
 *   tabsKlasse?: string,
 * }} opts
 */
export function erzeugeBereichsTabs(container, { titel, eintraege, tabsKlasse = 'bereich-tabs' }) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <h2 class="modul-titel">${titel}</h2>
    <div class="${tabsKlasse}" role="tablist"></div>
    <div class="bereich-inhalt"></div>
  `);

  const tabsEl = container.querySelector(`.${tabsKlasse}`);
  const inhaltEl = container.querySelector('.bereich-inhalt');

  function zeige(eintrag) {
    tabsEl.querySelectorAll('.ansicht-tab').forEach((btn) => {
      const aktiv = btn.dataset.id === eintrag.id;
      btn.classList.toggle('ansicht-tab--aktiv', aktiv);
      btn.setAttribute('aria-selected', String(aktiv));
    });
    eintrag.mount?.(inhaltEl);
  }

  for (const eintrag of eintraege) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ansicht-tab';
    btn.dataset.id = eintrag.id;
    btn.setAttribute('role', 'tab');
    btn.textContent = eintrag.titel;
    const verfuegbar = Boolean(eintrag.mount);
    btn.disabled = !verfuegbar;
    btn.title = verfuegbar ? '' : 'Noch nicht umgesetzt';
    btn.addEventListener('click', () => zeige(eintrag));
    tabsEl.appendChild(btn);
  }

  const erstesVerfuegbares = eintraege.find((e) => e.mount);
  if (erstesVerfuegbares) zeige(erstesVerfuegbares);
}
