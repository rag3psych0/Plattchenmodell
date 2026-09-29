import { createFreieTafel } from './freieTafel.js';
import { createPalette } from './palette.js';
import { termAusBoard } from '../engine/term.js';
import { createMalkreuzGruppe } from './andockRaster.js';
import { erzeugeUndoSpeicher } from './undo.js';

/**
 * Verdrahtet einen Zeige/Verbergen-Button für eine Anzeige, die standardmäßig
 * verborgen ist (die Schülerin/der Schüler soll den Term erst nach eigenem
 * Rechnen/Überlegen kontrollieren, nicht ihn die ganze Zeit vor Augen haben).
 */
export function verdrahteTermToggle(button, anzeige, opts = {}) {
  const textAnzeigen = opts.textAnzeigen ?? 'Term anzeigen';
  const textVerbergen = opts.textVerbergen ?? 'Term verbergen';
  let sichtbar = false;
  anzeige.hidden = true;
  button.textContent = textAnzeigen;
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => {
    sichtbar = !sichtbar;
    anzeige.hidden = !sichtbar;
    button.textContent = sichtbar ? textVerbergen : textAnzeigen;
    button.setAttribute('aria-expanded', String(sichtbar));
  });
}

/**
 * Baut einen kompletten Bearbeitungs-Block: Auswahl (Palette) + freie
 * Kästchenfläche(n) + Term-Anzeige, inklusive aller Verdrahtung (Ziehen aus
 * der Auswahl, Nullpaar-Button, Leeren-Button, Term-Aktualisierung). Der Term
 * bleibt zunächst verborgen und wird erst per Button eingeblendet.
 *
 * Wird von der "Terme"-Ansicht einmal und von der "Gleichungen"-Ansicht
 * zweimal (linke/rechte Seite der Gleichung) verwendet, damit diese
 * Verdrahtung nicht mehrfach dupliziert werden muss.
 *
 * Seit Runde 17 (Nutzer-Rückmeldung, Punkt 2 – ersetzt die bisherige, über
 * shared/zeilenkette.js realisierte Verkettung UNABHÄNGIGER Zeilen komplett):
 * "+ Neue Zeile darunter" erzeugt keine unabhängige Folgefläche mehr, sondern
 * eine mit der bestehenden Fläche GESPIEGELTE zweite Kästchenfläche –
 * getrennt durch einen schwarzen Balken, mit denselben Plättchen vorbefüllt.
 * Beliebig viele weitere Flächen lassen sich so anhängen (jede trägt ihren
 * eigenen "+ Neue Zeile darunter"-Knopf); ALLE Flächen der so entstehenden
 * Gruppe bleiben danach dauerhaft gegenseitig synchron: jede Änderung (Hinzu-
 * fügen, Nullpaar-Auflösung, Herausziehen, Leeren, Rückgängig – unabhängig
 * davon, an welcher Fläche der Gruppe sie ausgelöst wurde) wird sofort auf
 * alle übrigen Flächen der Gruppe übertragen (siehe `synchronisiereMitGruppe`
 * unten). Es gibt bewusst nur EINE Auswahl (Palette) und EINEN
 * "Rückgängig"-Knopf für die ganze Gruppe – die neu entstehenden Flächen
 * bekommen keine eigene Auswahl. Per Klick auf eine der Flächen wird sie zur
 * "aktiven" Fläche, auf die sich Auswahl-Knopf-Aktionen (Hinzufügen/Nullpaar/
 * Leeren) beziehen; ein Ablegen per Ziehen trifft ohnehin direkt die Fläche,
 * auf der losgelassen wurde, und macht diese automatisch zur aktiven.
 *
 * Das optionale Malkreuz (siehe unten) ist von dieser Spiegelung bewusst
 * AUSGENOMMEN (Nutzer-Rückmeldung: nur die freie Kästchenfläche soll sich so
 * verhalten) – es bleibt ein einzelnes, nicht dupliziertes Werkzeug, das an
 * der ERSTEN Fläche hängt.
 *
 * Seit Runde 15 (Nutzer-Rückmeldung: "Wenn ich bei allen Bearbeitungsflächen
 * bin: Das Malkreuz soll als Auswahloption da sein, sodass man es erscheinen
 * lassen kann") trägt die Fläche zusätzlich einen "Malkreuz anzeigen"-Knopf
 * (Runde 17: unterhalb von "+ Neue Zeile darunter"; Runde 18, Nutzer-
 * Rückmeldung Punkt 5: kleiner und unterhalb von "Fläche leeren" in der
 * Auswahl-Spalte, während das Malkreuz selbst in der breiteren Tafel-Spalte
 * blieb – Knopf und Panel standen damit in zwei verschiedenen Spalten; seit
 * Runde 20, Nutzer-Rückmeldung Punkt 5, stehen beide wieder unmittelbar
 * nebeneinander in der Tafel-Spalte, direkt unterhalb von "+ Neue Zeile
 * darunter"): erst auf Wunsch erscheint dort ein echtes Malkreuz (dieselbe Komponente wie in
 * "Multiplikation von Klammern/Das Malkreuz", siehe andockRaster.js) als
 * zusätzliches Hilfswerkzeug, um zwei Faktoren strukturiert
 * nebeneinanderzulegen. Es wird aus DERSELBEN Auswahl bedient wie die freie(n)
 * Fläche(n) – abhängig vom Ablagepunkt entscheidet erzeugeFreieFlaeche, ob ein
 * gezogenes Plättchen auf einer freien Fläche, an einer Malkreuz-Kette oder in
 * einer offenen Produkt-Zelle landet. Der angezeigte Term bezieht sich
 * bewusst weiterhin NUR auf die Plättchen der freien Fläche(n) – das Malkreuz
 * ist ein räumliches Ordnungs-Werkzeug, kein zweiter, damit vermischter
 * Plättchen-Bestand.
 *
 * Seit Runde 16 trägt die Fläche außerdem einen "Rückgängig"-Knopf (seit
 * Runde 17 rechts neben der Überschrift, seit Runde 18 zusätzlich deutlich
 * kleiner als "+ Neue Zeile darunter") sowie die Möglichkeit, ein bereits
 * abgelegtes Plättchen durch Herausziehen aus der Fläche (bzw. aus dem
 * Malkreuz) wieder zu entfernen – siehe shared/undo.js, shared/freieTafel.js
 * und shared/andockRaster.js.
 *
 * Seit Runde 18 (Nutzer-Rückmeldung Punkt 6) wird beim Bilden/Auflösen eines
 * Nullpaars (zwei bereits ausliegende, entgegengesetzte Plättchen werden
 * durch Ziehen zusammengeführt bzw. per Tastatur-Fallback aufgelöst, siehe
 * shared/freieTafel.js) NICHT mehr auf die übrigen gespiegelten Flächen der
 * Gruppe übertragen – diese eine Vereinfachung bleibt bewusst lokal auf der
 * Fläche, auf der sie vorgenommen wurde. Jede ANDERE Änderung (Plättchen
 * hinzufügen, ein Nullpaar per Button NEU anlegen, ein Plättchen durch
 * Herausziehen entfernen, Fläche leeren) bleibt wie gehabt gruppenweit
 * synchron, denn nur eine Nullpaar-Bildung verändert den dargestellten Wert
 * nicht (+1 und −1 heben sich zu 0 auf) – die Wertigkeit des Terms bleibt
 * also weiterhin über alle Flächen hinweg gleich, auch wenn die einzelnen
 * Flächen dafür unterschiedlich viele Plättchen zeigen dürfen. Siehe
 * `synchronisiereMitGruppe` unten und den `sync`-Parameter von
 * `createFreieTafel` (shared/freieTafel.js).
 *
 * @param {HTMLElement} container Ziel-Element, wird komplett befüllt.
 * @param {{flaechenTitel?: string, typen?: {kind:string,sign:1|-1}[], onChange?: (term: string, board: import('../engine/board.js').Board) => void, initialTiles?: {kind:string,sign:1|-1}[]}} [opts]
 *   typen: schränkt die Auswahl ein (z. B. ohne x² für lineare Terme).
 *   Ohne Angabe zeigt die Auswahl alle sechs Plättchen-Typen.
 *   initialTiles: befüllt die (erste) Fläche sofort beim Aufbau.
 * @returns {{tafel: {board: import('../engine/board.js').Board, addTile: Function, addTiles: Function, addZeroPair: Function, clear: Function, render: Function}, palette: ReturnType<typeof createPalette>, getTerm: () => string, kopiereZustand: () => {kind:string,sign:1|-1}[]}}
 */
