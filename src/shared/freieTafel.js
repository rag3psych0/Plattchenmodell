import { Board } from '../engine/board.js';
import { createPlaettchenElement } from './renderPlaettchen.js';
import { tileDimensions } from './theme.js';

const REIHENFOLGE = ['x2', 'x', 'zahl'];

const PADDING = 16;
// Etwas großzügigerer Abstand zwischen den Spalten unterschiedlicher
// Plättchen-Arten (x², x, Zahl) als zwischen gleichartigen Plättchen
// innerhalb einer Spalte – macht auf einen Blick klarer, dass es sich um
// unterschiedliche "Sorten" handelt (Nutzer-Feedback).
const GAP_SPALTEN = 28;
const GAP_KACHEL = 6;
// Runde 20 (Nutzer-Rückmeldung Punkt 2): Abstand zwischen MEHREREN Stapeln
// DERSELBEN Sorte (gleiche Art + gleiches Vorzeichen) – kleiner als
// GAP_SPALTEN (verschiedene Sorten bleiben klar unterscheidbar), aber
// größer als GAP_KACHEL (deutlich erkennbar zwei getrennte Stapel statt
// eines einzigen).
const GAP_STAPEL = 14;
// Ab welchem horizontalen Abstand rechts vom letzten Stapel einer Sorte ein
// per Ziehen abgelegtes Plättchen einen NEUEN Stapel eröffnet, statt sich
// dem bestehenden anzuschließen (Nutzer-Rückmeldung: "freie Ablage daneben").
// Runde 21: von 0.5 auf 0.3 gesenkt – auf einem Tablet ist eine per Finger
// gezogene Ablage weniger präzise als per Maus, ein kleinerer nötiger
// Abstand macht das Eröffnen eines zweiten Stapels dadurch zuverlässiger
// auslösbar (Nutzer-Rückmeldung Punkt 12: Funktion wurde als "nicht
// umgesetzt" wahrgenommen, obwohl die Logik selbst bereits korrekt griff –
// vgl. Entwicklungsprotokoll).
const STAPEL_NEU_SCHWELLE_FAKTOR = 0.3;
const MIN_HOEHE = 320;

/**
 * Gruppiert Plättchen nach Typ+Vorzeichen+Stapel, in fester Reihenfolge (x²,
 * x, Zahl; positiv vor negativ; innerhalb einer Sorte nach Stapel-Index
 * aufsteigend). `tile.stapel` (Runde 20) unterscheidet mehrere, nebeneinander
 * liegende Stapel DERSELBEN Sorte – fehlt es (ältere/unbeteiligte Themen-
 * bereiche, Bulk-Befüllung), gilt Stapel 0 als Vorgabe.
 */
function gruppenStapel(tiles) {
  const spalten = [];
  for (const kind of REIHENFOLGE) {
    for (const sign of [1, -1]) {
      const sorte = tiles.filter((t) => t.kind === kind && t.sign === sign);
      if (sorte.length === 0) continue;
      const stapelIndizes = [...new Set(sorte.map((t) => t.stapel ?? 0))].sort((a, b) => a - b);
      for (const stapel of stapelIndizes) {
        spalten.push({ kind, sign, stapel, tiles: sorte.filter((t) => (t.stapel ?? 0) === stapel) });
      }
    }
  }
  return spalten;
}

/**
 * Berechnet die Pixel-Position jedes Plättchens: Spalten nebeneinander (x²,
 * x, Zahl; positiv vor negativ), innerhalb einer Spalte stapeln sich
 * gleichartige Plättchen von unten nach oben (älteste zuunterst). Seit
 * Runde 20 kann eine Sorte aus MEHREREN, nebeneinander stehenden Stapeln
 * bestehen (`tile.stapel`, siehe `gruppenStapel`); zwischen ihnen gilt der
 * kleinere `GAP_STAPEL` statt des großen `GAP_SPALTEN` zwischen Sorten. Das
 * Ergebnis ist die "Ruheposition", auf die ein losgelassenes Plättchen
 * zurückspringt, wenn es kein Gegenstück getroffen hat.
 */
