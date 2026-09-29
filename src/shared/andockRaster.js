import { createPlaettchenElement } from './renderPlaettchen.js';
import { TILE_UNIT } from './theme.js';
import {
  erzeugeLeeresRaster,
  fuegeZeileHinzu,
  fuegeSpalteHinzu,
  entferneLetzteZeile,
  entferneLetzteSpalte,
  zellePasstZuKachel,
  rasterVollstaendig,
  zellGeometrie,
  spaltenBreite,
  zeilenHoehe,
  plaettchenAusRaster,
} from '../engine/multiplikationRaster.js';

const PAD = 10;
const GHOST = TILE_UNIT; // Größe des "nächster Platz hier"-Andeutungsfeldes

/**
 * "Malkreuz"-Andock-Geste (Runde 14, ersetzt die Achsen-Leisten-Lösung aus
 * Runde 13 nach Nutzer-Rückmeldung: "Das komplette Andockverfahren
 * funktioniert nicht wie ich das wollte").
 *
 * Statt zweier gleichwertiger Leisten mit Beschriftung entsteht jetzt ein
 * echtes Kreuz aus zwei sich schneidenden Linien mit vier Quadranten – wie
 * beim aus der Grundschule bekannten Malkreuz:
 *
 *   oben links: ein Faktor, STEHEND, Plättchen ÜBEREINANDER gestapelt
 *               (wächst nach oben; engine-intern die "Zeilen")
 *   oben rechts: das Produkt-Raster – hier müssen die ausmultiplizierten
 *               Plättchen vom Nutzer gefunden und eingetragen werden
 *   unten links: ein festes Malzeichen ("×")
 *   unten rechts: der andere Faktor, LIEGEND, Plättchen NEBENEINANDER
 *               (wächst nach rechts; engine-intern die "Spalten")
 *
 * Angedockt wird logisch immer an die Seite des jeweils LETZTEN Plättchens
 * einer Kette (die Reihenfolge in der Kette bleibt also vorhersagbar) –
 * jede Kette zeigt dazu IMMER genau einen gestrichelten "Geister"-Platzhalter
 * direkt nach ihrem letzten Plättchen, damit sichtbar ist, wo das nächste
 * Plättchen landet. WOHIN gezogen werden darf, ist seit Runde 15 aber nicht
 * mehr auf diesen schmalen Platzhalter-Streifen beschränkt (Nutzer-
 * Rückmeldung: "keine Beschränkungen wann ich was dem Malkreuz hinzufügen
 * will") – die Trefferzone jeder Kette deckt den GESAMTEN zugehörigen
 * Quadranten ab (oben links / unten rechts), ein Loslassen an beliebiger
 * Stelle darin hängt das Plättchen trotzdem korrekt ans Ende der Kette an
 * (siehe renderKreuz).
 *
 * Die Geometrie ist bewusst maßstäblich: die stehenden Plättchen oben links
 * sind exakt so breit wie die Spalten-Zelle links von der senkrechten Linie
 * ist (TILE_UNIT), die liegenden Plättchen unten rechts exakt so hoch wie
 * der Streifen unter der waagerechten Linie (ebenfalls TILE_UNIT) – jedes
 * Produkt-Feld oben rechts sitzt exakt über "seinem" liegenden Plättchen und
 * exakt neben "seinem" stehenden Plättchen (siehe berechneLayout).
 *
 * Engine (multiplikationRaster.js) bleibt unverändert: "Zeilen" (zeilen*)
 * tragen weiterhin zur Höhe bei, "Spalten" (spalten*) weiterhin zur Breite –
 * nur ihre Position auf dem Bildschirm hat sich geändert (Zeilen jetzt oben
 * links statt links, Spalten jetzt unten rechts statt oben).
 *
 * Reine UI-/Zustands-Logik, unabhängig davon, WOHER die angedockten
 * Plättchen kommen (allgemeine Palette bei "Klammern multiplizieren", loser
 * Termvorrat bei "Division/Faktorisieren") – das entscheidet die aufrufende
 * Stelle über die Rückgabe-Methoden.
 *
 * Runde 16 (Nutzer-Rückmeldung "Rückgängig button" sowie "man muss
 * Plättchen wieder wegnehmen dürfen"): zwei optionale Zusatzfunktionen.
 * (1) Wird `opts.undo` (ein Speicher aus shared/undo.js) übergeben, zeichnet
 * jede mutierende Aktion (Zeile/Spalte andocken, Zelle füllen) ihren
 * vorherigen Gesamtzustand auf – siehe `zustandKlonen`/`stelleZustandWieder`.
 * `reset()` selbst zeichnet BEWUSST NICHTS auf (siehe dortiger Kommentar).
 * (2) Das jeweils LETZTE Plättchen der Zeilen- bzw. Spalten-Kette lässt sich
 * aus dem Malkreuz heraus ziehen und außerhalb wieder loslassen, um es zu
 * entfernen – analog zur freien Tafel (shared/freieTafel.js), aber wegen der
 * Engine-Invariante "nur anhängen" (multiplikationRaster.js) zwangsläufig nur
 * das jeweils LETZTE Kettenglied (LIFO). Bereits gefüllte Produkt-Zellen sind
 * davon bewusst AUSGENOMMEN – ihre Korrektur läuft über "Rückgängig", nicht
 * über Herausziehen (eine einzelne Zelle "freizuräumen" ohne die zugehörige
 * Zeile/Spalte zu entfernen, widerspräche der Engine-Struktur, in der jede
 * Zelle untrennbar zu ihrer Zeile und Spalte gehört). Ist eine Achse über
 * `opts.zeilenGesperrt`/`opts.spaltenGesperrt` gesperrt (siehe Division/
 * Faktorisieren, "Faktor festlegen"), gilt das Verbot für Hinzufügen UND
 * Herausziehen gleichermaßen.
 */
