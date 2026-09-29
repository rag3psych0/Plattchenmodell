import { TILE_UNIT, TILE_LONG } from '../shared/theme.js';

/**
 * Reines Rechenmodell für die Multiplikation zweier Klammer-Faktoren nach
 * dem Flächenmodell ("area model") der Algebra-Kacheln: Faktor A liegt an
 * der linken Kante (senkrecht, "Zeilen"), Faktor B an der oberen Kante
 * (waagerecht, "Spalten"). Jede Zelle des entstehenden Rasters ist das
 * Produkt aus einem Zeilen- und einem Spalten-Plättchen.
 *
 * Faktoren enthalten hier nur 'zahl' und 'x' (keine x²-Plättchen) – die
 * Klammern selbst sind lineare Terme, ihr Produkt kann aber x² enthalten.
 * Das entspricht der Erweiterung "Term × Term" (z. B. (x+2)(x+3)), die auch
 * die geometrische Herleitung der quadratischen Ergänzung als Spezialfall
 * abdeckt (Faktor A = Faktor B = x + n ergibt exakt dieselbe Figur wie
 * `berechneQuadratischeErgaenzung`, siehe rechnen.js).
 */

/** Kombiniert zwei Plättchen-Arten laut Malnehmen: zahl·zahl=zahl, zahl·x=x, x·x=x². */
export function kombiniereArt(artA, artB) {
  if (artA === 'x' && artB === 'x') return 'x2';
  if (artA === 'zahl' && artB === 'zahl') return 'zahl';
  return 'x';
}

/** Vorzeichen-Regel der Multiplikation: gleiches Vorzeichen → positiv, unterschiedliches → negativ. */
export function kombiniereVorzeichen(signA, signB) {
  return signA * signB;
}

/**
 * Baut die Raster-Struktur (ohne jegliche Darstellung) aus den beiden
 * Faktoren. `zeilenTiles`/`spaltenTiles`: Arrays aus einzelnen Plättchen
 * `{kind:'zahl'|'x', sign:1|-1}`, in der Reihenfolge, in der sie im
 * jeweiligen Klammer-Fach liegen.
 *
 * @returns {{
 *   zeilen: {kind:string, sign:1|-1}[],
 *   spalten: {kind:string, sign:1|-1}[],
 *   zellen: {zeile:number, spalte:number, erwarteteArt:string, erwartetesVorzeichen:1|-1, gefuellt:boolean}[][],
 * }}
 */
export function erzeugeMultiplikationsRaster(zeilenTiles, spaltenTiles) {
  const zellen = zeilenTiles.map((zeile, i) =>
    spaltenTiles.map((spalte, j) => ({
      zeile: i,
      spalte: j,
      erwarteteArt: kombiniereArt(zeile.kind, spalte.kind),
      erwartetesVorzeichen: kombiniereVorzeichen(zeile.sign, spalte.sign),
      gefuellt: false,
    })),
  );
  return { zeilen: zeilenTiles, spalten: spaltenTiles, zellen };
}

/** Prüft, ob ein gezogenes Plättchen (kind/sign) zur erwarteten Zelle passt. */
export function zellePasstZuKachel(zelle, kandidat) {
  return zelle.erwarteteArt === kandidat.kind && zelle.erwartetesVorzeichen === kandidat.sign;
}

/** Sind alle Zellen des Rasters gefüllt? */
export function rasterVollstaendig(raster) {
  return raster.zellen.every((reihe) => reihe.every((z) => z.gefuellt));
}

/**
 * Vereinfachte Ergebnis-Koeffizienten aus einem (ggf. teilweise) gefüllten
 * Raster – Summe aller bereits korrekt gefüllten Zellen nach Art. Erlaubt,
 * den bislang erreichten Zwischenstand als Term anzuzeigen.
 * @returns {{x2:number, x:number, zahl:number}}
 */
export function koeffizientenAusRaster(raster) {
  const ergebnis = { x2: 0, x: 0, zahl: 0 };
  for (const reihe of raster.zellen) {
    for (const zelle of reihe) {
      if (!zelle.gefuellt) continue;
      ergebnis[zelle.erwarteteArt] += zelle.erwartetesVorzeichen;
    }
  }
  return ergebnis;
}

/**
 * Liefert alle bereits gefüllten Produkt-Zellen als flache Plättchen-Liste
 * (kind/sign, EIN Eintrag je gefüllter Zelle, NICHT zusammengefasst – anders
 * als `koeffizientenAusRaster`). Seit Runde 21 (Punkt 8, Nutzer-Vorgabe: "Wenn
 * man auf 'anwenden' klickt, sollen die Plättchen innerhalb des Malkreuzes
 * auf der Bearbeitungsfläche erscheinen") für den "Anwenden"-Knopf eines
 * frei bedienbaren Malkreuzes (siehe shared/andockRaster.js).
 * @returns {{kind:string, sign:1|-1}[]}
 */
export function plaettchenAusRaster(raster) {
  const ergebnis = [];
  for (const reihe of raster.zellen) {
    for (const zelle of reihe) {
      if (zelle.gefuellt) ergebnis.push({ kind: zelle.erwarteteArt, sign: zelle.erwartetesVorzeichen });
    }
  }
  return ergebnis;
}

