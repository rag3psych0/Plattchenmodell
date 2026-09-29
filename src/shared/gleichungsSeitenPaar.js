import { createFreieTafel } from './freieTafel.js';
import { createPalette, ALLE_TYPEN } from './palette.js';
import { termAusBoard } from '../engine/term.js';
import { erzeugeUndoSpeicher } from './undo.js';
import { verdrahteTermToggle } from './freieFlaeche.js';
import { createMalkreuzGruppe } from './andockRaster.js';

/**
 * Ein einzelnes Gleichungs-Paar (linke Seite | "=" | rechte Seite,
 * nebeneinander) mit GEMEINSAMER Auswahl (Palette) für beide Seiten: ein
 * Klick auf eine Seite macht sie zur "aktiven" Seite, auf die sich
 * "Plättchen hinzufügen"/"Nullpaar erzeugen"/"Fläche leeren" beziehen –
 * dieselbe UI-Mechanik wie die Gleichungen-Sandbox (shared/gleichungsKette.js,
 * dort ausführlich begründet), aber bewusst OHNE deren
 * Äquivalenzumformungs-Werkzeug ("Auf beide Seiten anwenden") und ohne deren
 * Mehr-Zeilen-Verkettung (Rechenschritte) – hier gibt es nur EIN Paar Seiten,
 * da es sich um eine reine Übersetzungs-Übung handelt (Plättchen <-> Text),
 * kein Gleichungslösen.
 *
 * Runde 21 (Punkt 4, Nutzer-Vorgabe): "So wie du die Sandbox aufgebaut hast
 * mit Gleichungen nebeneinander, nur ein Auswahlkasten und anklicken auf
 * welcher was passieren soll usw., so baue auch Plättchen zu Gleichung und
 * Gleichung zu Plättchen auf." Ersetzt die bis dahin verwendeten ZWEI
 * unabhängigen `erzeugeFreieFlaeche`-Instanzen (je eine eigene Auswahl pro
 * Seite) in `modules/gleichungen/plaettchenZuGleichung.js` und
 * `modules/gleichungen/gleichungZuPlaettchen.js`.
 *
 * @param {HTMLElement} container
 * @param {{typen?: {kind:string,sign:1|-1}[], initialLinks?: {kind:string,sign:1|-1}[], initialRechts?: {kind:string,sign:1|-1}[]}} [opts]
 * @returns {{
 *   links: {tafel: {board: import('../engine/board.js').Board, addTile: Function, addTiles: Function, addZeroPair: Function, clear: Function, render: Function}},
 *   rechts: {tafel: {board: import('../engine/board.js').Board, addTile: Function, addTiles: Function, addZeroPair: Function, clear: Function, render: Function}},
 *   getAktiveSeite: () => 'links'|'rechts'|null,
 * }}
 */