export function erzeugeFreieFlaeche(container, opts = {}) {
  const flaechenTitel = opts.flaechenTitel ?? 'Fläche';
  container.classList.add('bearbeiten-layout');
  container.insertAdjacentHTML('beforeend', `
    <div class="palette-spalte">
      <h3>Auswahl</h3>
      <div class="palette"></div>
      <button type="button" class="hinzufuegen-btn">Plättchen hinzufügen</button>
      <button type="button" class="nullpaar-btn">Nullpaar erzeugen</button>
      <button type="button" class="leeren-btn">Fläche leeren</button>
    </div>
    <div class="tafel-spalte">
      <div class="freie-flaeche__kopf">
        <h3>${flaechenTitel}</h3>
        <button type="button" class="rueckgaengig-btn" disabled>↶ Rückgängig</button>
      </div>
      <div class="freie-flaeche__liste"></div>
      <button type="button" class="term-toggle-btn">Term anzeigen</button>
      <div class="term-anzeige">
        <span class="term-anzeige__label">Dargestellter Term</span>
        <span class="term-anzeige__wert">0</span>
      </div>
    </div>
  `);

  const listeEl = container.querySelector('.freie-flaeche__liste');
  const termEl = container.querySelector('.term-anzeige__wert');
  const rueckgaengigBtn = container.querySelector('.rueckgaengig-btn');

  verdrahteTermToggle(container.querySelector('.term-toggle-btn'), container.querySelector('.term-anzeige'));

  // Runde 16 (Nutzer-Rückmeldung "Rückgängig button"): EIN gemeinsamer
  // Undo-Speicher für die ganze Bearbeitungsfläche – ALLE gespiegelten
  // Flächen der Gruppe UND das optionale Malkreuz zeichnen in DENSELBEN
  // Speicher auf, damit "Rückgängig" immer die zeitlich letzte Aktion
  // rückgängig macht, unabhängig davon, welcher Teil sie ausgelöst hat.
  const undo = erzeugeUndoSpeicher({ onChange: (n) => { rueckgaengigBtn.disabled = n === 0; } });
  rueckgaengigBtn.addEventListener('click', () => undo.rueckgaengig());

  const gruppe = []; // Array von { wrapperEl, tafelEl, hinweisEl, tafel, neueZeileBtn }
  let aktiverEintrag = null;
  let istAmSynchronisieren = false;

  function markiereAktivenEintrag() {
    for (const eintrag of gruppe) {
      eintrag.wrapperEl.classList.toggle('freie-flaeche__eintrag--aktiv', eintrag === aktiverEintrag);
    }
  }

  function setzeAktiv(eintrag) {
    if (aktiverEintrag === eintrag) return;
    aktiverEintrag = eintrag;
    markiereAktivenEintrag();
    // Runde 18 (Punkt 6): der Term bezieht sich seither auf die AKTIVE
    // Fläche statt fest auf die erste – da sich Flächen durch eine lokal
    // gebliebene Nullpaar-Vereinfachung im rohen Plättchen-Bestand
    // unterscheiden können, muss ein bloßer Wechsel der aktiven Fläche
    // (ohne dass sich dabei etwas an den Plättchen ändert und also KEIN
    // `onChange` ausgelöst wird) die Anzeige ebenfalls auffrischen – sonst
    // bliebe dort der Term der zuvor aktiven Fläche stehen.
    aktualisiereTermAnzeige();
  }

  /**
   * Überträgt die Plättchen von `quelle` (roh, OHNE eigenen Undo-Eintrag –
   * das Spiegeln selbst ist kein zusätzlicher Nutzer-Schritt) auf alle
   * übrigen Flächen der Gruppe. Der Wächter `istAmSynchronisieren` verhindert
   * eine Endlosschleife, da das `render()` einer Zielfläche wiederum deren
   * `onChange` auslöst.
   */
  function synchronisiereMitGruppe(quelle) {
    if (istAmSynchronisieren) return;
    istAmSynchronisieren = true;
    try {
      // Runde 20: `stapel` (welcher von ggf. mehreren nebeneinander liegenden
      // Stapeln derselben Sorte, siehe shared/freieTafel.js) gehört mit
      // gespiegelt – sonst würde eine gespiegelte Fläche die auf der Quelle
      // per Ziehen angelegte Mehrfach-Stapelung optisch wieder einsammeln.
      const kopie = quelle.tafel.board.tiles.map((t) => ({ kind: t.kind, sign: t.sign, stapel: t.stapel ?? 0 }));
      for (const eintrag of gruppe) {
        if (eintrag === quelle) continue;
        eintrag.tafel.board.clear();
        for (const t of kopie) {
          const [neu] = eintrag.tafel.board.add(t.kind, t.sign, 1);
          neu.stapel = t.stapel;
        }
        eintrag.tafel.render();
      }
    } finally {
      istAmSynchronisieren = false;
    }
  }

  /**
   * Zeigt den Term DER AKTIVEN Fläche (nicht mehr fest der ersten) – seit
   * Runde 18 (Punkt 6) können sich Flächen durch eine lokal gebildete/
   * aufgelöste Nullpaar-Vereinfachung in ihrer rohen Plättchen-Anzahl
   * unterscheiden, auch wenn ihre Wertigkeit gleich bleibt (siehe Datei-
   * Kommentar oben) – angezeigt wird also, was auf der Fläche steht, die
   * die Schülerin/der Schüler gerade ansieht.
   */
  function aktualisiereTermAnzeige() {
    const tiles = aktiverEintrag.tafel.board.tiles;
    const term = termAusBoard(tiles);
    termEl.textContent = term;
    opts.onChange?.(term, aktiverEintrag.tafel.board);
  }

  /** Baut eine neue (leere) Fläche auf und fügt sie DOM- wie datentechnisch direkt nach `nachEintrag` ein (oder ans Ende, wenn `nachEintrag` null ist – erste Fläche). */
  function baueEintrag(nachEintrag) {
    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'freie-flaeche__eintrag';

    if (nachEintrag) {
      const trennerEl = document.createElement('div');
      trennerEl.className = 'freie-flaeche__trenner';
      wrapperEl.appendChild(trennerEl);
    }

    const tafelEl = document.createElement('div');
    tafelEl.className = 'freie-tafel';
    const hinweisEl = document.createElement('p');
    hinweisEl.className = 'freie-tafel__hinweis';
    hinweisEl.textContent = 'Noch keine Plättchen – über die Auswahl hinzufügen.';
    tafelEl.appendChild(hinweisEl);
    wrapperEl.appendChild(tafelEl);

    const neueZeileBtn = document.createElement('button');
    neueZeileBtn.type = 'button';
    neueZeileBtn.className = 'freie-flaeche__neue-zeile-btn';
    neueZeileBtn.textContent = '+ Neue Zeile darunter';
    wrapperEl.appendChild(neueZeileBtn);

    if (nachEintrag) {
      nachEintrag.wrapperEl.after(wrapperEl);
    } else {
      listeEl.appendChild(wrapperEl);
    }

    const eintrag = { wrapperEl, tafelEl, hinweisEl, neueZeileBtn, tafel: null };

    const tafel = createFreieTafel(tafelEl, {
      undo,
      // `details.sync === false` (Runde 18, Punkt 6): eine reine Nullpaar-
      // Bildung/-Auflösung (siehe shared/freieTafel.js) bleibt lokal auf
      // DIESER Fläche – die Gruppe wird dafür NICHT synchronisiert. Jede
      // andere Änderung (details.sync ist true oder fehlt) verhält sich wie
      // gehabt.
      onChange(board, details) {
        hinweisEl.style.display = board.tiles.length === 0 ? '' : 'none';
        if (details?.sync !== false) synchronisiereMitGruppe(eintrag);
        aktualisiereTermAnzeige();
      },
    });
    eintrag.tafel = tafel;

    if (nachEintrag) {
      const idx = gruppe.indexOf(nachEintrag);
      gruppe.splice(idx + 1, 0, eintrag);
    } else {
      gruppe.push(eintrag);
    }

    // Aktivieren per Klick (Runde 17, Punkt 5: "Ich muss die
    // Bearbeitungsfläche anklicken, die ich verändern will"). Capture-Phase,
    // damit das eigentliche Ziehen/Rechteck-Auswählen von freieTafel.js
    // (eigener, nicht-capturing Listener direkt auf tafelEl) unverändert
    // funktioniert – diese Aktivierung läuft nur "nebenbei" vorher mit.
    wrapperEl.addEventListener('pointerdown', () => setzeAktiv(eintrag), { capture: true });

    neueZeileBtn.addEventListener('click', () => {
      const neuerEintrag = baueEintrag(eintrag);
      // Duplizieren (Punkt 4 der Nutzer-Anleitung) ergibt sich allein
      // daraus, dass jede Änderung in der Gruppe auf alle übrigen Flächen
      // übertragen wird – ein einmaliges "Anstoßen" von der Ursprungsfläche
      // aus genügt, um die neue (noch leere) Fläche auf denselben Stand zu
      // bringen; `synchronisiereMitGruppe` rendert dabei jede ANDERE Fläche
      // (also auch die gerade neu erzeugte) bereits selbst mit. Wichtig ist
      // die Reihenfolge: Ein vorheriges eigenes `render()` der noch leeren
      // neuen Fläche würde über deren `onChange` fälschlich eine
      // Synchronisation AUSGEHEND von der leeren Fläche auslösen und damit
      // die Ursprungsfläche wieder leeren, bevor die eigentliche
      // Übernahme stattfindet.
      synchronisiereMitGruppe(eintrag);
      setzeAktiv(neuerEintrag);
    });

    return eintrag;
  }

  const ersterEintrag = baueEintrag(null);
  // Runde 18: `aktiverEintrag` muss VOR dem ersten `render()` gesetzt sein,
  // da `aktualisiereTermAnzeige()` (ausgelöst über `onChange`) seit Runde 18
  // (Punkt 6) von der aktiven statt immer von der ersten Fläche liest.
  setzeAktiv(ersterEintrag);
  ersterEintrag.tafel.render();

  // --- Malkreuz: einzelnes, NICHT gespiegeltes Werkzeug an der ersten Fläche ---
  // Runde 18 (Punkt 5): der auslösende Knopf saß klein unterhalb von "Fläche
  // leeren" in der schmalen Auswahl-Spalte, während das eigentliche Malkreuz
  // unterhalb von "+ Neue Zeile darunter" in der breiteren Tafel-Spalte
  // erschien – Knopf und Panel standen damit in ZWEI VERSCHIEDENEN Spalten,
  // optisch weit auseinander. Runde 20 (Nutzer-Rückmeldung Punkt 5) stellte
  // beide daraufhin als unmittelbare Nachbarn in der breiteren Tafel-Spalte
  // zusammen. Runde 21 (Nutzer-Rückmeldung Punkt 5) verlangt nun ausdrücklich
  // eine dritte Position für den AUSLÖSER: direkt unterhalb von "Nullpaar
  // erzeugen" in der schmalen Auswahl-Spalte. Das eigentliche Malkreuz-Panel
  // selbst bräuchte dort mehr horizontale Breite, als die 160px schmale Spalte
  // hergibt (vgl. .bearbeiten-layout, styles/main.css) – es bleibt deshalb
  // weiterhin in der breiteren Tafel-Spalte, dort nun an deren Anfang (direkt
  // nach dem Kopf-Bereich, oberhalb der eigentlichen Plättchen-Liste), statt
  // wie in Runde 20 unmittelbar dem Knopf zu folgen.
  const malkreuzToggleBtn = document.createElement('button');
  malkreuzToggleBtn.type = 'button';
  malkreuzToggleBtn.className = 'malkreuz-toggle-btn malkreuz-toggle-btn--klein';
  malkreuzToggleBtn.setAttribute('aria-expanded', 'false');
  malkreuzToggleBtn.textContent = 'Malkreuz anzeigen';
  const malkreuzHostEl = document.createElement('div');
  malkreuzHostEl.className = 'malkreuz-host';
  malkreuzHostEl.hidden = true;
  container.querySelector('.nullpaar-btn').after(malkreuzToggleBtn);
  container.querySelector('.freie-flaeche__kopf').after(malkreuzHostEl);

  // Runde 21 (Punkt 8/9): `createMalkreuzGruppe` statt eines einzelnen
  // `createAndockRasterUI` – verwaltet beliebig viele, untereinander
  // unabhängige Malkreuze samt je eigenem "Anwenden"-Knopf (siehe
  // shared/andockRaster.js). "Anwenden" überträgt die Produkt-Plättchen
  // DIESES Malkreuzes auf die AKTIVE Fläche der Gruppe – wie beim
  // "Plättchen hinzufügen"-Knopf.
  let malkreuzGruppe = null;
  malkreuzToggleBtn.addEventListener('click', () => {
    const sichtbar = malkreuzHostEl.hidden;
    if (sichtbar && !malkreuzGruppe) {
      malkreuzGruppe = createMalkreuzGruppe(malkreuzHostEl, {
        zeilenLabel: 'ein Faktor',
        spaltenLabel: 'anderer Faktor',
        undo,
        aufAnwenden(tiles) { aktiverEintrag.tafel.addTiles(tiles); },
      });
    }
    malkreuzHostEl.hidden = !sichtbar;
    malkreuzToggleBtn.textContent = sichtbar ? 'Malkreuz verbergen' : 'Malkreuz anzeigen';
    malkreuzToggleBtn.setAttribute('aria-expanded', String(sichtbar));
  });

  // Ziehen aus der Auswahl bleibt als schnelle Alternative zu den Knöpfen
  // möglich. Ist das Malkreuz eingeblendet, entscheidet zuerst der
  // Ablagepunkt, ob eine seiner Zonen/Zellen getroffen wurde (Runde 15);
  // ansonsten entscheidet der Ablagepunkt, auf welcher Fläche der Gruppe
  // abgelegt wurde (Runde 17) – die genaue Position INNERHALB einer Fläche
  // spielt keine Rolle, sie ordnet automatisch ein.
  const palette = createPalette(container.querySelector('.palette'), {
    typen: opts.typen,
    onDrop(typ, punkt) {
      if (malkreuzGruppe && !malkreuzHostEl.hidden && malkreuzGruppe.versucheAblegen(typ, punkt)) return;
      for (const eintrag of gruppe) {
        const rect = eintrag.tafelEl.getBoundingClientRect();
        const innerhalb =
          punkt.clientX >= rect.left && punkt.clientX <= rect.right &&
          punkt.clientY >= rect.top && punkt.clientY <= rect.bottom;
        if (!innerhalb) continue;
        setzeAktiv(eintrag);
        // Runde 20 (Punkt 2): Ablagepunkt relativ zur Tafel mitgeben, damit
        // freieTafel.js entscheiden kann, ob ein bestehender Stapel
        // fortgesetzt oder ein neuer, danebenliegender Stapel eröffnet wird.
        eintrag.tafel.addTile(typ.kind, typ.sign, {
          punktRelativ: { x: punkt.clientX - rect.left, y: punkt.clientY - rect.top },
        });
        return;
      }
    },
  });

  container.querySelector('.hinzufuegen-btn').addEventListener('click', () => {
    const typ = palette.getAusgewaehlt();
    aktiverEintrag.tafel.addTile(typ.kind, typ.sign);
  });
  container.querySelector('.nullpaar-btn').addEventListener('click', () => {
    aktiverEintrag.tafel.addZeroPair(palette.getAusgewaehlt().kind);
  });
  container.querySelector('.leeren-btn').addEventListener('click', () => aktiverEintrag.tafel.clear());

  if (opts.initialTiles?.length) {
    ersterEintrag.tafel.addTiles(opts.initialTiles);
    // Das Übernehmen der Vorgabe ist kein Nutzer-Schritt – "Rückgängig" soll
    // hier erst bei der ersten eigenen Aktion etwas zu tun haben (Runde 16).
    undo.leeren();
  }

  return {
    // Bezieht sich auf die AKTIVE Fläche der Gruppe (Punkt 5: die per Klick
    // ausgewählte). Für rein lesende Zugriffe, die die Plättchen NETTO
    // auswerten (z. B. `nettoKoeffizienten(...)` für "Überprüfen"), ist das
    // gleichwertig zu jeder anderen Fläche der Gruppe, da alle stets
    // dieselbe WERTIGKEIT zeigen – seit Runde 18 (Punkt 6) aber NICHT mehr
    // notwendig denselben rohen Plättchen-Bestand, da eine lokal gebildete/
    // aufgelöste Nullpaar-Vereinfachung nicht mehr gruppenweit gespiegelt
    // wird (siehe Datei-Kommentar oben).
    tafel: {
      get board() { return aktiverEintrag.tafel.board; },
      addTile: (...args) => aktiverEintrag.tafel.addTile(...args),
      addTiles: (...args) => aktiverEintrag.tafel.addTiles(...args),
      addZeroPair: (...args) => aktiverEintrag.tafel.addZeroPair(...args),
      clear: (...args) => aktiverEintrag.tafel.clear(...args),
      render: (...args) => aktiverEintrag.tafel.render(...args),
    },
    palette,
    getTerm: () => termAusBoard(aktiverEintrag.tafel.board.tiles),
    kopiereZustand: () => aktiverEintrag.tafel.board.tiles.map((t) => ({ kind: t.kind, sign: t.sign })),
  };
}