function berechneLayout(tiles) {
  const spaltenGeom = [];
  let x = PADDING;
  let maxStapelHoehe = 0;
  let vorherigeSorte = null;
  for (const spalte of gruppenStapel(tiles)) {
    const sorteSchluessel = `${spalte.kind}|${spalte.sign}`;
    if (vorherigeSorte !== null) {
      x += vorherigeSorte === sorteSchluessel ? GAP_STAPEL : GAP_SPALTEN;
    }
    const { w, h } = tileDimensions(spalte.kind);
    const stapelHoehe = spalte.tiles.length * h + Math.max(0, spalte.tiles.length - 1) * GAP_KACHEL;
    maxStapelHoehe = Math.max(maxStapelHoehe, stapelHoehe);
    spaltenGeom.push({ ...spalte, w, h, left: x, right: x + w });
    x += w;
    vorherigeSorte = sorteSchluessel;
  }
  const hoehe = Math.max(MIN_HOEHE, maxStapelHoehe + PADDING * 2);
  const groundY = hoehe - PADDING;
  const positionen = new Map();
  for (const spalte of spaltenGeom) {
    spalte.tiles.forEach((tile, i) => {
      const top = groundY - i * (spalte.h + GAP_KACHEL) - spalte.h;
      positionen.set(tile.id, { left: spalte.left, top, w: spalte.w, h: spalte.h });
    });
  }
  return { positionen, hoehe, spaltenGeom };
}

/**
 * Ermittelt, welchem Stapel ein NEU aus der Auswahl gezogenes Plättchen
 * zugeordnet wird (Runde 20, Nutzer-Rückmeldung Punkt 2: "Lasse mich alle
 * Plättchen auch in mehreren Stapeln nebeneinander stapeln. Dafür ziehe ich
 * ein Plättchen neben den Stapel um so einen zweiten aufzumachen").
 *
 * - Gibt es noch keine Plättchen dieser Sorte, ist es zwangsläufig Stapel 0.
 * - Ohne konkreten Ablagepunkt (Button "Plättchen hinzufügen",
 *   Tastatur-Fallback, Bulk-Befüllung wie "Zufällige Plättchensammlung
 *   generieren") landet es im PRIMÄREN (ältesten) Stapel dieser Sorte.
 * - Mit Ablagepunkt: liegt er (mit etwas Toleranz) über einem bestehenden
 *   Stapel dieser Sorte, kommt das Plättchen dort dazu. Liegt er weit genug
 *   (mehr als eine halbe Plättchenbreite) rechts vom bisher letzten Stapel,
 *   entsteht ein NEUER Stapel ("freie Ablage daneben" – Nutzer-Antwort auf
 *   die Rückfrage, statt eines festen gestrichelten Platzhalters). Alle
 *   übrigen Ablagepunkte (z. B. deutlich links oder dazwischen) fallen auf
 *   den jeweils nächstgelegenen bestehenden Stapel zurück.
 */
function bestimmeStapelIndex(tiles, kind, sign, punktRelativ) {
  const bestehende = [...new Set(tiles.filter((t) => t.kind === kind && t.sign === sign).map((t) => t.stapel ?? 0))].sort((a, b) => a - b);
  if (bestehende.length === 0) return 0;
  if (!punktRelativ) return bestehende[0];

  const { spaltenGeom } = berechneLayout(tiles);
  const geomByStapel = new Map();
  for (const spalte of spaltenGeom) {
    if (spalte.kind === kind && spalte.sign === sign) geomByStapel.set(spalte.stapel, spalte);
  }

  let rechtesEnde = -Infinity;
  let naechsterIndex = bestehende[0];
  let naechsterAbstand = Infinity;
  let breite = tileDimensions(kind).w;
  for (const idx of bestehende) {
    const geo = geomByStapel.get(idx);
    if (!geo) continue;
    breite = geo.w;
    rechtesEnde = Math.max(rechtesEnde, geo.right);
    if (punktRelativ.x >= geo.left && punktRelativ.x <= geo.right) return idx;
    const abstand = punktRelativ.x < geo.left ? geo.left - punktRelativ.x : punktRelativ.x - geo.right;
    if (abstand < naechsterAbstand) {
      naechsterAbstand = abstand;
      naechsterIndex = idx;
    }
  }
  if (punktRelativ.x > rechtesEnde + breite * STAPEL_NEU_SCHWELLE_FAKTOR) {
    return bestehende[bestehende.length - 1] + 1;
  }
  return naechsterIndex;
}