export function erzeugeGleichungsSeitenPaar(container, opts = {}) {
  const typen = opts.typen ?? ALLE_TYPEN;

  container.innerHTML = '';
  container.classList.add('bearbeiten-layout', 'gleichungs-kette-layout');
  container.insertAdjacentHTML('beforeend', `
    <div class="palette-spalte">
      <h3>Auswahl</h3>
      <div class="palette"></div>
      <button type="button" class="hinzufuegen-btn">Plättchen hinzufügen</button>
      <button type="button" class="nullpaar-btn">Nullpaar erzeugen</button>
      <button type="button" class="malkreuz-toggle-btn malkreuz-toggle-btn--klein gsp-malkreuz-toggle-btn" aria-expanded="false">Malkreuz anzeigen</button>
      <button type="button" class="leeren-btn">Fläche leeren</button>
    </div>
    <div class="gleichungs-kette-spalte">
      <div class="freie-flaeche__kopf gleichungs-kette__zeile-kopf">
        <h4 class="gleichungs-kette__zeile-titel">Gleichung</h4>
        <button type="button" class="rueckgaengig-btn" disabled>↶ Rückgängig</button>
      </div>
      <div class="gleichung-bereich gleichungs-kette__zeile gsp-zeile"></div>
      <button type="button" class="term-toggle-btn gleichung-toggle-btn">Gleichung anzeigen</button>
      <div class="term-anzeige term-anzeige--gleichung">
        <span class="term-anzeige__label">Dargestellte Gleichung</span>
        <span class="term-anzeige__wert gsp-gesamt">0 = 0</span>
      </div>
      <div class="malkreuz-host gsp-malkreuz-host" hidden></div>
    </div>
  `);

  const zeileEl = container.querySelector('.gsp-zeile');
  const rueckgaengigBtn = container.querySelector('.rueckgaengig-btn');
  const gesamtEl = container.querySelector('.gsp-gesamt');

  verdrahteTermToggle(container.querySelector('.term-toggle-btn'), container.querySelector('.term-anzeige'), {
    textAnzeigen: 'Gleichung anzeigen',
    textVerbergen: 'Gleichung verbergen',
  });

  // EIN gemeinsamer Undo-Speicher für BEIDE Seiten (analog zu einer Zeile in
  // shared/gleichungsKette.js bzw. zu einer ganzen Fläche in
  // shared/freieFlaeche.js).
  const undo = erzeugeUndoSpeicher({ onChange: (n) => { rueckgaengigBtn.disabled = n === 0; } });
  rueckgaengigBtn.addEventListener('click', () => undo.rueckgaengig());

  let linksTerm = '0';
  let rechtsTerm = '0';
  function aktualisiereGesamt() {
    gesamtEl.textContent = `${linksTerm} = ${rechtsTerm}`;
  }

  let aktiveSeite = null; // 'links' | 'rechts'

  function markiereAktiveSeite() {
    links.seiteEl.classList.toggle('gleichungs-kette__seite--aktiv', aktiveSeite === 'links');
    rechts.seiteEl.classList.toggle('gleichungs-kette__seite--aktiv', aktiveSeite === 'rechts');
  }

  function setzeAktiveSeite(seite) {
    aktiveSeite = seite;
    markiereAktiveSeite();
  }

  function aktiveTafel() {
    if (!aktiveSeite) return null;
    return aktiveSeite === 'links' ? links.tafel : rechts.tafel;
  }

  /** Baut EINE Seite (links oder rechts): freie Tafel + Klick-Aktivierung. */
  function baueSeite(seiteName, titel, onTermChange) {
    const seiteEl = document.createElement('div');
    seiteEl.className = `gleichung-seite gleichung-seite--${seiteName} gleichungs-kette__seite`;
    seiteEl.insertAdjacentHTML('beforeend', `<h4>${titel}</h4><div class="freie-tafel"></div>`);
    zeileEl.appendChild(seiteEl);

    const tafelEl = seiteEl.querySelector('.freie-tafel');
    const hinweisPEl = document.createElement('p');
    hinweisPEl.className = 'freie-tafel__hinweis';
    hinweisPEl.textContent = 'Noch keine Plättchen – über die Auswahl hinzufügen.';
    tafelEl.appendChild(hinweisPEl);

    const tafel = createFreieTafel(tafelEl, {
      undo,
      onChange(board) {
        hinweisPEl.style.display = board.tiles.length === 0 ? '' : 'none';
        onTermChange(termAusBoard(board.tiles));
      },
    });

    seiteEl.addEventListener('pointerdown', () => setzeAktiveSeite(seiteName), { capture: true });

    return { seiteEl, tafelEl, tafel };
  }

  const links = baueSeite('links', 'Linke Seite', (term) => { linksTerm = term; aktualisiereGesamt(); });

  const gleichEl = document.createElement('span');
  gleichEl.className = 'gleichung-istgleich gleichungs-kette__gleich';
  gleichEl.textContent = '=';
  gleichEl.setAttribute('aria-hidden', 'true');
  zeileEl.appendChild(gleichEl);

  const rechts = baueSeite('rechts', 'Rechte Seite', (term) => { rechtsTerm = term; aktualisiereGesamt(); });

  setzeAktiveSeite('links');

  // --- Malkreuz: EIN Werkzeug für das ganze Paar, gebunden an die jeweils
  // aktive Seite (identisch zum Vorgehen in shared/gleichungsKette.js). ---
  // Runde 21 (Punkt 8/9): `createMalkreuzGruppe` statt eines einzelnen
  // `createAndockRasterUI` – siehe shared/andockRaster.js. "Anwenden"
  // überträgt die Produkt-Plättchen auf die AKTIVE Seite.
  const malkreuzToggleBtn = container.querySelector('.gsp-malkreuz-toggle-btn');
  const malkreuzHostEl = container.querySelector('.gsp-malkreuz-host');
  let malkreuzGruppe = null;
  malkreuzToggleBtn.addEventListener('click', () => {
    const sichtbar = malkreuzHostEl.hidden;
    if (sichtbar && !malkreuzGruppe) {
      malkreuzGruppe = createMalkreuzGruppe(malkreuzHostEl, {
        zeilenLabel: 'ein Faktor',
        spaltenLabel: 'anderer Faktor',
        undo,
        aufAnwenden(tiles) { aktiveTafel()?.addTiles(tiles); },
      });
    }
    malkreuzHostEl.hidden = !sichtbar;
    malkreuzToggleBtn.textContent = sichtbar ? 'Malkreuz verbergen' : 'Malkreuz anzeigen';
    malkreuzToggleBtn.setAttribute('aria-expanded', String(sichtbar));
  });

  // --- gemeinsame Auswahl (Palette) für beide Seiten ---
  const palette = createPalette(container.querySelector('.palette'), {
    typen,
    onDrop(typ, punkt) {
      if (malkreuzGruppe && !malkreuzHostEl.hidden && malkreuzGruppe.versucheAblegen(typ, punkt)) return;
      for (const [seiteName, eintrag] of [['links', links], ['rechts', rechts]]) {
        const rect = eintrag.tafelEl.getBoundingClientRect();
        const innerhalb = punkt.clientX >= rect.left && punkt.clientX <= rect.right
          && punkt.clientY >= rect.top && punkt.clientY <= rect.bottom;
        if (!innerhalb) continue;
        setzeAktiveSeite(seiteName);
        eintrag.tafel.addTile(typ.kind, typ.sign, {
          punktRelativ: { x: punkt.clientX - rect.left, y: punkt.clientY - rect.top },
        });
        return;
      }
    },
  });

  container.querySelector('.hinzufuegen-btn').addEventListener('click', () => {
    const typ = palette.getAusgewaehlt();
    aktiveTafel()?.addTile(typ.kind, typ.sign);
  });
  container.querySelector('.nullpaar-btn').addEventListener('click', () => {
    aktiveTafel()?.addZeroPair(palette.getAusgewaehlt().kind);
  });
  container.querySelector('.leeren-btn').addEventListener('click', () => {
    aktiveTafel()?.clear();
  });

  if (opts.initialLinks?.length) links.tafel.addTiles(opts.initialLinks);
  if (opts.initialRechts?.length) rechts.tafel.addTiles(opts.initialRechts);
  // Das Übernehmen einer Vorgabe ist kein eigener Nutzer-Schritt (analog zu
  // shared/freieFlaeche.js/shared/gleichungsKette.js).
  undo.leeren();

  return {
    links: { tafel: links.tafel },
    rechts: { tafel: rechts.tafel },
    getAktiveSeite: () => aktiveSeite,
  };
}
