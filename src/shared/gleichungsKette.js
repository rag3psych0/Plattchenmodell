import { createFreieTafel } from './freieTafel.js';
import { createPalette, ALLE_TYPEN } from './palette.js';
import { termAusBoard } from '../engine/term.js';
import { erzeugeUndoSpeicher } from './undo.js';
import { verdrahteTermToggle } from './freieFlaeche.js';
import { createMalkreuzGruppe } from './andockRaster.js';
import { wendeAufBeideSeitenAn, formatiereOperation, GLEICHUNG_MAX_FAKTOR } from '../engine/gleichungen.js';

/**
 * "Gleichungs-Kette" (Runde 19, Nutzer-Vorgabe): die Sandbox-Ansicht für
 * Gleichungen erweitert um Äquivalenzumformungen. Zeigt eine oder mehrere
 * "Zeilen" (jede Zeile = linke Seite | "=" | rechte Seite, räumlich
 * getrennt, das Gleichheitszeichen dauerhaft sichtbar – Nutzer-Vorgabe
 * Punkt 1/2), darunter ein Umformungs-Werkzeug "Auf beide Seiten anwenden".
 *
 * Anders als die gespiegelte Verkettung der freien Terme-Fläche (siehe
 * shared/freieFlaeche.js, Runde 17: ALLE Zeilen einer Gruppe zeigen
 * IMMER denselben Zustand) sind die Zeilen hier bewusst UNABHÄNGIG
 * voneinander – wie die ältere shared/zeilenkette.js: eine Umformung
 * erzeugt eine NEUE Zeile mit dem transformierten Zustand, die ab da
 * eigenständig weiterbearbeitet werden kann (z. B. um dort Nullpaare
 * aufzulösen), OHNE die Zeile darüber (die vorherige Rechenstufe) im
 * Nachhinein zu verändern. Das entspricht der Nutzer-Vorgabe: "Eine
 * Änderung auf einer Seite soll NICHT automatisch die andere Seite
 * verändern" UND "daraus entsteht eine neue Zeile" – jede Zeile ist ein
 * eigener, für sich nachvollziehbarer Rechenschritt.
 *
 * Jede Zeile hat trotzdem eine gemeinsame Auswahl (Palette) mit der ganzen
 * Kette, damit auf JEDER (auch einer älteren) Zeile weitergearbeitet werden
 * kann – ein Klick auf eine Seite einer Zeile macht sie zur "aktiven"
 * Seite, auf die sich "Plättchen hinzufügen"/"Nullpaar erzeugen"/"Fläche
 * leeren" beziehen (dasselbe Konzept wie `aktiverEintrag` in
 * shared/freieFlaeche.js, hier auf (Zeile, Seite)-Paare erweitert). Jede
 * Zeile trägt ihren EIGENEN "Rückgängig"-Knopf (wie bei den Zeilen von
 * "Klammern multiplizieren", shared/zeilenkette.js – Rückgängig macht
 * bewusst nicht zeilenübergreifend etwas rückgängig, da Zeilen eigenständige
 * Rechenschritte sind).
 *
 * "Auf beide Seiten anwenden" wirkt immer auf die ZULETZT erzeugte Zeile
 * (die "aktuelle" Rechenstufe) und hängt bei Erfolg eine neue Zeile mit dem
 * Ergebnis an – bei einer nicht aufgehenden Division wird STATTDESSEN ein
 * erklärender Hinweistext angezeigt, keine neue Zeile erzeugt (Nutzer-
 * Vorgabe Punkt 3: "Erklärender Hinweistext").
 *
 * Runde 20 (Nutzer-Rückmeldung Punkt 6) erweitert "Auf beide Seiten
 * anwenden" um drei Dinge:
 *
 * (a) WARTESCHLANGE statt Sofort-Anwendung: ein Klick auf einen Addieren-/
 *     Multiplizieren-/Dividieren-Baustein wendet die Operation NICHT mehr
 *     sofort an, sondern reiht sie nur in eine sichtbare Warteschlange ein
 *     (mit eigenem Entfernen-Knopf je Eintrag). Erst der Knopf
 *     "Jetzt anwenden" führt ALLE wartenden Operationen NACHEINANDER aus
 *     (`wendeAufBeideSeitenAn`-Ergebnisse werden verkettet als Eingabe der
 *     jeweils nächsten Operation verwendet) und erzeugt dabei GENAU EINE
 *     neue Zeile mit dem kombinierten Endergebnis – Nutzer-Vorgabe: "man
 *     muss mehrere Sachen machen dürfen ... und dann ein Button für jetzt
 *     anwenden", explizit beantwortet mit "eine kombinierte Zeile" (nicht
 *     eine Zeile je Einzel-Operation). Schlägt eine der wartenden
 *     Operationen fehl (z. B. nicht aufgehende Division), wird abgebrochen,
 *     ein Hinweistext gezeigt UND die Warteschlange bleibt zur Korrektur
 *     erhalten (nichts wird verworfen) – es entsteht in diesem Fall keine
 *     neue Zeile.
 *
 * (b) MALKREUZ: dieselbe Andock-Geste wie in shared/freieFlaeche.js (siehe
 *     dort für die volle Begründung) steht jetzt auch hier als Werkzeug zur
 *     Verfügung – Nutzer-Vorgabe: "Es fehlt auch noch das Malkreuz". Es gibt
 *     bewusst NUR EIN Malkreuz für die ganze Kette (kein eigenes je Zeile/
 *     Seite), dessen Rückgängig-Aktionen aber in den Undo-Speicher der
 *     jeweils GERADE AKTIVEN Seite (siehe `aktiveSeite`) einfließen – Nutzer-
 *     Antwort auf die Rückfrage "an welche Seite ist das Malkreuz gebunden":
 *     "auf die aktive Seite". Wie bei freieFlaeche.js schreibt das Malkreuz
 *     dabei keine Plättchen automatisch in eine Tafel – es ist ein
 *     eigenständiges Rechen-/Veranschaulichungswerkzeug, dessen Ergebnis die
 *     Schülerin/der Schüler bei Bedarf selbst in eine Seite überträgt.
 *
 * (c) NEBENEINANDER statt gestapelt: `.gleichungs-kette__zeile` ordnet linke
 *     und rechte Seite jetzt (ab einer Mindestbreite) nebeneinander an,
 *     jede Seite dafür entsprechend schmaler (siehe styles/main.css) –
 *     Nutzer-Vorgabe: "die linke Seite und Rechte Seite auch wirklich links
 *     und Rechts voneinander stehen. Verkleinere dafür die
 *     Bearbeitungsfläche, sodass sie auch nebeneinander passen."
 *
 * @param {HTMLElement} container
 * @param {{typen?: {kind:string,sign:1|-1}[], initialLinks?: {kind:string,sign:1|-1}[], initialRechts?: {kind:string,sign:1|-1}[]}} [opts]
 */