function tiefeKopie(wert) {
  return typeof structuredClone === 'function' ? structuredClone(wert) : JSON.parse(JSON.stringify(wert));
}

export function createAndockRasterUI(container, opts = {}) {
  const zeilenLabel = opts.zeilenLabel ?? 'ein Faktor';
  const spaltenLabel = opts.spaltenLabel ?? 'anderer Faktor';

  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <div class="malkreuz">
      <div class="malkreuz__linie malkreuz__linie--waagerecht"></div>
      <div class="malkreuz__linie malkreuz__linie--senkrecht"></div>
      <div class="malkreuz__mal">×</div>
      <span class="malkreuz__label malkreuz__label--oben-links">${zeilenLabel}</span>
      <span class="malkreuz__label malkreuz__label--unten-rechts">${spaltenLabel}</span>
      <div class="malkreuz__kette malkreuz__kette--oben-links"></div>
      <div class="malkreuz__kette malkreuz__kette--unten-rechts"></div>
      <div class="malkreuz__hitzone malkreuz__hitzone--oben-links" data-zone="zeilen"></div>
      <div class="malkreuz__hitzone malkreuz__hitzone--unten-rechts" data-zone="spalten"></div>
      <p class="andock-raster__hinweis">Noch offen – ziehe Plättchen an die gestrichelten Platzhalter-Felder am Kreuz.</p>
      <div class="andock-raster" hidden></div>
    </div>
  `);

  const malkreuzEl = container.querySelector('.malkreuz');
  const waagerechtEl = container.querySelector('.malkreuz__linie--waagerecht');
  const senkrechtEl = container.querySelector('.malkreuz__linie--senkrecht');
  const malEl = container.querySelector('.malkreuz__mal');
  const obenLinksKetteEl = container.querySelector('.malkreuz__kette--oben-links');
  const untenRechtsKetteEl = container.querySelector('.malkreuz__kette--unten-rechts');
  const obenLinksHitEl = container.querySelector('.malkreuz__hitzone--oben-links');
  const untenRechtsHitEl = container.querySelector('.malkreuz__hitzone--unten-rechts');
  const hinweisEl = container.querySelector('.andock-raster__hinweis');
  const rasterEl = container.querySelector('.andock-raster');

  let raster = erzeugeLeeresRaster();
  let naechsteZellId = 0;
  const zellTiles = new Map(); // "zeile,spalte" -> Anzeige-Id (nur fürs Rendering, keine fachliche Bedeutung)

  /** Momentaufnahme des GESAMTEN internen Zustands (Runde 16, für Undo). */
  function zustandKlonen() {
    return { raster: tiefeKopie(raster), zellTiles: new Map(zellTiles), naechsteZellId };
  }
  function stelleZustandWieder(zustand) {
    raster = zustand.raster;
    zellTiles.clear();
    for (const [k, v] of zustand.zellTiles) zellTiles.set(k, v);
    naechsteZellId = zustand.naechsteZellId;
    render();
  }
  /** Führt `aktion` aus und zeichnet (falls `opts.undo` übergeben wurde) den vorherigen Zustand auf. */
  function mitUndo(aktion) {
    if (!opts.undo) { aktion(); return; }
    const vorher = zustandKlonen();
    aktion();
    opts.undo.aufzeichnen(() => stelleZustandWieder(vorher));
  }

  /**
   * Berechnet die komplette Pixel-Geometrie des Kreuzes für den aktuellen
   * Raster-Zustand: die Kreuz-Eckposition (cx/cy), Breiten/Höhen jeder
   * Kette samt "Geister"-Platzhalter, sowie die Positionen aller einzelnen
   * Zeilen-/Spalten-Plättchen. Produkt-Zellen verwenden exakt dieselben
   * colLefts/rowTops wie die Ketten-Plättchen, damit beides bündig
   * zueinander ausgerichtet ist.
   */
  function berechneLayout() {
    const spaltenBreiten = raster.spalten.map((s) => spaltenBreite(s.kind));
    const zeilenHoehen = raster.zeilen.map((z) => zeilenHoehe(z.kind));
    const spaltenSumme = spaltenBreiten.reduce((a, b) => a + b, 0);
    const zeilenSumme = zeilenHoehen.reduce((a, b) => a + b, 0);

    const col1Breite = TILE_UNIT + PAD * 2; // oben-links-Spalte + ×-Feld: stehende Plättchen sind immer TILE_UNIT breit
    const row2Hoehe = TILE_UNIT + PAD * 2; // unten-rechts-Zeile + ×-Feld: liegende Plättchen sind immer TILE_UNIT hoch
    // Mindestgröße für Spalte 2 / Zeile 1, damit der Hinweistext im noch
    // leeren Produkt-Quadranten Platz hat, statt über den Container hinaus
    // zu laufen (sonst überlappt er die Elemente darunter).
    const col2Breite = Math.max(spaltenSumme + GHOST + PAD * 2, 190);
    const row1Hoehe = Math.max(zeilenSumme + GHOST + PAD * 2, 95);

    const cx = col1Breite;
    const cy = row1Hoehe;

    // Linke Positionen jeder Spalte (unten rechts, wächst nach rechts) –
    // dieselben Werte werden für die Produkt-Spalten wiederverwendet.
    const colLefts = [];
    let x = cx + PAD;
    for (const b of spaltenBreiten) { colLefts.push(x); x += b; }
    const spaltenGhostLeft = x;

    // Obere Positionen jeder Zeile (oben links, wächst nach oben) – Zeile 0
    // (zuerst angedockt) liegt am nächsten an der Kreuz-Ecke, also UNTEN im
    // Stapel; spätere Zeilen kommen darüber. rowTops[i] ist zugleich die
    // obere Kante von Zeilen-Plättchen i UND von Produkt-Zeile i.
    const rowTops = [];
    let laufendeHoehe = 0;
    for (const h of zeilenHoehen) {
      laufendeHoehe += h;
      rowTops.push(cy - PAD - laufendeHoehe);
    }
    const zeilenGhostTop = cy - PAD - zeilenSumme - GHOST;

    return {
      breite: col1Breite + col2Breite,
      hoehe: row1Hoehe + row2Hoehe,
      cx, cy, col1Breite, col2Breite, row1Hoehe, row2Hoehe,
      spaltenBreiten, zeilenHoehen, colLefts, rowTops,
      spaltenGhostLeft, zeilenGhostTop,
    };
  }

  function renderKreuz(layout) {
    malkreuzEl.style.width = `${layout.breite}px`;
    malkreuzEl.style.height = `${layout.hoehe}px`;

    waagerechtEl.style.top = `${layout.cy}px`;
    waagerechtEl.style.width = `${layout.breite}px`;
    senkrechtEl.style.left = `${layout.cx}px`;
    senkrechtEl.style.height = `${layout.hoehe}px`;

    malEl.style.left = `${layout.cx / 2}px`;
    malEl.style.top = `${layout.cy + layout.row2Hoehe / 2}px`;

    // --- oben links: Zeilen-Kette (stehend, übereinander) ---
    obenLinksKetteEl.innerHTML = '';
    raster.zeilen.forEach((zeile, i) => {
      const el = createPlaettchenElement(zeile.kind, zeile.sign, { scale: 1, zeigeWert: true, vertical: true });
      el.classList.add('malkreuz__kachel');
      el.style.left = `${layout.cx - PAD - TILE_UNIT}px`;
      el.style.top = `${layout.rowTops[i]}px`;
      // Runde 16: nur das LETZTE Kettenglied lässt sich herausziehen (LIFO,
      // siehe Datei-Kommentar), und nur, wenn diese Achse nicht gesperrt ist.
      if (i === raster.zeilen.length - 1 && !opts.zeilenGesperrt?.()) {
        el.classList.add('malkreuz__kachel--ziehbar');
        el.style.touchAction = 'none';
        el.addEventListener('pointerdown', (event) => starteKettenTeilDrag(event, 'zeilen'));
      }
      obenLinksKetteEl.appendChild(el);
    });
    const zeilenGhost = document.createElement('div');
    zeilenGhost.className = 'malkreuz__ghost malkreuz__ghost--oben-links';
    zeilenGhost.style.left = `${layout.cx - PAD - TILE_UNIT}px`;
    zeilenGhost.style.top = `${layout.zeilenGhostTop}px`;
    zeilenGhost.style.width = `${TILE_UNIT}px`;
    zeilenGhost.style.height = `${GHOST}px`;
    obenLinksKetteEl.appendChild(zeilenGhost);

    // Runde 15 (Nutzer-Rückmeldung: "keine Beschränkungen wann ich was dem
    // Malkreuz hinzufügen will"): die Trefferzone ist nicht mehr auf einen
    // TILE_UNIT-breiten Streifen direkt am Platzhalter beschränkt, sondern
    // deckt den GESAMTEN oben-links-Quadranten ab (von der Kreuz-Ecke bis
    // zum oberen/linken Rand). Jeder Punkt in diesem Quadranten dockt an –
    // die Zeilen-Reihenfolge selbst bleibt unverändert (immer ans Ende der
    // Kette angehängt), nur das WO des Ablegens ist jetzt frei.
    obenLinksHitEl.style.left = '0px';
    obenLinksHitEl.style.top = '0px';
    obenLinksHitEl.style.width = `${layout.cx}px`;
    obenLinksHitEl.style.height = `${layout.cy}px`;

    // --- unten rechts: Spalten-Kette (liegend, nebeneinander) ---
    untenRechtsKetteEl.innerHTML = '';
    raster.spalten.forEach((spalte, j) => {
      const el = createPlaettchenElement(spalte.kind, spalte.sign, { scale: 1, zeigeWert: true, vertical: false });
      el.classList.add('malkreuz__kachel');
      el.style.left = `${layout.colLefts[j]}px`;
      el.style.top = `${layout.cy + PAD}px`;
      if (j === raster.spalten.length - 1 && !opts.spaltenGesperrt?.()) {
        el.classList.add('malkreuz__kachel--ziehbar');
        el.style.touchAction = 'none';
        el.addEventListener('pointerdown', (event) => starteKettenTeilDrag(event, 'spalten'));
      }
      untenRechtsKetteEl.appendChild(el);
    });
    const spaltenGhost = document.createElement('div');
    spaltenGhost.className = 'malkreuz__ghost malkreuz__ghost--unten-rechts';
    spaltenGhost.style.left = `${layout.spaltenGhostLeft}px`;
    spaltenGhost.style.top = `${layout.cy + PAD}px`;
    spaltenGhost.style.width = `${GHOST}px`;
    spaltenGhost.style.height = `${TILE_UNIT}px`;
    untenRechtsKetteEl.appendChild(spaltenGhost);

    // Runde 15: analog zu oben links deckt die Trefferzone jetzt den
    // gesamten unten-rechts-Quadranten ab statt nur eines TILE_UNIT-hohen
    // Streifens direkt am Platzhalter.
    untenRechtsHitEl.style.left = `${layout.cx}px`;
    untenRechtsHitEl.style.top = `${layout.cy}px`;
    untenRechtsHitEl.style.width = `${layout.breite - layout.cx}px`;
    untenRechtsHitEl.style.height = `${layout.hoehe - layout.cy}px`;
  }

  function renderRaster(layout) {
    const offen = raster.zeilen.length > 0 && raster.spalten.length > 0;
    hinweisEl.hidden = offen;
    hinweisEl.style.left = `${layout.cx + PAD}px`;
    hinweisEl.style.top = `${PAD}px`;
    rasterEl.hidden = !offen;
    rasterEl.innerHTML = '';
    if (!offen) return;

    rasterEl.style.left = `${layout.cx}px`;
    rasterEl.style.top = '0px';
    rasterEl.style.width = `${layout.col2Breite - GHOST - PAD}px`;
    rasterEl.style.height = `${layout.row1Hoehe - PAD}px`;

    raster.zellen.forEach((reihe, i) => {
      reihe.forEach((zelle, j) => {
        const geometrie = zellGeometrie(raster.zeilen[i].kind, raster.spalten[j].kind);
        const left = layout.colLefts[j] - layout.cx;
        const top = layout.rowTops[i];
        if (zelle.gefuellt) {
          const el = createPlaettchenElement(zelle.erwarteteArt, zelle.erwartetesVorzeichen, {
            vertical: geometrie.vertical,
            id: zellTiles.get(`${i},${j}`),
          });
          el.style.position = 'absolute';
          el.style.left = `${left}px`;
          el.style.top = `${top}px`;
          rasterEl.appendChild(el);
        } else {
          const platzhalter = document.createElement('div');
          platzhalter.className = 'mult-zelle mult-zelle--leer';
          platzhalter.dataset.zeile = String(i);
          platzhalter.dataset.spalte = String(j);
          platzhalter.style.left = `${left}px`;
          platzhalter.style.top = `${top}px`;
          platzhalter.style.width = `${geometrie.w}px`;
          platzhalter.style.height = `${geometrie.h}px`;
          rasterEl.appendChild(platzhalter);
        }
      });
    });
  }

  function render(meldeOnChange = true) {
    const layout = berechneLayout();
    renderKreuz(layout);
    renderRaster(layout);
    if (meldeOnChange) opts.onChange?.(raster);
  }
  // Erst-Rendering OHNE onChange-Meldung: zum Zeitpunkt dieses Aufrufs hat
  // die aufrufende Stelle die Rückgabe dieser Funktion selbst noch nicht
  // zugewiesen – ein onChange-Callback, der darauf zugreift, würde in eine
  // "Cannot access before initialization"-Falle laufen. Die aufrufenden
  // Module rufen ihren Status daher direkt im Anschluss selbst einmal auf.
  render(false);

  function punktInRect(rectEl, punkt) {
    const rect = rectEl.getBoundingClientRect();
    return punkt.clientX >= rect.left && punkt.clientX <= rect.right
      && punkt.clientY >= rect.top && punkt.clientY <= rect.bottom;
  }

  function kurzeFehlermarkierung(zoneEl) {
    zoneEl.classList.add('malkreuz__hitzone--fehler');
    window.setTimeout(() => zoneEl.classList.remove('malkreuz__hitzone--fehler'), 500);
  }

  /**
   * Zieht das jeweils letzte Ketten-Plättchen (Runde 16); beim Loslassen
   * AUSSERHALB des gesamten Malkreuz-Elements wird es entfernt (LIFO über
   * `entferneLetzteZeile`/`entferneLetzteSpalte`), sonst springt es beim
   * anschließenden `render()` unverändert an seinen Platz zurück.
   */
  function starteKettenTeilDrag(event, achse) {
    event.preventDefault();
    event.stopPropagation();
    const el = event.currentTarget;
    const startLeft = parseFloat(el.style.left);
    const startTop = parseFloat(el.style.top);
    const startX = event.clientX;
    const startY = event.clientY;
    el.classList.add('malkreuz__kachel--dragging');

    function onMove(moveEvent) {
      el.style.left = `${startLeft + (moveEvent.clientX - startX)}px`;
      el.style.top = `${startTop + (moveEvent.clientY - startY)}px`;
    }
    function onUp(upEvent) {
      window.removeEventListener('pointermove', onMove);
      const rect = malkreuzEl.getBoundingClientRect();
      const ausserhalb = upEvent.clientX < rect.left || upEvent.clientX > rect.right
        || upEvent.clientY < rect.top || upEvent.clientY > rect.bottom;
      if (ausserhalb) {
        mitUndo(() => {
          if (achse === 'zeilen') entferneLetzteZeile(raster);
          else entferneLetzteSpalte(raster);
        });
      }
      render();
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }

  return {
    getRaster: () => raster,
    // Runde 16: für aufrufende Module, deren Sperr-Zustand
    // (`opts.zeilenGesperrt`/`opts.spaltenGesperrt`) sich ändert, OHNE dass
    // dabei eine der obigen Mutations-Methoden aufgerufen wird (z. B.
    // Division/Faktorisieren beim Klick auf "Faktor festlegen") – ohne einen
    // erneuten Aufruf würde die "ziehbar"-Markierung des letzten
    // Ketten-Plättchens (siehe renderKreuz) erst beim NÄCHSTEN Andocken
    // aktualisiert, nicht sofort.
    render: () => render(),
    // Namen bewusst beibehalten (Zeilen/Spalten = Engine-Rollen, nicht
    // Bildschirmposition) – die aufrufenden Module aus Runde 13 bleiben
    // dadurch unverändert lauffähig. Zeilen = oben links, Spalten = unten
    // rechts (siehe Datei-Kommentar oben).
    getZeilenZoneEl: () => obenLinksHitEl,
    getSpaltenZoneEl: () => untenRechtsHitEl,
    getRasterEl: () => rasterEl,

    /** Liegt `punkt` (clientX/clientY) innerhalb der übergebenen Zone (Kette + Andock-Platzhalter)? */
    punktTrifftZone(zoneEl, punkt) { return punktInRect(zoneEl, punkt); },

    // Runde 16: für aufrufende Module, die eine eigene Aktion (die NICHT
    // über spalteHinzufuegen/zeileHinzufuegen/versucheZelleFuellen läuft)
    // mit dem internen Zustand dieses Rasters bündeln müssen – siehe
    // division-faktorisieren.js (Zelle füllen ändert zusätzlich den
    // modul-eigenen Termvorrat, muss also GEMEINSAM mit dem Raster
    // rückgängig gemacht werden können).
    zustandKlonen,
    stelleZustandWieder,

    /** Liefert das leere-Zellen-Element unter `punkt`, sonst null. */
    findeZelleAnPunkt(punkt) {
      const zellen = rasterEl.querySelectorAll('.mult-zelle--leer');
      for (const zielEl of zellen) {
        if (punktInRect(zielEl, punkt)) return zielEl;
      }
      return null;
    },

    /** Hängt `typ` ({kind, sign}) an die untere rechte Kette (liegend, nebeneinander) an – x² wird abgelehnt. */
    spalteHinzufuegen(typ) {
      if (typ.kind === 'x2') { kurzeFehlermarkierung(untenRechtsHitEl); return false; }
      if (opts.spaltenGesperrt?.()) { kurzeFehlermarkierung(untenRechtsHitEl); return false; }
      mitUndo(() => { fuegeSpalteHinzu(raster, { kind: typ.kind, sign: typ.sign }); });
      render();
      return true;
    },

    /** Hängt `typ` ({kind, sign}) an die obere linke Kette (stehend, übereinander) an – x² wird abgelehnt. */
    zeileHinzufuegen(typ) {
      if (typ.kind === 'x2') { kurzeFehlermarkierung(obenLinksHitEl); return false; }
      if (opts.zeilenGesperrt?.()) { kurzeFehlermarkierung(obenLinksHitEl); return false; }
      mitUndo(() => { fuegeZeileHinzu(raster, { kind: typ.kind, sign: typ.sign }); });
      render();
      return true;
    },

    /** Versucht, das leere Zellen-Element `zielEl` mit `typ` zu befüllen. */
    versucheZelleFuellen(zielEl, typ) {
      const i = Number(zielEl.dataset.zeile);
      const j = Number(zielEl.dataset.spalte);
      const zelle = raster.zellen[i]?.[j];
      if (!zelle || zelle.gefuellt) return false;
      if (zellePasstZuKachel(zelle, typ)) {
        mitUndo(() => {
          zelle.gefuellt = true;
          naechsteZellId += 1;
          zellTiles.set(`${i},${j}`, `andock-zelle-${naechsteZellId}`);
        });
        render();
        return true;
      }
      zielEl.classList.add('mult-zelle--fehler');
      window.setTimeout(() => zielEl.classList.remove('mult-zelle--fehler'), 500);
      return false;
    },

    /** Sind mindestens eine Zeile/Spalte vorhanden UND alle Zellen gefüllt? */
    istVollstaendig() {
      return raster.zeilen.length > 0 && raster.spalten.length > 0 && rasterVollstaendig(raster);
    },

    /** Runde 21 (Punkt 8): alle bereits korrekt gefüllten Produkt-Zellen als flache Plättchen-Liste, siehe engine/multiplikationRaster.js. */
    holeProduktPlaettchen: () => plaettchenAusRaster(raster),

    // Verhält sich wie die übrigen Mutatoren (zeichnet bei vorhandenem
    // `opts.undo` einen Wiederherstellungs-Schritt auf). "Zurücksetzen"/"Neu
    // starten" sind trotzdem effektiv NICHT rückgängig machbar (Runde 16,
    // bewusste Scope-Entscheidung): die aufrufenden Module rufen bei einem
    // kompletten Neustart zusätzlich `undo.leeren()`, damit "Rückgängig"
    // danach nie auf einen Zustand VOR dem Neustart zurückspringt – siehe
    // klammern-multiplizieren.js/division-faktorisieren.js.
    reset() {
      mitUndo(() => {
        raster = erzeugeLeeresRaster();
        zellTiles.clear();
      });
      render();
    },
  };
}

/**
 * Verwaltet BELIEBIG VIELE, untereinander unabhängige Malkreuze (Runde 21,
 * Punkt 9, Nutzer-Vorgabe: "Wenn schon ein Malkreuz angezeigt wird soll
 * untendrunter ein Button erscheinen mit: 'Weiteres Malkreuz', welches ein
 * neues Malkreuz unterhalb des ersten Malkreuzes erscheinen lässt") – jedes
 * neue Malkreuz bekommt sein eigenes, komplett unabhängiges
 * `createAndockRasterUI` (eigenes Raster, eigener Undo-Verlauf über
 * `opts.undo`), das Erzeugen des NÄCHSTEN Malkreuzes hängt am jeweils
 * LETZTEN Eintrag ("+ Weiteres Malkreuz" wandert dadurch automatisch immer
 * ans Ende der wachsenden Liste). Jedes Malkreuz trägt außerdem einen
 * eigenen "Anwenden"-Knopf (Runde 21, Punkt 9, siehe `opts.aufAnwenden`).
 *
 * Bewusst NUR für frei bedienbare Malkreuze gedacht (siehe Datei-Kommentar
 * `createAndockRasterUI` und Nutzer-Antwort auf die Rückfrage zu Punkt 8:
 * "Nur bei frei bedienbaren Malkreuzen") – von `shared/freieFlaeche.js`,
 * `shared/gleichungsKette.js` und `shared/gleichungsSeitenPaar.js`
 * verwendet, NICHT von den geführten Erklärungen oder von "Klammern
 * multiplizieren"/"Division und Faktorisieren" (dort bleibt weiterhin die
 * einzelne, gesperrte bzw. dedizierte `createAndockRasterUI`-Instanz aus
 * Runde 13–16 im Einsatz).
 *
 * @param {HTMLElement} container Host-Element, wird komplett befüllt.
 * @param {{zeilenLabel?: string, spaltenLabel?: string, undo?: object, aufAnwenden?: (tiles: {kind:string,sign:1|-1}[]) => void}} [opts]
 *   `aufAnwenden`: wird beim Klick auf "Anwenden" MIT den (ggf. leeren)
 *   Produkt-Plättchen DIESES EINEN Malkreuzes aufgerufen – bei einer leeren
 *   Liste (noch keine Zelle gefüllt) wird der Knopf gar nicht erst
 *   aufgerufen, siehe unten.
 * @returns {{versucheAblegen: (typ: {kind:string,sign:1|-1}, punkt: {clientX:number,clientY:number}) => boolean}}
 */
export function createMalkreuzGruppe(container, opts = {}) {
  container.innerHTML = '';
  const eintraege = []; // { wrapperEl, andock, weiteresBtn }

  function baueEintrag() {
    // Das "+ Weiteres Malkreuz" des BISHER letzten Eintrags gehört nur so
    // lange dorthin, wie er tatsächlich der letzte ist – sobald ein neuer
    // Eintrag entsteht, wandert die Möglichkeit, ein weiteres anzuhängen,
    // zu ihm (siehe Datei-Kommentar).
    const vorheriger = eintraege[eintraege.length - 1];
    vorheriger?.weiteresBtn.remove();

    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'malkreuz-eintrag';
    if (eintraege.length > 0) {
      const trennerEl = document.createElement('div');
      trennerEl.className = 'malkreuz-eintrag__trenner';
      wrapperEl.appendChild(trennerEl);
    }

    const andockHostEl = document.createElement('div');
    wrapperEl.appendChild(andockHostEl);
    const andock = createAndockRasterUI(andockHostEl, {
      zeilenLabel: opts.zeilenLabel,
      spaltenLabel: opts.spaltenLabel,
      undo: opts.undo,
    });

    const anwendenBtn = document.createElement('button');
    anwendenBtn.type = 'button';
    anwendenBtn.className = 'malkreuz-anwenden-btn';
    anwendenBtn.textContent = 'Anwenden';
    anwendenBtn.addEventListener('click', () => {
      const tiles = andock.holeProduktPlaettchen();
      if (tiles.length === 0) return;
      opts.aufAnwenden?.(tiles);
    });
    wrapperEl.appendChild(anwendenBtn);

    const weiteresBtn = document.createElement('button');
    weiteresBtn.type = 'button';
    weiteresBtn.className = 'malkreuz-weiteres-btn';
    weiteresBtn.textContent = '+ Weiteres Malkreuz';
    weiteresBtn.addEventListener('click', baueEintrag);
    wrapperEl.appendChild(weiteresBtn);

    container.appendChild(wrapperEl);
    eintraege.push({ wrapperEl, andock, weiteresBtn });
  }

  baueEintrag();

  return {
    /**
     * Versucht `typ` bei genau EINEM der verwalteten Malkreuze abzulegen
     * (das ERSTE, dessen Zonen/Zellen den Punkt treffen – wie beim
     * ursprünglichen Einzel-Malkreuz wird ein Treffer auch dann als
     * "behandelt" gemeldet, wenn die Fachprüfung selbst ihn ablehnt, z. B.
     * x² auf einer Achse). Liefert `false`, wenn KEIN Malkreuz der Gruppe
     * getroffen wurde – die aufrufende Stelle soll dann normal an die
     * Bearbeitungsfläche weiterreichen.
     */
    versucheAblegen(typ, punkt) {
      for (const { andock } of eintraege) {
        if (andock.punktTrifftZone(andock.getZeilenZoneEl(), punkt)) { andock.zeileHinzufuegen(typ); return true; }
        if (andock.punktTrifftZone(andock.getSpaltenZoneEl(), punkt)) { andock.spalteHinzufuegen(typ); return true; }
        const zielZelle = andock.findeZelleAnPunkt(punkt);
        if (zielZelle) { andock.versucheZelleFuellen(zielZelle, typ); return true; }
      }
      return false;
    },
  };
}
