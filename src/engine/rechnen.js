import { Board } from './board.js';
import {
  erzeugeLeeresRaster,
  fuegeZeileHinzu,
  fuegeSpalteHinzu,
  koeffizientenAusRaster,
} from './multiplikationRaster.js';
import { formatiereKoeffizientenAlsTerm } from './termParser.js';

/**
 * Fachliche Logik für Modul "Addition & Subtraktion" (Phase 2).
 *
 * Beide Funktionen bauen den Rechenweg als Liste von Schritten auf –
 * jeder Schritt trägt einen Text (für das Erklär-Protokoll) und einen
 * Snapshot des Boards zu diesem Zeitpunkt (fürs schrittweise Animieren
 * in der UI). So bleibt die Engine unabhängig vom Rendering testbar.
 */

function formatSigned(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * a + b nach dem Plättchenmodell: erst |a| Plättchen mit Vorzeichen von a
 * auslegen, dann |b| Plättchen mit Vorzeichen von b dazulegen, anschließend
 * alle möglichen Nullpaare aufheben.
 */
export function berechneAddition(a, b, kind = 'zahl') {
  const board = new Board();
  const steps = [];

  const signA = a < 0 ? -1 : 1;
  const signB = b < 0 ? -1 : 1;

  if (a !== 0) {
    board.add(kind, signA, Math.abs(a));
  }
  steps.push({
    type: 'add',
    label: `Lege ${Math.abs(a)} Plättchen für ${formatSigned(a)}.`,
    snapshot: board.snapshot(),
  });

  if (b !== 0) {
    board.add(kind, signB, Math.abs(b));
  }
  steps.push({
    type: 'add',
    label: `Lege ${Math.abs(b)} Plättchen für ${formatSigned(b)} dazu.`,
    snapshot: board.snapshot(),
  });

  const pairs = board.findZeroPairs(kind);
  if (pairs.length > 0) {
    const cancelIds = pairs.flat();
    const snapshotBefore = board.snapshot();
    board.resolveZeroPairs(kind);
    steps.push({
      type: 'cancel',
      label: `${pairs.length} Nullpaar(e) heben sich gegenseitig auf (macht zusammen 0).`,
      snapshotBefore,
      cancelIds,
      snapshot: board.snapshot(),
    });
  }

  const result = board.netValue(kind);
  steps.push({
    type: 'result',
    value: result,
    label: `Ergebnis: ${formatSigned(a)} ${b >= 0 ? '+' : '-'} ${Math.abs(b)} = ${result}`,
    snapshot: board.snapshot(),
  });

  return { steps, result };
}

/**
 * a - b nach dem Plättchenmodell: erst |a| Plättchen mit Vorzeichen von a
 * auslegen. Um b wegzunehmen, werden `|b|` Plättchen mit Vorzeichen(b)
 * entfernt – reichen die vorhandenen Plättchen dieses Vorzeichens nicht
 * aus, werden vorher passend viele Nullpaare ergänzt (Kernidee des
 * Plättchenmodells für Subtraktion mit gerichteten Zahlen).
 */
export function berechneSubtraktion(a, b, kind = 'zahl') {
  const board = new Board();
  const steps = [];

  const signA = a < 0 ? -1 : 1;
  if (a !== 0) {
    board.add(kind, signA, Math.abs(a));
  }
  steps.push({
    type: 'add',
    label: `Lege ${Math.abs(a)} Plättchen für ${formatSigned(a)}.`,
    snapshot: board.snapshot(),
  });

  if (b !== 0) {
    const neededSign = b < 0 ? -1 : 1;
    const neededCount = Math.abs(b);
    const available = board.countBySignedKind(kind, neededSign);

    if (available < neededCount) {
      const missing = neededCount - available;
      board.add(kind, 1, missing);
      board.add(kind, -1, missing);
      steps.push({
        type: 'zero-pairs',
        label: `Es liegen nicht genug Plättchen zum Wegnehmen aus – ergänze ${missing} Nullpaar(e) (verändert den Wert nicht).`,
        snapshot: board.snapshot(),
      });
    }

    const removed = board.removeCount(kind, neededSign, neededCount).map((t) => t.id);
    steps.push({
      type: 'remove',
      label: `Nimm ${neededCount} Plättchen (${neededSign > 0 ? '+' : '−'}) weg – das entspricht −(${formatSigned(b)}).`,
      removedIds: removed,
      snapshot: board.snapshot(),
    });
  }

  const result = board.netValue(kind);
  steps.push({
    type: 'result',
    value: result,
    label: `Ergebnis: ${formatSigned(a)} - (${formatSigned(b)}) = ${result}`,
    snapshot: board.snapshot(),
  });

  return { steps, result };
}

/**
 * Schreibweise für Faktoren in der Ergebniszeile: IMMER geklammert und mit
 * explizitem Vorzeichen, auch bei positiven Zahlen ("(+3) × (−4)") – Runde
 * 20 (Nutzer-Rückmeldung Punkt 1: "Schreibe die Zahlen in Klammern
 * zusätzlich mit den Vorzeichen"). Vorher zeigte diese Funktion nur bei
 * negativen Zahlen Klammern (und dort auch nur, weil das Minuszeichen
 * ohnehin schon Teil der Zahl ist) – positive Zahlen blieben ohne Klammern
 * und ohne "+" stehen, was inkonsistent zur übrigen, stets signierten
 * Schreibweise (`formatSigned`) an anderer Stelle der Rechenwege war.
 */
function formatFactor(n) {
  return `(${n >= 0 ? '+' : ''}${n})`;
}

/**
 * a × b nach dem Plättchenmodell: "a Gruppen von b Plättchen".
 * - a ist positiv → a mal eine Gruppe von |b| Plättchen (Vorzeichen von b)
 *   dazulegen (wiederholte Addition).
 * - a ist negativ → |a| mal eine solche Gruppe WEGNEHMEN. Da das Board dafür
 *   anfangs leer ist, werden vorher genug Nullpaare ergänzt (dieselbe Idee
 *   wie bei der Subtraktion), damit überhaupt etwas entfernt werden kann.
 * - a = 0 oder b = 0 → es wird nichts ausgelegt, Ergebnis 0.
 */
export function berechneMultiplikation(a, b, kind = 'zahl') {
  const board = new Board();
  const steps = [];

  if (a === 0 || b === 0) {
    steps.push({
      type: 'info',
      label: a === 0
        ? '0 Gruppen bedeuten: es wird nichts ausgelegt.'
        : 'Jede Gruppe hat die Größe 0 – es wird nichts ausgelegt.',
      snapshot: board.snapshot(),
    });
  } else if (a > 0) {
    const signB = b < 0 ? -1 : 1;
    for (let i = 1; i <= a; i += 1) {
      const neu = board.add(kind, signB, Math.abs(b));
      for (const tile of neu) tile.gruppe = i;
      steps.push({
        type: 'add',
        label: `Gruppe ${i} von ${a}: lege ${Math.abs(b)} Plättchen für ${formatSigned(b)} dazu.`,
        snapshot: board.snapshot(),
      });
    }
  } else {
    const groupsCount = Math.abs(a);
    const groupSize = Math.abs(b);
    const groupSign = b < 0 ? -1 : 1;
    const zeroPairsNeeded = groupsCount * groupSize;
    // Nullpaare werden PRO Gruppe ergänzt (und entsprechend markiert), damit
    // jede Gruppe beim Wegnehmen eindeutig zuordenbar bleibt – erzählerisch
    // bleibt es aber EIN gemeinsamer Schritt (wie zuvor).
    for (let i = 1; i <= groupsCount; i += 1) {
      const pos = board.add(kind, 1, groupSize);
      const neg = board.add(kind, -1, groupSize);
      for (const tile of pos) tile.gruppe = i;
      for (const tile of neg) tile.gruppe = i;
    }
    steps.push({
      type: 'zero-pairs',
      label: `${a} Gruppen bedeutet: ${groupsCount} Gruppe(n) von ${groupSize} Plättchen (${formatSigned(b)}) wegnehmen. Es liegen noch keine da – ergänze ${zeroPairsNeeded} Nullpaar(e) (verändert den Wert nicht).`,
      snapshot: board.snapshot(),
    });
    for (let i = 1; i <= groupsCount; i += 1) {
      // Gruppen-bewusstes Wegnehmen: nur die Plättchen DIESER Gruppe entfernen
      // (statt `removeCount`, das nicht zwischen Gruppen unterscheidet).
      const zuEntfernen = board.tiles.filter(
        (t) => t.kind === kind && t.sign === groupSign && t.gruppe === i,
      );
      for (const tile of zuEntfernen) board.removeById(tile.id);
      steps.push({
        type: 'remove',
        label: `Nimm Gruppe ${i} von ${groupsCount} weg: ${groupSize} Plättchen (${groupSign > 0 ? '+' : '−'}).`,
        snapshot: board.snapshot(),
      });
    }
  }

  const result = board.netValue(kind);
  steps.push({
    type: 'result',
    value: result,
    label: `Ergebnis: ${formatFactor(a)} × ${formatFactor(b)} = ${result}`,
    snapshot: board.snapshot(),
  });

  return { steps, result };
}

/**
 * a ÷ b nach dem Plättchenmodell: Division als Umkehrung der Multiplikation.
 * Gesucht ist c mit c × b = a – die Darstellung ist deshalb exakt dieselbe
 * wie bei `berechneMultiplikation(c, b)`, nur mit einer einleitenden Zeile,
 * die die Fragestellung als Division formuliert ("wie viele Gruppen von b
 * ergeben zusammen a?"), und einer abschließenden Ergebniszeile in
 * Divisionsschreibweise.
 *
 * Nicht ohne Rest teilbare Aufgaben (z. B. 7 ÷ 2) und Division durch 0
 * werden bewusst NICHT dargestellt, sondern als eigener Fehler-Schritt ohne
 * Plättchen zurückgegeben (`fehler` ist dann gesetzt) – das Darstellen von
 * Resten mit dem Plättchenmodell ist ein eigenes, hier noch nicht
 * umgesetztes Teilthema.
 */
export function berechneDivision(a, b, kind = 'zahl') {
  if (b === 0) {
    return {
      steps: [{ type: 'error', label: 'Division durch 0 ist nicht möglich.', snapshot: [] }],
      result: null,
      fehler: 'durch-null',
    };
  }
  if (a % b !== 0) {
    return {
      steps: [{
        type: 'error',
        label: `${a} lässt sich nicht ohne Rest durch ${b} teilen. Wähle andere Zahlen (z. B. ${b * Math.round(a / b)} ÷ ${b}).`,
        snapshot: [],
      }],
      result: null,
      fehler: 'nicht-teilbar',
    };
  }

  const quotient = a / b;
  const { steps: multSteps } = berechneMultiplikation(quotient, b, kind);
  const steps = multSteps.map((step) => ({ ...step }));
  steps.unshift({
    type: 'info',
    label: `Um ${a} ÷ ${b} zu bestimmen, legen wir Gruppen von ${Math.abs(b)} Plättchen (${formatSigned(b)}), bis wir ${a} erreicht haben.`,
    snapshot: [],
  });
  steps[steps.length - 1] = {
    ...steps[steps.length - 1],
    label: `Ergebnis: ${a} ÷ ${b} = ${quotient} (denn ${formatFactor(quotient)} × ${formatFactor(b)} = ${a})`,
  };

  return { steps, result: quotient, fehler: null };
}

/**
 * Bildet die Quadratzahl a² nach dem Plättchenmodell (Runde 21, Nutzer-
 * Vorgabe Punkt 2/3: eigener Unterreiter "Quadrat" unter Multiplikation &
 * Division samt Erklärung "eine Quadratzahl bilden") – ein bewusster
 * Spezialfall von `berechneMultiplikation` mit b=a ("a Gruppen von a
 * Plättchen"), keine eigene Darstellungslogik. Nur die Start- und
 * Ergebniszeile werden umformuliert, damit das Quadrieren (statt einer
 * allgemeinen Multiplikation zweier möglicherweise unterschiedlicher
 * Faktoren) klar als eigenes Thema erkennbar ist.
 */
export function berechneQuadratzahl(a) {
  const { steps, result } = berechneMultiplikation(a, a);
  const ergebnisIndex = steps.length - 1;
  const neueSteps = steps.map((step, i) => {
    if (i === 0) {
      return {
        ...step,
        label: `${formatFactor(a)}² bedeutet ${formatFactor(a)} × ${formatFactor(a)} – also ${Math.abs(a)} Gruppen von ${Math.abs(a)} Plättchen. ${step.label}`,
      };
    }
    if (i === ergebnisIndex) {
      return { ...step, label: `Ergebnis: ${formatFactor(a)}² = ${result}` };
    }
    return step;
  });
  return { steps: neueSteps, result };
}

/**
 * Zieht die (ganzzahlige) Quadratwurzel aus einer nicht-negativen Zahl `n`
 * nach dem Plättchenmodell (Runde 21, Nutzer-Vorgabe Punkt 2/3: eigener
 * Unterreiter "Quadratwurzel" samt Erklärung "Wurzel bilden") – als
 * Umkehrung des Quadrierens (siehe `berechneQuadratzahl`): gesucht ist die
 * Zahl a mit a² = n. Die Darstellung ist deshalb exakt dieselbe wie bei
 * `berechneQuadratzahl(a)` (a Gruppen von a Plättchen), nur mit einer
 * einleitenden Zeile, die die Fragestellung als Wurzelziehen formuliert, und
 * einer abschließenden Ergebniszeile in Wurzelschreibweise – dasselbe
 * Muster wie `berechneDivision` als Umkehrung von `berechneMultiplikation`.
 *
 * Bewusste Scope-Entscheidung: nur nicht-negative ganze Quadratzahlen (kein
 * Runden, keine Dezimalzahlen, keine negativen Radikanden) lassen sich mit
 * ganzen Plättchen darstellen – wie bei nicht aufgehender Division liefert
 * ein ungültiger Fall statt einer Darstellung einen eigenen Fehler-Schritt
 * (`fehler`-Flag).
 */
export function berechneWurzel(n) {
  if (!Number.isInteger(n) || n < 0) {
    return {
      steps: [{
        type: 'error',
        label: `Aus ${n} lässt sich mit ganzen Plättchen keine Quadratwurzel ziehen – wähle eine nicht-negative ganze Zahl.`,
        snapshot: [],
      }],
      result: null,
      fehler: 'ungueltig',
    };
  }
  const wurzel = Math.round(Math.sqrt(n));
  if (wurzel * wurzel !== n) {
    return {
      steps: [{
        type: 'error',
        label: `${n} ist keine Quadratzahl – die Wurzel lässt sich nicht als ganze Zahl (mit ganzen Plättchen) darstellen. Wähle eine Quadratzahl (z. B. ${wurzel * wurzel} oder ${(wurzel + 1) ** 2}).`,
        snapshot: [],
      }],
      result: null,
      fehler: 'keine-quadratzahl',
    };
  }

  const { steps: quadratSteps } = berechneQuadratzahl(wurzel);
  const steps = quadratSteps.map((step) => ({ ...step }));
  steps.unshift({
    type: 'info',
    label: `Um √${n} zu bestimmen, suchen wir eine Zahl a mit a² = ${n} und stellen deren Quadrat als "a Gruppen von a" dar.`,
    snapshot: [],
  });
  steps[steps.length - 1] = {
    ...steps[steps.length - 1],
    label: `Ergebnis: √${n} = ${wurzel} (denn ${formatFactor(wurzel)}² = ${n})`,
  };

  return { steps, result: wurzel, fehler: null };
}

/**
 * Ermittelt die ganzzahlige Quadratwurzel einer nicht-negativen Ganzzahl,
 * sofern sie exakt aufgeht (sonst `null`) – Hilfsfunktion für das
 * Wurzelziehen bei quadratischen Gleichungen (Runde 21, Nutzer-Vorgabe
 * Punkt 1, siehe `planeGleichungsLoesung` in engine/gleichungen.js) und für
 * `berechneWurzel` oben.
 */
export function ganzzahligeWurzel(wert) {
  if (!Number.isInteger(wert) || wert < 0) return null;
  const wurzel = Math.round(Math.sqrt(wert));
  return wurzel * wurzel === wert ? wurzel : null;
}

/**
 * Quadratische Ergänzung von x² + px nach dem Plättchenmodell (klassisches
 * geometrisches Bild): ein x²-Plättchen wird zu einem Quadrat mit Seite
 * (x + p/2) vervollständigt, indem die p x-Plättchen hälftig an zwei Seiten
 * des Quadrats angelegt werden und die verbleibende Ecke (Seitenlänge
 * |p/2|, also (p/2)² Eins-Plättchen) aufgefüllt wird:
 *
 *   x² + px + (p/2)² = (x + p/2)²
 *
 * Jedes Plättchen bekommt ein `.bereich`-Feld ('quadrat' / 'seite-a' /
 * 'seite-b' / 'ecke'), damit die UI die charakteristische Quadrat-Form
 * (statt eines einfachen Flusses) darstellen kann – analog zum
 * `.gruppe`-Feld bei `berechneMultiplikation`.
 *
 * Bewusste Scope-Entscheidung: `p` muss eine gerade Zahl ungleich 0 sein.
 * Bei p = 0 ist x² bereits ein vollständiges Quadrat (nichts zu ergänzen);
 * bei ungeradem p wäre p/2 kein ganzes Plättchen mehr darstellbar. Beide
 * Fälle liefern statt einer Darstellung einen eigenen Fehler-Schritt
 * (`fehler`-Flag), keine Rundung o. Ä. – dieselbe Idee wie bei Division
 * durch 0 / nicht ohne Rest teilbarer Division.
 *
 * Seit Runde 20 (Nutzer-Rückmeldung Punkt 3: "Mache die Erklärung über eine
 * Startgleichung anstatt ein p. Es darf dabei auch ein Rest geben") geht die
 * Darstellung von einer vollständigen Startgleichung `x² + p·x + c` aus,
 * statt nur von `p` (das bis dahin implizit den "passenden" Wert `(p/2)²`
 * für die Ecke unterstellte). Die geometrische Konstruktion selbst (Quadrat,
 * zwei Seiten, Ecke) hängt weiterhin AUSSCHLIESSLICH von `p` ab – die Ecke
 * wird immer exakt mit `(p/2)²` Eins-Plättchen gefüllt, damit stets ein
 * vollständiges Quadrat `(x + p/2)²` entsteht (Nutzer-Vorgabe: der Rest darf
 * NUR bei den ±1-Plättchen auftreten, nicht als halbes x-Plättchen – die
 * Gerade-Zahl-Pflicht für `p` bleibt also unverändert bestehen). Die
 * Differenz `rest = c − (p/2)²` zwischen der tatsächlich in der
 * Startgleichung vorhandenen Konstante `c` und der für die Ecke benötigten
 * Konstante `(p/2)²` wird als EIGENE Gruppe (`.bereich = 'rest'`) NEBEN dem
 * fertigen Quadrat dargestellt, positiv wie negativ (Klärung vor Umsetzung,
 * Rückfrage 4: negativer Rest ist ausdrücklich erlaubt, z. B.
 * x² + 4x + 2 → (x + 2)² − 2). Ist `c` nicht angegeben, entspricht das
 * Verhalten exakt der ursprünglichen Fassung (`c = (p/2)²`, kein Rest).
 */
export function berechneQuadratischeErgaenzung(p, c = Number.isInteger(p / 2) ? (p / 2) ** 2 : NaN) {
  if (p === 0) {
    return {
      steps: [{
        type: 'error',
        label: 'Wähle ein p ungleich 0 – bei p = 0 ist x² bereits ein vollständiges Quadrat, es gibt nichts zu ergänzen.',
        snapshot: [],
      }],
      result: null,
      fehler: 'p-null',
    };
  }
  if (p % 2 !== 0) {
    return {
      steps: [{
        type: 'error',
        label: `${p} ist ungerade – die Hälfte (${p}/2) wäre kein ganzes Plättchen mehr. Wähle eine gerade Zahl für p (z. B. ${p > 0 ? p + 1 : p - 1}).`,
        snapshot: [],
      }],
      result: null,
      fehler: 'p-ungerade',
    };
  }
  if (!Number.isInteger(c)) {
    return {
      steps: [{
        type: 'error',
        label: 'Bitte für c eine ganze Zahl eingeben.',
        snapshot: [],
      }],
      result: null,
      fehler: 'c-ungueltig',
    };
  }

  const board = new Board();
  const steps = [];

  const half = p / 2;
  const seitenAnzahl = Math.abs(half);
  const signP = p < 0 ? -1 : 1;
  const vorzeichenP = p >= 0 ? '+' : '-';
  const vorzeichenC = c >= 0 ? '+' : '-';

  steps.push({
    type: 'start',
    label: `Wir gehen aus von x² ${vorzeichenP} ${Math.abs(p)}x ${vorzeichenC} ${Math.abs(c)} und legen zunächst ein x²-Plättchen (die Fläche x²).`,
    snapshot: (() => { const [t] = board.add('x2', 1, 1); t.bereich = 'quadrat'; return board.snapshot(); })(),
  });

  const xTiles = board.add('x', signP, Math.abs(p));
  for (const tile of xTiles) tile.bereich = 'linear';
  steps.push({
    type: 'add-linear',
    label: `Lege ${Math.abs(p)} x-Plättchen für ${formatSigned(p)}x dazu (das entspricht x² ${p >= 0 ? '+' : '-'} ${Math.abs(p)}x).`,
    snapshot: board.snapshot(),
  });

  xTiles.forEach((tile, i) => {
    tile.bereich = i < seitenAnzahl ? 'seite-a' : 'seite-b';
  });
  steps.push({
    type: 'split',
    label: `Um ein Quadrat zu vervollständigen, teilen wir die ${Math.abs(p)} x-Plättchen in zwei Hälften zu je ${seitenAnzahl} und legen sie an zwei Seiten des x²-Quadrats an.`,
    snapshot: board.snapshot(),
  });

  const ergaenzung = seitenAnzahl * seitenAnzahl;
  steps.push({
    type: 'ecke-hinweis',
    label: `Jetzt fehlt noch die Ecke: ein Quadrat mit Seitenlänge ${seitenAnzahl}, also ${ergaenzung} Eins-Plättchen.`,
    snapshot: board.snapshot(),
    zeigeEckePlatzhalter: true,
  });

  const eckeTiles = board.add('zahl', 1, ergaenzung);
  for (const tile of eckeTiles) tile.bereich = 'ecke';
  steps.push({
    type: 'ergaenzen',
    label: `Wir ergänzen ${ergaenzung} Plättchen, um das Quadrat zu vervollständigen (deshalb heißt es "quadratische Ergänzung").`,
    snapshot: board.snapshot(),
  });

  const rest = c - ergaenzung;
  if (rest !== 0) {
    const restVorzeichen = rest > 0 ? 1 : -1;
    steps.push({
      type: 'rest-hinweis',
      label: rest > 0
        ? `Die Startgleichung hatte c = ${c}, für die Ecke brauchten wir aber nur ${ergaenzung} – es bleiben ${rest} Eins-Plättchen übrig, die NICHT zum Quadrat gehören.`
        : `Die Startgleichung hatte c = ${c}, für die Ecke brauchten wir aber ${ergaenzung} – es fehlen ${Math.abs(rest)} Plättchen. Wir zeigen das Quadrat trotzdem vollständig und stellen die fehlende Menge als NEGATIVEN Rest daneben dar.`,
      snapshot: board.snapshot(),
    });
    const restTiles = board.add('zahl', restVorzeichen, Math.abs(rest));
    for (const tile of restTiles) tile.bereich = 'rest';
    steps.push({
      type: 'rest-legen',
      label: `Rest: ${formatSigned(rest)} (neben dem Quadrat, nicht Teil davon).`,
      snapshot: board.snapshot(),
    });
  }

  const vorzeichenHalf = half >= 0 ? '+' : '-';
  const restText = rest !== 0 ? ` ${rest > 0 ? '+' : '−'} ${Math.abs(rest)}` : '';
  steps.push({
    type: 'result',
    label: `x² ${vorzeichenP} ${Math.abs(p)}x ${vorzeichenC} ${Math.abs(c)} = (x ${vorzeichenHalf} ${seitenAnzahl})²${restText}`,
    snapshot: board.snapshot(),
  });

  // `result` bleibt wie vor Runde 20 die Anzahl der Ecke-Plättchen (Zahl) –
  // Bestandsschutz für bestehende Tests/Aufrufer. `rest` ist ein neues,
  // separates Feld (0, wenn c weggelassen oder exakt (p/2)² entspricht).
  return { steps, result: ergaenzung, rest, fehler: null };
}

/** Höchstzahl an Plättchen, die eine einzelne Klammer bei der geführten Erklärung haben darf (siehe `berechneKlammernMultiplikation`). */
const KM_MAX_TEIL_JE_KLAMMER = 6;

/**
 * Zerlegt eine bereits geparste lineare Klammer ({x, zahl}) in einzelne
 * Plättchen – erst die x-Plättchen (falls vorhanden), dann die Zahl-
 * Plättchen, jeweils mit dem Vorzeichen ihres Koeffizienten. Eine Klammer
 * wie "2x − 3" wird so zu [x(+1), x(+1), zahl(−1), zahl(−1), zahl(−1)].
 */
function tilesAusLinearerKlammer({ x, zahl }) {
  const tiles = [];
  if (x !== 0) {
    const sign = x < 0 ? -1 : 1;
    for (let i = 0; i < Math.abs(x); i += 1) tiles.push({ kind: 'x', sign });
  }
  if (zahl !== 0) {
    const sign = zahl < 0 ? -1 : 1;
    for (let i = 0; i < Math.abs(zahl); i += 1) tiles.push({ kind: 'zahl', sign });
  }
  return tiles;
}

/** Kurzbeschreibung eines einzelnen Plättchens für die Rechenweg-Zeilen, z. B. "+x" oder "−1". */
function tileBeschreibung({ kind, sign }) {
  const vorzeichen = sign > 0 ? '+' : '−';
  const symbol = kind === 'x2' ? 'x²' : kind === 'x' ? 'x' : '1';
  return `${vorzeichen}${symbol}`;
}

/** Formatiert eine bereits geparste lineare Klammer ({x, zahl}) als lesbaren, geklammerten Term, z. B. "(x − 2)". */
function formatiereKlammer(koeffizienten) {
  return `(${formatiereKoeffizientenAlsTerm({ x2: 0, x: koeffizienten.x, zahl: koeffizienten.zahl })})`;
}

/**
 * Rechenweg für "Multiplikation von Klammern/Das Malkreuz" (Erklärungen,
 * Runde 18, Nutzer-Rückmeldung Punkt 3): zwei lineare Klammern (je `{x,
 * zahl}`, kein x²) werden Schritt für Schritt am Malkreuz aufgebaut – erst
 * Klammer A Plättchen für Plättchen an die Zeilen-Kette (oben links), dann
 * Klammer B an die Spalten-Kette (unten rechts), anschließend jede
 * Produkt-Zelle einzeln (Zeile für Zeile) gefüllt, zuletzt das
 * ausmultiplizierte Ergebnis.
 *
 * Anders als bei den übrigen `berechne*`-Funktionen enthält jeder Schritt
 * statt eines Board-Snapshots einen Snapshot des Malkreuz-`raster`
 * (`erzeugeLeeresRaster`/`fuegeZeileHinzu`/`fuegeSpalteHinzu` aus
 * multiplikationRaster.js) – die aufrufende UI wandelt das bei Bedarf in
 * den von `createAndockRasterUI`s `stelleZustandWieder` erwarteten Zustand
 * um (siehe erklaerungen/klammern-multiplizieren.js).
 *
 * Beide Klammern müssen mindestens einen von 0 verschiedenen Koeffizienten
 * haben (sonst wäre die Klammer schlicht "0") und höchstens
 * `KM_MAX_TEIL_JE_KLAMMER` Plättchen umfassen (sonst würde das Malkreuz für
 * eine geführte, Schritt-für-Schritt angeklickte Erklärung zu groß) – beide
 * Fälle liefern statt einer Darstellung einen eigenen Fehler-Schritt
 * (`fehler`-Flag), dieselbe Idee wie bei Division durch 0 o. Ä.
 *
 * @param {{x:number, zahl:number}} faktorA
 * @param {{x:number, zahl:number}} faktorB
 */
export function berechneKlammernMultiplikation(faktorA, faktorB) {
  const tilesA = tilesAusLinearerKlammer(faktorA);
  const tilesB = tilesAusLinearerKlammer(faktorB);

  if (tilesA.length === 0 || tilesB.length === 0) {
    return {
      steps: [{
        type: 'error',
        label: 'Beide Klammern brauchen mindestens einen Koeffizienten ungleich 0.',
        raster: erzeugeLeeresRaster(),
      }],
      ergebnis: null,
      fehler: 'leer',
    };
  }
  if (tilesA.length > KM_MAX_TEIL_JE_KLAMMER || tilesB.length > KM_MAX_TEIL_JE_KLAMMER) {
    return {
      steps: [{
        type: 'error',
        label: `Für diese Klammern wäre das Malkreuz zu groß, um es Schritt für Schritt zu verfolgen – wähle kleinere Zahlen (höchstens ${KM_MAX_TEIL_JE_KLAMMER} Plättchen je Klammer).`,
        raster: erzeugeLeeresRaster(),
      }],
      ergebnis: null,
      fehler: 'zu-gross',
    };
  }

  const steps = [];
  const klammerAText = formatiereKlammer(faktorA);
  const klammerBText = formatiereKlammer(faktorB);

  let raster = erzeugeLeeresRaster();
  steps.push({
    type: 'start',
    label: `Wir multiplizieren die Klammern ${klammerAText} und ${klammerBText} mit dem Malkreuz: Klammer A steht oben links, Klammer B liegt unten rechts.`,
    raster,
  });

  tilesA.forEach((tile, i) => {
    raster = fuegeZeileHinzu(strukturKopie(raster), tile);
    steps.push({
      type: 'dock-zeile',
      label: `Klammer A, Teil ${i + 1} von ${tilesA.length}: ein ${tileBeschreibung(tile)}-Plättchen kommt stehend ans Malkreuz (oben links).`,
      raster,
    });
  });

  tilesB.forEach((tile, j) => {
    raster = fuegeSpalteHinzu(strukturKopie(raster), tile);
    steps.push({
      type: 'dock-spalte',
      label: `Klammer B, Teil ${j + 1} von ${tilesB.length}: ein ${tileBeschreibung(tile)}-Plättchen kommt liegend ans Malkreuz (unten rechts).`,
      raster,
    });
  });

  raster.zellen.forEach((reihe, i) => {
    reihe.forEach((zelle, j) => {
      const naechstesRaster = strukturKopie(raster);
      naechstesRaster.zellen[i][j].gefuellt = true;
      raster = naechstesRaster;
      const zeileBeschreibung = tileBeschreibung(raster.zeilen[i]);
      const spalteBeschreibung = tileBeschreibung(raster.spalten[j]);
      const produktBeschreibung = tileBeschreibung({ kind: zelle.erwarteteArt, sign: zelle.erwartetesVorzeichen });
      steps.push({
        type: 'fill-cell',
        label: `Zeile ${i + 1} mal Spalte ${j + 1}: ${zeileBeschreibung} mal ${spalteBeschreibung} ergibt ein ${produktBeschreibung}-Plättchen im Produkt-Raster.`,
        raster,
      });
    });
  });

  const ergebnis = koeffizientenAusRaster(raster);
  steps.push({
    type: 'result',
    label: `Ergebnis: ${klammerAText} · ${klammerBText} = ${formatiereKoeffizientenAlsTerm(ergebnis)}`,
    raster,
  });

  return { steps, ergebnis, fehler: null };
}

/** Tiefe Kopie eines Malkreuz-Rasters (für unveränderliche Schritt-Snapshots, siehe `berechneKlammernMultiplikation`). */
function strukturKopie(wert) {
  return typeof structuredClone === 'function' ? structuredClone(wert) : JSON.parse(JSON.stringify(wert));
}