export function erzeugeGleichungsKette(container, opts = {}) {
  const typen = opts.typen ?? ALLE_TYPEN;
  const mitQuadrat = typen.some((t) => t.kind === 'x2');

  container.innerHTML = '';
  container.classList.add('bearbeiten-layout', 'gleichungs-kette-layout');
  // Runde 21 (Nutzer-Rückmeldung Punkt 5): Der Auslöse-Knopf "Malkreuz
  // anzeigen" steht seither in der schmalen Auswahl-Spalte direkt unter
  // "Nullpaar erzeugen" statt (wie in Runde 20) am Ende der breiten
  // Gleichungs-Kette-Spalte. Der eigentliche Panel-Host (`.gk-malkreuz-host`)
  // bleibt an seiner bisherigen Position in der breiten Spalte, da dort der
  // horizontale Platz für die Kreuz-Geometrie zur Verfügung steht (vgl.
  // dieselbe Abwägung in shared/freieFlaeche.js).
  container.insertAdjacentHTML('beforeend', `
    <div class="palette-spalte">
      <h3>Auswahl</h3>
      <div class="palette"></div>
      <button type="button" class="hinzufuegen-btn">Plättchen hinzufügen</button>
      <button type="button" class="nullpaar-btn">Nullpaar erzeugen</button>
      <button type="button" class="malkreuz-toggle-btn malkreuz-toggle-btn--klein gk-malkreuz-toggle-btn" aria-expanded="false">Malkreuz anzeigen</button>
      <button type="button" class="leeren-btn">Fläche leeren</button>
    </div>
    <div class="gleichungs-kette-spalte">
      <div class="gleichungs-kette__zeilen"></div>
      <div class="gleichungs-kette__umformung">
        <h3>Auf beide Seiten anwenden</h3>
        <p class="gleichungs-kette__umformung-hinweis-text">Wähle eine oder mehrere Umformungen aus – sie reihen sich unten in die Warteschlange ein. "Jetzt anwenden" führt alle wartenden Umformungen gemeinsam aus und erzeugt eine neue Zeile darunter.</p>
        <div class="gleichungs-kette__umformung-addieren"></div>
        <div class="gleichungs-kette__umformung-faktor">
          <label for="gk-faktor">Faktor</label>
          <input id="gk-faktor" type="number" class="gk-faktor-input" value="2" min="2" max="${GLEICHUNG_MAX_FAKTOR}" step="1">
          <button type="button" class="gk-mult-btn">· multiplizieren</button>
          <button type="button" class="gk-div-btn">: dividieren</button>
        </div>
        <div class="gk-warteschlange-bereich">
          <p class="gk-warteschlange-hinweis">Noch keine Umformung ausgewählt.</p>
          <ul class="gk-warteschlange"></ul>
          <button type="button" class="gk-anwenden-btn" disabled>Jetzt anwenden</button>
        </div>
        <p class="gk-umformung-hinweis" role="status" aria-live="polite"></p>
      </div>
      <div class="malkreuz-host gk-malkreuz-host" hidden></div>
    </div>
  `);

  const zeilenEl = container.querySelector('.gleichungs-kette__zeilen');
  const hinweisEl = container.querySelector('.gk-umformung-hinweis');
  const faktorInput = container.querySelector('.gk-faktor-input');
  const warteschlangeListeEl = container.querySelector('.gk-warteschlange');
  const warteschlangeHinweisEl = container.querySelector('.gk-warteschlange-hinweis');
  const anwendenBtn = container.querySelector('.gk-anwenden-btn');

  const zeilen = []; // { wrapperEl, links: {tafelEl, board, addTile, addZeroPair, clear}, rechts: {...}, gesamtEl }
  let aktiveSeite = null; // { zeile, seite: 'links'|'rechts' }
  // Runde 21 (Nutzer-Rückmeldung Punkt 11): "Bei mehreren Bearbeitungsflächen
  // sollen neu hinzugefügte Auswahlplättchen auf einer Fläche auch auf den
  // entsprechenden anderen Flächen erscheinen – auf Nachfrage ausdrücklich
  // auch bei der Gleichungs-Kette." Anders als bei shared/freieFlaeche.js
  // (dort sind ALLE Flächen einer Gruppe IMMER wertgleich) bleiben die
  // Zeilen hier aber weiterhin eigenständige Rechenschritte (siehe Datei-
  // Kommentar oben) – synchronisiert wird deshalb NICHT der komplette
  // Zustand, sondern nur die Geste "frei hinzugefügtes Plättchen" (Palette-
  // Knopf oder Ziehen): sie wird auf dieselbe Seite (links↔links,
  // rechts↔rechts) ALLER ANDEREN Zeilen übertragen. Zwei Ausnahmen bewusst
  // NICHT synchronisiert: (a) eine rein lokale Nullpaar-Bildung/-Auflösung
  // oder Stapel-Umsortierung (`details.sync === false`, siehe
  // shared/freieTafel.js) bleibt lokal – dieselbe Ausnahme wie bei
  // freieFlaeche.js; (b) die INITIALE Befüllung einer Zeile beim Aufbau
  // (Start-Zeile ODER das per "Jetzt anwenden" berechnete Ergebnis einer
  // Umformung, siehe `baueZeile`) ist kein Nutzer-"Hinzufügen"-Schritt und
  // darf ältere Zeilen nicht nachträglich verändern – dafür sorgt der
  // Wächter `zeilenAufbauAktiv`. `istAmZeilenSynchronisieren` verhindert wie
  // bei `synchronisiereMitGruppe` eine Endlosschleife, da das `render()`
  // einer Zielseite wiederum deren `onChange` auslöst.
  let zeilenAufbauAktiv = false;
  let istAmZeilenSynchronisieren = false;

  function markiereAktiveSeite() {
    for (const zeile of zeilen) {
      zeile.links.seiteEl.classList.toggle('gleichungs-kette__seite--aktiv', aktiveSeite?.zeile === zeile && aktiveSeite?.seite === 'links');
      zeile.rechts.seiteEl.classList.toggle('gleichungs-kette__seite--aktiv', aktiveSeite?.zeile === zeile && aktiveSeite?.seite === 'rechts');
    }
  }

  function setzeAktiveSeite(zeile, seite) {
    aktiveSeite = { zeile, seite };
    markiereAktiveSeite();
  }

  function aktiveTafel() {
    if (!aktiveSeite) return null;
    return aktiveSeite.zeile[aktiveSeite.seite];
  }

  /**
   * Überträgt `neueKacheln` (roh, OHNE eigenen Undo-Eintrag – das Spiegeln
   * selbst ist kein zusätzlicher Nutzer-Schritt) auf DIESELBE Seite aller
   * ÜBRIGEN Zeilen. Anders als `synchronisiereMitGruppe` in
   * shared/freieFlaeche.js wird NICHT der komplette Zustand der Quelle
   * gespiegelt (Board leeren + neu aufbauen) – das würde die eigenständigen
   * Zeilen-Inhalte der übrigen Zeilen überschreiben, die ja (anders als bei
   * freieFlaeche.js) bewusst UNTERSCHIEDLICH bleiben dürfen/sollen (siehe
   * Datei-Kommentar). Stattdessen wird NUR die tatsächlich neu
   * hinzugekommene Kachel-Menge zusätzlich auf die übrigen Zeilen aufgelegt
   * (siehe `onChange`-Aufrufer unten, der per Id-Differenz genau diese Menge
   * ermittelt).
   */
  function synchronisiereNeueKacheln(quellZeile, quellSeiteName, neueKacheln) {
    if (istAmZeilenSynchronisieren || neueKacheln.length === 0) return;
    istAmZeilenSynchronisieren = true;
    try {
      for (const zeile of zeilen) {
        if (zeile === quellZeile) continue;
        const zielEintrag = zeile[quellSeiteName];
        for (const t of neueKacheln) {
          zielEintrag.tafel.board.add(t.kind, t.sign, 1);
        }
        zielEintrag.tafel.render();
      }
    } finally {
      istAmZeilenSynchronisieren = false;
    }
  }

  /** Baut EINE Seite (links oder rechts) einer Zeile: freie Tafel + Gleichung-Anzeige-Beitrag. `undo` ist der bereits fertige, für die GANZE Zeile gemeinsame Undo-Speicher. */
  function baueSeite(zeileWrapperEl, seiteName, titel, onTermChange, undo) {
    const seiteEl = document.createElement('div');
    seiteEl.className = `gleichung-seite gleichung-seite--${seiteName} gleichungs-kette__seite`;
    seiteEl.insertAdjacentHTML('beforeend', `<h4>${titel}</h4><div class="freie-tafel"></div>`);
    zeileWrapperEl.appendChild(seiteEl);

    const tafelEl = seiteEl.querySelector('.freie-tafel');
    const hinweisPEl = document.createElement('p');
    hinweisPEl.className = 'freie-tafel__hinweis';
    hinweisPEl.textContent = 'Noch keine Plättchen – über die Auswahl hinzufügen.';
    tafelEl.appendChild(hinweisPEl);

    const eintrag = { seiteEl, tafelEl };

    // Runde 21 (Punkt 11): welche Kacheln (per Id) VOR dem jeweils letzten
    // `onChange` bereits vorhanden waren – der Vergleich mit dem aktuellen
    // Bestand liefert genau die NEU hinzugekommenen Kacheln (siehe
    // `synchronisiereNeueKacheln` oben). Wird bei JEDEM `onChange`
    // aktualisiert, auch wenn dabei nichts synchronisiert wird (z. B.
    // während `zeilenAufbauAktiv`), damit die nächste Differenzbildung
    // wieder korrekt ist.
    let vorherigeIds = new Set();

    const tafel = createFreieTafel(tafelEl, {
      undo,
      onChange(board, details) {
        hinweisPEl.style.display = board.tiles.length === 0 ? '' : 'none';
        if (details?.sync !== false && !zeilenAufbauAktiv && !istAmZeilenSynchronisieren) {
          const neueKacheln = board.tiles.filter((t) => !vorherigeIds.has(t.id));
          synchronisiereNeueKacheln(zeile, seiteName, neueKacheln.map((t) => ({ kind: t.kind, sign: t.sign })));
        }
        vorherigeIds = new Set(board.tiles.map((t) => t.id));
        onTermChange(termAusBoard(board.tiles));
      },
    });
    eintrag.tafel = tafel;
    Object.defineProperty(eintrag, 'board', { get: () => tafel.board });
    eintrag.addTile = (...args) => tafel.addTile(...args);
    eintrag.addTiles = (...args) => tafel.addTiles(...args);
    eintrag.addZeroPair = (...args) => tafel.addZeroPair(...args);
    eintrag.clear = (...args) => tafel.clear(...args);
    eintrag.render = (...args) => tafel.render(...args);

    // `zeile` wird nach dem Aufbau BEIDER Seiten per `bindeZeile` bekannt –
    // der Listener greift per Closure erst beim tatsächlichen Klick darauf zu.
    let zeile;
    eintrag.bindeZeile = (z) => { zeile = z; };
    seiteEl.addEventListener('pointerdown', () => setzeAktiveSeite(zeile, seiteName), { capture: true });

    return eintrag;
  }

  /**
   * Baut eine neue, UNABHÄNGIGE Zeile (siehe Datei-Kommentar) und hängt sie
   * ans Ende der Kette. `umformungsInfo` ist entweder `null` (Start-Zeile)
   * oder `{text, mehrere}` – `mehrere` steuert nur die Grammatik der
   * Beschriftung ("Umformung" vs. "Umformungen"), wenn `jetztAnwenden`
   * (Runde 20, Punkt 6a) mehrere wartende Operationen zu EINER Zeile
   * kombiniert hat.
   */
  function baueZeile(linksStart, rechtsStart, umformungsInfo) {
    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'gleichungs-kette__zeile-wrapper';

    if (umformungsInfo) {
      const labelEl = document.createElement('div');
      labelEl.className = 'gleichungs-kette__umformung-label';
      labelEl.textContent = `Umformung${umformungsInfo.mehrere ? 'en' : ''}: ${umformungsInfo.text} auf beiden Seiten angewendet`;
      wrapperEl.appendChild(labelEl);
    }

    const kopfEl = document.createElement('div');
    kopfEl.className = 'freie-flaeche__kopf gleichungs-kette__zeile-kopf';
    kopfEl.insertAdjacentHTML('beforeend', '<h4 class="gleichungs-kette__zeile-titel">Gleichung</h4><button type="button" class="rueckgaengig-btn" disabled>↶ Rückgängig</button>');
    wrapperEl.appendChild(kopfEl);

    // .gleichung-bereich: dieselbe vertikale Stapel-Anordnung (linke Seite,
    // "=", rechte Seite), die schon vor Runde 19 in dieser Ansicht verwendet
    // wurde (siehe styles/main.css) – bewusst NICHT neu gestaltet, da die
    // Nutzer-Vorgabe ("räumlich getrennt, "=" zentriert dazwischen") damit
    // bereits erfüllt war und keine Rückmeldung zu dieser Anordnung selbst kam.
    const zeileEl = document.createElement('div');
    zeileEl.className = 'gleichung-bereich gleichungs-kette__zeile';
    wrapperEl.appendChild(zeileEl);

    // EIN gemeinsamer Undo-Speicher für BEIDE Seiten DIESER Zeile (analog zu
    // shared/freieFlaeche.js, dort für eine ganze Bearbeitungsfläche) – aber
    // NICHT zeilenübergreifend (siehe Datei-Kommentar). Muss VOR den beiden
    // createFreieTafel-Aufrufen entstehen, da diese ihn bei der Erzeugung
    // (nicht erst später) entgegennehmen.
    const rueckgaengigBtn = kopfEl.querySelector('.rueckgaengig-btn');
    const undo = erzeugeUndoSpeicher({ onChange: (n) => { rueckgaengigBtn.disabled = n === 0; } });
    rueckgaengigBtn.addEventListener('click', () => undo.rueckgaengig());

    let linksTerm = '0';
    let rechtsTerm = '0';
    function aktualisiereGesamt() {
      gesamtEl.textContent = `${linksTerm} = ${rechtsTerm}`;
    }

    const links = baueSeite(zeileEl, 'links', 'Linke Seite', (term) => { linksTerm = term; aktualisiereGesamt(); }, undo);

    const gleichEl = document.createElement('span');
    gleichEl.className = 'gleichung-istgleich gleichungs-kette__gleich';
    gleichEl.textContent = '=';
    gleichEl.setAttribute('aria-hidden', 'true');
    zeileEl.appendChild(gleichEl);

    const rechts = baueSeite(zeileEl, 'rechts', 'Rechte Seite', (term) => { rechtsTerm = term; aktualisiereGesamt(); }, undo);

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'term-toggle-btn gleichung-toggle-btn';
    wrapperEl.appendChild(toggleBtn);
    const anzeigeEl = document.createElement('div');
    anzeigeEl.className = 'term-anzeige term-anzeige--gleichung';
    anzeigeEl.insertAdjacentHTML('beforeend', '<span class="term-anzeige__label">Dargestellte Gleichung</span> <span class="term-anzeige__wert gleichung-gesamt">0 = 0</span>');
    wrapperEl.appendChild(anzeigeEl);
    const gesamtEl = anzeigeEl.querySelector('.gleichung-gesamt');
    verdrahteTermToggle(toggleBtn, anzeigeEl, { textAnzeigen: 'Gleichung anzeigen', textVerbergen: 'Gleichung verbergen' });

    zeilenEl.appendChild(wrapperEl);

    // `undo` wird zusätzlich am Zeile-Objekt selbst hinterlegt (Runde 20):
    // das Malkreuz-Werkzeug der Kette (siehe unten) bindet seine eigenen
    // Rückgängig-Schritte dynamisch an die Zeile der GERADE AKTIVEN Seite.
    const zeile = { wrapperEl, links, rechts, undo };
    links.bindeZeile(zeile);
    rechts.bindeZeile(zeile);

    // Runde 21 (Punkt 11): die INITIALE Befüllung dieser Zeile (Start-Zeile
    // ODER das per "Jetzt anwenden" berechnete Umformungs-Ergebnis) ist kein
    // Nutzer-"Hinzufügen"-Schritt und darf NICHT auf die (zu diesem
    // Zeitpunkt bereits bestehenden) älteren Zeilen übertragen werden – der
    // Wächter `zeilenAufbauAktiv` unterdrückt dafür `synchronisiereMitAllen-
    // Zeilen` innerhalb von `baueSeite`s `onChange` (siehe dort).
    zeilenAufbauAktiv = true;
    try {
      if (linksStart?.length) {
        links.addTiles(linksStart);
      }
      if (rechtsStart?.length) {
        rechts.addTiles(rechtsStart);
      }
    } finally {
      zeilenAufbauAktiv = false;
    }
    // Das Übernehmen des Startzustands (egal ob leer, vorgegeben oder aus
    // einer Umformung) ist kein eigener Nutzer-Schritt dieser Zeile.
    undo.leeren();

    zeilen.push(zeile);
    setzeAktiveSeite(zeile, 'links');
    return zeile;
  }

  // --- Malkreuz (Runde 20, Punkt 6b): EIN Werkzeug für die ganze Kette,
  // gebunden an die jeweils AKTIVE Seite (siehe Datei-Kommentar oben). Der
  // Undo-"Speicher", den createAndockRasterUI entgegennimmt, ist bewusst ein
  // dünner Weiterleiter statt eines festen Speichers: er liest `aktiveSeite`
  // erst im Moment jeder tatsächlichen Malkreuz-Aktion aus, nicht beim
  // Erzeugen – dadurch landen Rückgängig-Schritte immer im Undo-Speicher
  // GENAU der Zeile, die zu diesem Zeitpunkt aktiv ist, auch wenn sich die
  // aktive Seite zwischen zwei Malkreuz-Aktionen geändert hat.
  const malkreuzToggleBtn = container.querySelector('.gk-malkreuz-toggle-btn');
  const malkreuzHostEl = container.querySelector('.gk-malkreuz-host');
  // Runde 21 (Punkt 8/9): `createMalkreuzGruppe` statt eines einzelnen
  // `createAndockRasterUI` – siehe shared/andockRaster.js und
  // shared/freieFlaeche.js für dieselbe Umstellung. "Anwenden" überträgt die
  // Produkt-Plättchen auf die AKTIVE Seite (dieselbe Bindung wie beim
  // Rückgängig-Speicher unten).
  let malkreuzGruppe = null;
  malkreuzToggleBtn.addEventListener('click', () => {
    const sichtbar = malkreuzHostEl.hidden;
    if (sichtbar && !malkreuzGruppe) {
      malkreuzGruppe = createMalkreuzGruppe(malkreuzHostEl, {
        zeilenLabel: 'ein Faktor',
        spaltenLabel: 'anderer Faktor',
        undo: { aufzeichnen: (wiederherstellen) => aktiveSeite?.zeile.undo.aufzeichnen(wiederherstellen) },
        aufAnwenden(tiles) { aktiveTafel()?.addTiles(tiles); },
      });
    }
    malkreuzHostEl.hidden = !sichtbar;
    malkreuzToggleBtn.textContent = sichtbar ? 'Malkreuz verbergen' : 'Malkreuz anzeigen';
    malkreuzToggleBtn.setAttribute('aria-expanded', String(sichtbar));
  });

  // --- gemeinsame Auswahl (Palette) für die ganze Kette ---
  const palette = createPalette(container.querySelector('.palette'), {
    typen,
    onDrop(typ, punkt) {
      // Ist das Malkreuz eingeblendet, entscheidet zuerst der Ablagepunkt,
      // ob eine seiner Zonen/Zellen getroffen wurde (dieselbe Reihenfolge
      // wie in shared/freieFlaeche.js).
      if (malkreuzGruppe && !malkreuzHostEl.hidden && malkreuzGruppe.versucheAblegen(typ, punkt)) return;
      for (const zeile of zeilen) {
        for (const seiteName of ['links', 'rechts']) {
          const eintrag = zeile[seiteName];
          const rect = eintrag.tafelEl.getBoundingClientRect();
          const innerhalb = punkt.clientX >= rect.left && punkt.clientX <= rect.right
            && punkt.clientY >= rect.top && punkt.clientY <= rect.bottom;
          if (!innerhalb) continue;
          setzeAktiveSeite(zeile, seiteName);
          // Runde 20 (Punkt 2): Ablagepunkt relativ zur Tafel mitgeben, siehe
          // shared/freieFlaeche.js für dieselbe Verdrahtung.
          eintrag.addTile(typ.kind, typ.sign, {
            punktRelativ: { x: punkt.clientX - rect.left, y: punkt.clientY - rect.top },
          });
          return;
        }
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

  // --- "Auf beide Seiten anwenden" (Runde 20, Punkt 6a: Warteschlange statt
  // Sofort-Anwendung, siehe Datei-Kommentar oben) ---
  const addierenEl = container.querySelector('.gleichungs-kette__umformung-addieren');
  const ADDIEREN_TYPEN = mitQuadrat
    ? [{ kind: 'x2', sign: 1 }, { kind: 'x2', sign: -1 }, { kind: 'x', sign: 1 }, { kind: 'x', sign: -1 }, { kind: 'zahl', sign: 1 }, { kind: 'zahl', sign: -1 }]
    : [{ kind: 'x', sign: 1 }, { kind: 'x', sign: -1 }, { kind: 'zahl', sign: 1 }, { kind: 'zahl', sign: -1 }];
  for (const typ of ADDIEREN_TYPEN) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gk-addieren-btn';
    btn.textContent = formatiereOperation({ typ: 'addieren', ...typ, anzahl: 1 });
    btn.addEventListener('click', () => fuegeZurWarteschlangeHinzu({ typ: 'addieren', ...typ, anzahl: 1 }));
    addierenEl.appendChild(btn);
  }

  function liesFaktor() {
    const faktor = Math.round(Number(faktorInput.value));
    if (!Number.isInteger(faktor) || faktor < 2 || faktor > GLEICHUNG_MAX_FAKTOR) return null;
    return faktor;
  }

  container.querySelector('.gk-mult-btn').addEventListener('click', () => {
    const faktor = liesFaktor();
    if (faktor === null) {
      zeigeHinweis(`Bitte eine ganze Zahl zwischen 2 und ${GLEICHUNG_MAX_FAKTOR} als Faktor wählen.`);
      return;
    }
    fuegeZurWarteschlangeHinzu({ typ: 'multiplizieren', faktor });
  });
  container.querySelector('.gk-div-btn').addEventListener('click', () => {
    const faktor = liesFaktor();
    if (faktor === null) {
      zeigeHinweis(`Bitte eine ganze Zahl zwischen 2 und ${GLEICHUNG_MAX_FAKTOR} als Faktor wählen.`);
      return;
    }
    fuegeZurWarteschlangeHinzu({ typ: 'dividieren', faktor });
  });

  function zeigeHinweis(text) {
    hinweisEl.textContent = text;
    hinweisEl.classList.toggle('gk-umformung-hinweis--fehler', Boolean(text));
  }

  // Jeder Eintrag: { operation, label } – `label` wird einmalig beim
  // Einreihen berechnet (statt bei jedem Rendern neu), da sich das Ergebnis
  // von `formatiereOperation` für eine bereits eingereihte Operation nicht
  // mehr ändert.
  let warteschlange = [];

  function aktualisiereWarteschlangeAnzeige() {
    warteschlangeListeEl.innerHTML = '';
    warteschlange.forEach((eintrag, i) => {
      const li = document.createElement('li');
      li.className = 'gk-warteschlange__eintrag';
      const textEl = document.createElement('span');
      textEl.textContent = eintrag.label;
      li.appendChild(textEl);
      const entfernenBtn = document.createElement('button');
      entfernenBtn.type = 'button';
      entfernenBtn.className = 'gk-warteschlange__entfernen-btn';
      entfernenBtn.setAttribute('aria-label', `"${eintrag.label}" aus der Warteschlange entfernen`);
      entfernenBtn.textContent = '×';
      entfernenBtn.addEventListener('click', () => {
        warteschlange.splice(i, 1);
        aktualisiereWarteschlangeAnzeige();
      });
      li.appendChild(entfernenBtn);
      warteschlangeListeEl.appendChild(li);
    });
    warteschlangeHinweisEl.hidden = warteschlange.length > 0;
    anwendenBtn.disabled = warteschlange.length === 0;
  }

  /** Reiht eine Umformung in die Warteschlange ein, statt sie sofort anzuwenden (Runde 20, Punkt 6a). */
  function fuegeZurWarteschlangeHinzu(operation) {
    warteschlange.push({ operation, label: formatiereOperation(operation) });
    zeigeHinweis('');
    aktualisiereWarteschlangeAnzeige();
  }

  /**
   * Führt ALLE wartenden Umformungen nacheinander auf die zuletzt erzeugte
   * Zeile aus (jedes Zwischenergebnis wird zur Eingabe der jeweils
   * nächsten Umformung) und erzeugt bei vollständigem Erfolg GENAU EINE
   * neue Zeile mit dem kombinierten Endergebnis (Nutzer-Vorgabe: "eine
   * kombinierte Zeile"). Scheitert eine der Umformungen (z. B. nicht
   * aufgehende Division), wird abgebrochen, ein Hinweistext gezeigt und die
   * komplette Warteschlange bleibt zur Korrektur erhalten – es entsteht
   * dann keine neue Zeile, auch nicht für die zuvor bereits erfolgreich
   * berechneten Schritte (diese waren nur Zwischenwerte in dieser Funktion,
   * nie eine eigene Zeile).
   */
  function jetztAnwenden() {
    if (warteschlange.length === 0) return;
    const letzte = zeilen[zeilen.length - 1];
    let linksTiles = letzte.links.board.tiles.map((t) => ({ kind: t.kind, sign: t.sign }));
    let rechtsTiles = letzte.rechts.board.tiles.map((t) => ({ kind: t.kind, sign: t.sign }));
    const angewandteLabels = [];
    for (const eintrag of warteschlange) {
      const ergebnis = wendeAufBeideSeitenAn(linksTiles, rechtsTiles, eintrag.operation);
      if (ergebnis.fehler) {
        zeigeHinweis(ergebnis.hinweis ?? `Die Umformung "${eintrag.label}" lässt sich auf die aktuelle Zeile nicht anwenden.`);
        return;
      }
      linksTiles = ergebnis.links;
      rechtsTiles = ergebnis.rechts;
      angewandteLabels.push(eintrag.label);
    }
    zeigeHinweis('');
    const neueZeile = baueZeile(linksTiles, rechtsTiles, { text: angewandteLabels.join(', '), mehrere: angewandteLabels.length > 1 });
    neueZeile.wrapperEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    warteschlange = [];
    aktualisiereWarteschlangeAnzeige();
  }

  anwendenBtn.addEventListener('click', jetztAnwenden);
  aktualisiereWarteschlangeAnzeige();

  baueZeile(opts.initialLinks ?? [], opts.initialRechts ?? [], null);

  return {
    getZeilen: () => zeilen,
  };
}