/**
 * Leeres Raster (0 Zeilen, 0 Spalten) als Ausgangspunkt für das
 * schrittweise Andocken (siehe shared/andockRaster.js): statt beide Faktoren
 * vorab vollständig zu kennen und das Raster auf einen Schlag zu erzeugen
 * (`erzeugeMultiplikationsRaster`), wächst dieses Raster Plättchen für
 * Plättchen – eine bewusste Nutzer-Entscheidung (Runde 13), damit die
 * Andock-Geste (ein einzelnes Plättchen an die linke/obere Achse ziehen)
 * das Raster jeweils um genau eine Zeile bzw. Spalte erweitert.
 */
export function erzeugeLeeresRaster() {
  return { zeilen: [], spalten: [], zellen: [] };
}

/**
 * Hängt eine neue Zeile (Faktor-A-Plättchen) unten an ein bestehendes Raster
 * an und legt für jede bereits vorhandene Spalte die passende neue Zelle an.
 * Mutiert `raster` und gibt es zurück (Konvention wie beim übrigen Raster-
 * Zustand, dessen Zellen ebenfalls per Mutation `gefuellt` gesetzt bekommen).
 */
export function fuegeZeileHinzu(raster, zeileTile) {
  const i = raster.zeilen.length;
  raster.zeilen.push(zeileTile);
  const neueReihe = raster.spalten.map((spalte, j) => ({
    zeile: i,
    spalte: j,
    erwarteteArt: kombiniereArt(zeileTile.kind, spalte.kind),
    erwartetesVorzeichen: kombiniereVorzeichen(zeileTile.sign, spalte.sign),
    gefuellt: false,
  }));
  raster.zellen.push(neueReihe);
  return raster;
}

/**
 * Hängt eine neue Spalte (Faktor-B-Plättchen) rechts an ein bestehendes
 * Raster an und legt für jede bereits vorhandene Zeile die passende neue
 * Zelle an. Mutiert `raster` und gibt es zurück.
 */
export function fuegeSpalteHinzu(raster, spalteTile) {
  const j = raster.spalten.length;
  raster.spalten.push(spalteTile);
  raster.zeilen.forEach((zeile, i) => {
    raster.zellen[i].push({
      zeile: i,
      spalte: j,
      erwarteteArt: kombiniereArt(zeile.kind, spalteTile.kind),
      erwartetesVorzeichen: kombiniereVorzeichen(zeile.sign, spalteTile.sign),
      gefuellt: false,
    });
  });
  return raster;
}

/**
 * Entfernt die zuletzt angedockte Zeile (samt ihrer Zellen) wieder – das
 * Gegenstück zu `fuegeZeileHinzu` (Runde 16, Nutzer-Rückmeldung: "man muss
 * Plättchen wieder wegnehmen dürfen"). Da Zeilen ausschließlich am Ende
 * angehängt werden, lässt sich konsequent auch nur die LETZTE wieder
 * entfernen (LIFO) – ein Entfernen "mittendrin" würde die Zellzuordnung der
 * übrigen Zeilen durcheinanderbringen. Mutiert `raster`; bei leerem Raster
 * ohne Effekt.
 */
export function entferneLetzteZeile(raster) {
  if (raster.zeilen.length === 0) return raster;
  raster.zeilen.pop();
  raster.zellen.pop();
  return raster;
}

/**
 * Entfernt die zuletzt angedockte Spalte (samt ihrer Zelle in jeder Zeile)
 * wieder – das Gegenstück zu `fuegeSpalteHinzu`. Ebenfalls nur die LETZTE
 * Spalte (LIFO), siehe `entferneLetzteZeile`. Mutiert `raster`; bei leerem
 * Raster ohne Effekt.
 */
export function entferneLetzteSpalte(raster) {
  if (raster.spalten.length === 0) return raster;
  raster.spalten.pop();
  for (const reihe of raster.zellen) reihe.pop();
  return raster;
}

/**
 * Geometrie einer Rasterzelle nach dem Flächenmodell: Die "Länge" eines
 * Plättchens entlang seiner Achse ist bei 'x' TILE_LONG, bei 'zahl'
 * TILE_UNIT – das gilt für die Spaltenbreite (Faktor B, waagerecht) ebenso
 * wie für die Zeilenhöhe (Faktor A, senkrecht). Passt die NATÜRLICHE Größe
 * des Produkt-Plättchens nicht in die Zelle (das x-Plättchen ist von Haus
 * aus liegend, 64×32), muss es hochkant gezeichnet werden (`vertical`) –
 * das ist genau dann der Fall, wenn die Zeile 'x' und die Spalte 'zahl'
 * ist (Zelle 32 breit × 64 hoch).
 */
export function zellGeometrie(zeileKind, spalteKind) {
  const w = spaltenBreite(spalteKind);
  const h = zeilenHoehe(zeileKind);
  const vertical = zeileKind === 'x' && spalteKind === 'zahl';
  return { w, h, vertical };
}

/** Breite, die eine Spalte (Faktor B, waagerecht) je nach Plättchen-Art einnimmt. */
export function spaltenBreite(kind) {
  return kind === 'x' ? TILE_LONG : TILE_UNIT;
}

/** Höhe, die eine Zeile (Faktor A, senkrecht) je nach Plättchen-Art einnimmt. */
export function zeilenHoehe(kind) {
  return kind === 'x' ? TILE_LONG : TILE_UNIT;
}