function rechteckeUeberlappen(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Freie Kästchenfläche: Plättchen werden per Button/Ziehen aus der Auswahl
 * hinzugefügt und ordnen sich automatisch in Spalten (gleiche Sorte +
 * gleiches Vorzeichen stapeln sich nach unten). Ob zwei Plättchen ein
 * Nullpaar bilden, wird NICHT automatisch markiert – das soll die Schülerin
 * bzw. der Schüler selbst erkennen.
 *
 * Auflösen funktioniert ausschließlich per Ziehen: ein Plättchen wird auf
 * ein passendes Gegenstück (gleiche Sorte, entgegengesetztes Vorzeichen)
 * gezogen; trifft es dort, verschwinden beide, sonst springt es auf seine
 * Ruheposition zurück. Mit gedrückter Maustaste über der freien Fläche kann
 * außerdem ein Auswahlrechteck aufgezogen werden: alle davon erfassten
 * Plättchen DERSELBEN SORTE (Vorzeichen egal) werden zu einer Gruppe und
 * lassen sich anschließend gemeinsam ziehen; ein einzelnes Plättchen der
 * Gruppe, das dabei auf sein Gegenstück trifft, löst sich unabhängig von
 * den anderen auf.
 *
 * Zusätzlich zum Ziehen gibt es einen Tastatur-Fallback (Eingabetaste/
 * Leertaste auf einem fokussierten Plättchen löst es mit einem beliebigen
 * passenden Gegenstück auf), damit die Fläche auch ohne Maus bedienbar
 * bleibt.
 *
 * Seit Runde 16 (Nutzer-Rückmeldung: "man muss Plättchen wieder wegnehmen
 * dürfen in dem man sie ausserhalb vom Bearbeitungsfeld dropt") lässt sich
 * ein bereits ausliegendes Plättchen (bzw. eine per Rechteck-Auswahl
 * gruppierte Menge) zusätzlich zum Nullpaar-Ziehen entfernen, indem es beim
 * Loslassen AUSSERHALB der Tafel liegt – unabhängig davon, ob dort ein
 * Gegenstück wartet. Jede so entfernte bzw. per Nullpaar aufgelöste Menge
 * wird (sofern `undo` übergeben wurde) als EIN Schritt im gemeinsamen
 * Undo-Speicher der Bearbeitungsfläche aufgezeichnet (siehe shared/undo.js).
 *
 * Seit Runde 18 (Nutzer-Rückmeldung Punkt 6) meldet `onChange(board,
 * details)` zusätzlich, OB diese Änderung den dargestellten WERT verändert
 * hat: `details.sync` ist `false` genau dann, wenn zwei bereits ausliegende,
 * entgegengesetzte Plättchen zu einem Nullpaar zusammengeführt bzw. per
 * Tastatur aufgelöst wurden (`loeseAbgelegteGruppeAuf`/
 * `versucheKeyboardAufzuloesen`) – eine solche Auflösung ändert den Wert per
 * Definition nicht (+1 und −1 heben sich zu 0 auf). Bei jeder anderen
 * Änderung (Hinzufügen, Herausziehen, Leeren) ist `details.sync` `true`
 * (bzw. fehlt `details` ganz, was als `true` zu lesen ist). Die aufrufende
 * shared/freieFlaeche.js nutzt dieses Signal, um eine reine Nullpaar-
 * Vereinfachung NICHT auf die übrigen gespiegelten Flächen der Gruppe zu
 * übertragen, während sie selbst weiterhin unverändert funktioniert.
 *
 * Seit Runde 20 (Nutzer-Rückmeldung Punkt 2: "Lasse mich alle Plättchen auch
 * in mehreren Stapeln nebeneinander stapeln. Dafür ziehe ich ein Plättchen
 * neben den Stapel um so einen zweiten aufzumachen") kann eine Sorte (Art +
 * Vorzeichen) aus MEHREREN, nebeneinander liegenden Stapeln bestehen statt
 * nur einem: Wird ein aus der Auswahl gezogenes Plättchen weit genug rechts
 * vom bisher letzten Stapel derselben Sorte abgelegt, eröffnet es einen
 * zweiten (dritten, …) Stapel; wird es näher an einem bestehenden Stapel
 * abgelegt, reiht es sich dort ein (siehe `bestimmeStapelIndex` oben, auf
 * Rückfrage ausdrücklich als "freie Ablage daneben" statt eines festen
 * Platzhalters gewünscht). Welcher Stapel ein Plättchen ist, steht als
 * `tile.stapel` (Zahl, Vorgabe 0) direkt am Board-Plättchen – rein visuelle
 * Zusatzinformation für `berechneLayout`, ohne Bedeutung für Wertigkeit oder
 * Nullpaar-Prüfung. Ohne Ablagepunkt (Button, Tastatur, Bulk-Befüllung)
 * landet ein neues Plättchen weiterhin im primären Stapel; ein bereits
 * ausliegendes Plättchen innerhalb der Tafel umzuziehen, eröffnet bewusst
 * KEINEN neuen Stapel (bleibt auf Nullpaar-Auflösung/Ruheposition
 * beschränkt) – die Stapelwahl ist damit ausschließlich eine Entscheidung
 * beim Hinzufügen aus der Auswahl.
 */
export function createFreieTafel(container, { onChange, undo } = {}) {
  const board = new Board();
  const kachelElemente = new Map(); // tileId -> Element
  let letzteLayoutPositionen = new Map(); // tileId -> {left, top, w, h} (Ruheposition)
  let auswahl = new Set(); // tileId-Menge der aktuell gruppierten Plättchen

  function melde(details) { onChange?.(board, details); }

  /**
   * Führt `aktion` aus und zeichnet – falls sich das Board dabei ändert –
   * den vorherigen Stand für "Rückgängig" auf. `opts.sync` (Runde 18, Punkt
   * 6, Default `true`) wird beim späteren Rückgängig-Machen an `render()`
   * durchgereicht, damit ein Rückgängig-Machen denselben Synchronisations-
   * Umfang hat wie die ursprüngliche Aktion (eine lokal gebliebene Nullpaar-
   * Auflösung bleibt also auch beim Rückgängig-Machen lokal).
   */
  function mitUndo(aktion, { sync = true } = {}) {
    const vorher = undo ? board.snapshot() : null;
    aktion();
    if (undo && (board.tiles.length !== vorher.length || board.tiles.some((t, i) => t.id !== vorher[i]?.id))) {
      undo.aufzeichnen(() => { board.tiles = vorher; render({ sync }); });
    }
  }

  function aktualisiereAuswahlDarstellung() {
    for (const [id, el] of kachelElemente) {
      el.classList.toggle('freie-tafel__kachel--ausgewaehlt', auswahl.has(id));
    }
  }

  /** Tastatur-Fallback: löst mit einem BELIEBIGEN passenden Gegenstück auf. */
  function versucheKeyboardAufzuloesen(tile) {
    const partner = board.tiles.find(
      (t) => t.id !== tile.id && t.kind === tile.kind && t.sign === -tile.sign,
    );
    if (!partner) return;
    // Runde 18 (Punkt 6): eine Nullpaar-Auflösung ändert den Wert nicht und
    // bleibt deshalb lokal (sync:false) – siehe Datei-Kommentar oben.
    mitUndo(() => {
      board.removeById(tile.id);
      board.removeById(partner.id);
    }, { sync: false });
    auswahl.delete(tile.id);
    auswahl.delete(partner.id);
    render({ sync: false });
  }

  /**
   * Prüft für jedes gezogene Plättchen einzeln, ob es (per Mittelpunkt) auf
   * einem passenden, nicht mitgezogenen Gegenstück abgelegt wurde, und
   * entfernt getroffene Paare. Nicht getroffene Plättchen bleiben unverändert
   * auf dem Board und springen beim anschließenden render() auf ihre
   * Ruheposition zurück.
   */
  function loeseAbgelegteGruppeAuf(dragIds) {
    const verwendetePartner = new Set();
    const zuEntfernen = new Set();
    for (const id of dragIds) {
      const tile = board.tiles.find((t) => t.id === id);
      const el = kachelElemente.get(id);
      if (!tile || !el) continue;
      const { w, h } = tileDimensions(tile.kind);
      const mitteX = parseFloat(el.style.left) + w / 2;
      const mitteY = parseFloat(el.style.top) + h / 2;
      const partner = board.tiles.find((t) => {
        if (dragIds.has(t.id) || verwendetePartner.has(t.id)) return false;
        if (t.kind !== tile.kind || t.sign !== -tile.sign) return false;
        const pos = letzteLayoutPositionen.get(t.id);
        if (!pos) return false;
        return mitteX >= pos.left && mitteX <= pos.left + pos.w && mitteY >= pos.top && mitteY <= pos.top + pos.h;
      });
      if (partner) {
        verwendetePartner.add(partner.id);
        zuEntfernen.add(id);
        zuEntfernen.add(partner.id);
      }
    }
    for (const id of zuEntfernen) board.removeById(id);
  }

  function starteKachelDrag(event, tileId) {
    event.preventDefault();
    let dragIds;
    if (auswahl.has(tileId)) {
      dragIds = new Set(auswahl);
    } else {
      auswahl.clear();
      dragIds = new Set([tileId]);
    }
    aktualisiereAuswahlDarstellung();

    const startX = event.clientX;
    const startY = event.clientY;
    const homes = new Map();
    for (const id of dragIds) {
      const el = kachelElemente.get(id);
      if (!el) continue;
      el.classList.add('freie-tafel__kachel--dragging');
      homes.set(id, { left: parseFloat(el.style.left), top: parseFloat(el.style.top) });
    }

    function onMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      for (const id of dragIds) {
        const el = kachelElemente.get(id);
        const home = homes.get(id);
        if (!el || !home) continue;
        el.style.left = `${home.left + dx}px`;
        el.style.top = `${home.top + dy}px`;
      }
    }
    function onUp(upEvent) {
      window.removeEventListener('pointermove', onMove);
      for (const id of dragIds) {
        kachelElemente.get(id)?.classList.remove('freie-tafel__kachel--dragging');
      }
      // Runde 16: außerhalb der Tafel losgelassen → Plättchen(e) entfernen,
      // unabhängig davon, ob dort (zufällig) ein Nullpaar-Gegenstück läge.
      // Runde 18 (Punkt 6): NUR das Zusammenführen zu einem Nullpaar
      // (innerhalb der Tafel) ändert den Wert nicht und bleibt lokal
      // (sync:false) – das Herausziehen entfernt dagegen tatsächlich
      // Plättchen und bleibt deshalb wie gehabt synchronisiert.
      const tafelRect = container.getBoundingClientRect();
      const ausserhalb = upEvent.clientX < tafelRect.left || upEvent.clientX > tafelRect.right
        || upEvent.clientY < tafelRect.top || upEvent.clientY > tafelRect.bottom;
      let sync = true;
      if (ausserhalb) {
        mitUndo(() => {
          for (const id of dragIds) board.removeById(id);
        });
      } else {
        sync = false;
        mitUndo(() => {
          loeseAbgelegteGruppeAuf(dragIds);
        }, { sync: false });

        // Runde 21 (Präzisierung zu Punkt 2 der Vorrunde): Bis Runde 20 ließ
        // sich ein zweiter Stapel nur durch ein NEU aus der Auswahl gezogenes
        // Plättchen eröffnen (siehe bestimmeStapelIndex/addTile oben) – ein
        // bereits ausliegendes Plättchen sprang beim Loslassen stets auf
        // seine alte Stapel-Position zurück. Der Nutzer meinte mit "ich
        // ziehe ein Plättchen neben den Stapel" jedoch ausdrücklich auch ein
        // bereits liegendes Plättchen. Gilt nur für einzeln (nicht als
        // Mehrfach-Auswahl) gezogene, noch vorhandene Plättchen – eine
        // Stapel-Umsortierung verändert die Wertigkeit nicht (sync:false),
        // genau wie das Nullpaar-Prinzip oben.
        if (dragIds.size === 1) {
          const [einzelId] = dragIds;
          const tile = board.tiles.find((t) => t.id === einzelId);
          const el = kachelElemente.get(einzelId);
          if (tile && el) {
            mitUndo(() => {
              const { w } = tileDimensions(tile.kind);
              const punktRelativ = { x: parseFloat(el.style.left) + w / 2, y: parseFloat(el.style.top) };
              tile.stapel = bestimmeStapelIndex(
                board.tiles.filter((t) => t.id !== tile.id),
                tile.kind,
                tile.sign,
                punktRelativ,
              );
            }, { sync: false });
          }
        }
      }
      auswahl.clear();
      render({ sync });
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }

  function starteRechteckAuswahl(event) {
    event.preventDefault();
    const tafelRect = container.getBoundingClientRect();
    const startX = event.clientX - tafelRect.left;
    const startY = event.clientY - tafelRect.top;
    const rechteckEl = document.createElement('div');
    rechteckEl.className = 'freie-tafel__auswahlrechteck';
    container.appendChild(rechteckEl);

    let letztesRechteck;
    function zeichne(x2, y2) {
      const left = Math.min(startX, x2);
      const top = Math.min(startY, y2);
      const right = Math.max(startX, x2);
      const bottom = Math.max(startY, y2);
      rechteckEl.style.left = `${left}px`;
      rechteckEl.style.top = `${top}px`;
      rechteckEl.style.width = `${right - left}px`;
      rechteckEl.style.height = `${bottom - top}px`;
      letztesRechteck = { left, top, right, bottom };
    }
    zeichne(startX, startY);

    function onMove(moveEvent) {
      zeichne(moveEvent.clientX - tafelRect.left, moveEvent.clientY - tafelRect.top);
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      rechteckEl.remove();

      const breite = letztesRechteck.right - letztesRechteck.left;
      const hoehe = letztesRechteck.bottom - letztesRechteck.top;
      if (breite < 4 && hoehe < 4) {
        // reiner Klick auf die leere Fläche: Auswahl aufheben
        auswahl.clear();
        aktualisiereAuswahlDarstellung();
        return;
      }

      const getroffen = board.tiles.filter((tile) => {
        const pos = letzteLayoutPositionen.get(tile.id);
        if (!pos) return false;
        return rechteckeUeberlappen(letztesRechteck, {
          left: pos.left, top: pos.top, right: pos.left + pos.w, bottom: pos.top + pos.h,
        });
      });
      auswahl = new Set();
      if (getroffen.length > 0) {
        // Nur Plättchen DERSELBEN ART (Sorte) sind gemeinsam gruppierbar –
        // maßgeblich ist die Sorte des ältesten erfassten Plättchens.
        const zielArt = getroffen[0].kind;
        for (const tile of getroffen) {
          if (tile.kind === zielArt) auswahl.add(tile.id);
        }
      }
      aktualisiereAuswahlDarstellung();
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }

  container.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return; // nur linke Maustaste
    const kachelEl = event.target.closest?.('.freie-tafel__kachel');
    if (kachelEl?.dataset.tileId) {
      starteKachelDrag(event, kachelEl.dataset.tileId);
    } else {
      starteRechteckAuswahl(event);
    }
  });

  function render(details) {
    const layout = berechneLayout(board.tiles);
    letzteLayoutPositionen = layout.positionen;
    container.style.minHeight = `${layout.hoehe}px`;

    const aktuelleIds = new Set(board.tiles.map((t) => t.id));
    for (const [id, el] of kachelElemente) {
      if (!aktuelleIds.has(id)) {
        el.remove();
        kachelElemente.delete(id);
      }
    }

    for (const tile of board.tiles) {
      const pos = layout.positionen.get(tile.id);
      let el = kachelElemente.get(tile.id);
      if (!el) {
        el = createPlaettchenElement(tile.kind, tile.sign, { id: tile.id });
        el.classList.add('freie-tafel__kachel');
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        const bisherigesLabel = el.getAttribute('aria-label') ?? '';
        el.setAttribute(
          'aria-label',
          `${bisherigesLabel} – auf ein passendes Gegenstück ziehen, um es aufzulösen (oder Eingabetaste drücken)`,
        );
        el.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            versucheKeyboardAufzuloesen(tile);
          }
        });
        container.appendChild(el);
        kachelElemente.set(tile.id, el);
      }
      el.style.left = `${pos.left}px`;
      el.style.top = `${pos.top}px`;
      el.classList.toggle('freie-tafel__kachel--ausgewaehlt', auswahl.has(tile.id));
    }
    melde(details);
  }

  return {
    board,
    /**
     * @param {{punktRelativ?: {x:number,y:number}}} [opts] Runde 20: Ablage-
     *   punkt relativ zur Tafel (linke obere Ecke = {0,0}), z. B. beim Ziehen
     *   aus der Auswahl – entscheidet, ob das Plättchen einem bestehenden
     *   Stapel derselben Sorte zugeordnet wird oder (weit genug rechts davon
     *   abgelegt) einen zweiten, neuen Stapel eröffnet. Ohne Angabe (Button,
     *   Tastatur, Bulk-Befüllung) landet es im primären Stapel.
     */
    addTile(kind, sign, opts = {}) {
      let tile;
      mitUndo(() => {
        [tile] = board.add(kind, sign, 1);
        tile.stapel = bestimmeStapelIndex(board.tiles.filter((t) => t.id !== tile.id), kind, sign, opts.punktRelativ);
      });
      render();
      return tile;
    },
    /** Fügt mehrere Plättchen auf einmal hinzu, nur EIN render() danach (z. B. für "Zufällige Plättchensammlung generieren"). */
    addTiles(kachelListe) {
      mitUndo(() => {
        for (const { kind, sign } of kachelListe) board.add(kind, sign, 1);
      });
      render();
      return board.tiles;
    },
    addZeroPair(kind) {
      mitUndo(() => {
        board.add(kind, 1, 1);
        board.add(kind, -1, 1);
      });
      render();
    },
    clear() {
      mitUndo(() => { board.clear(); });
      auswahl.clear();
      render();
    },
    render,
  };
}
