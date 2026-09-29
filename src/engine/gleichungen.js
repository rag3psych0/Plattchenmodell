import { nettoKoeffizienten } from './termParser.js';
import { ganzzahligeWurzel } from './rechnen.js';

/**
 * Fachliche Logik für Äquivalenzumformungen bei Gleichungen (Runde 19,
 * Nutzer-Vorgabe): "Auf beide Seiten anwenden" wendet DIESELBE Operation auf
 * die linke UND die rechte Seite einer Gleichung an.
 *
 * Bewusste Entwurfsentscheidung: `wendeAufBeideSeitenAn` liefert die neuen
 * ROHEN Plättchen-Bestände beider Seiten – absichtlich UNVEREINFACHT. Für
 * "x+3=7" liefert das Anwenden von (−3) auf beiden Seiten also zunächst
 * "x+3−3=7−3" (mit einem noch sichtbaren, nicht automatisch aufgelösten
 * Nullpaar auf der linken Seite) – erst die Schülerin/der Schüler löst
 * dieses Nullpaar per Ziehen selbst auf (siehe shared/freieTafel.js), damit
 * jeder einzelne Schritt nachvollziehbar bleibt (Nutzer-Vorgabe). Die Engine
 * simuliert dieses Auflösen NICHT automatisch – das wäre eine mathematische
 * Handlung, die der Lernenden abgenommen würde.
 *
 * Drei Operationstypen ("9. Operationsfunktionen" der Nutzer-Vorgabe):
 * - 'addieren': `anzahl` (Default 1) gleichartige Plättchen (kind/sign)
 *   werden auf beiden Seiten zusätzlich abgelegt – deckt Addition/Subtraktion
 *   von 1/x/x² ab. Die Nutzer-Vorgabe nennt als Grund-Bausteine einzelne
 *   Plättchen ("(+1), (−1), (+x), …"); `anzahl` erlaubt, das Vorgaben-
 *   Beispiel "x+3=7, wende (−3) auf beiden Seiten an" als EINE Umformung
 *   (statt dreier einzelner Klicks) abzubilden, ohne die Grundoperation
 *   selbst zu verändern – "−3" ist schlicht dreimal "−1" auf einen Schlag.
 *   Beispiel: "−3 auf beiden Seiten" = {typ:'addieren', kind:'zahl', sign:-1, anzahl:3}.
 * - 'multiplizieren': beide Seiten werden nach dem bereits bestehenden
 *   Gruppenmodell (siehe berechneMultiplikation in rechnen.js: "a Gruppen
 *   von b Plättchen") auf `faktor` Gruppen ihres BISHERIGEN Bestands
 *   vervielfacht – bewusst keine symbolische Rechner-Operation, sondern
 *   dieselbe Darstellung wie überall sonst in der Anwendung (Nutzer-Vorgabe:
 *   "nicht lediglich ein symbolischer Taschenrechnermechanismus").
 * - 'dividieren': beide Seiten werden durch `faktor` geteilt. Dafür müssen
 *   auf BEIDEN Seiten alle drei (netto ausgewerteten) Plättchen-Sorten ohne
 *   Rest durch `faktor` teilbar sein – genau wie bei berechneDivision liefert
 *   ein nicht aufgehender Fall keine Darstellung, sondern einen erklärenden
 *   Fehler-Hinweis (`fehler:'nicht-teilbar'`), statt die Auswahl zu sperren.
 */

/** Höchst-Faktor für Multiplikation/Division auf beiden Seiten (Größenschutz, analog KM_MAX_TEIL_JE_KLAMMER/MALKREUZ_MAX_ACHSE in rechnen.js/andockRaster.js). */
export const GLEICHUNG_MAX_FAKTOR = 10;

const KIND_SYMBOL = { x2: 'x²', x: 'x', zahl: '' };
const KIND_REIHENFOLGE = ['x2', 'x', 'zahl'];

/** Kurzbeschreibung einer Operation für Umformungs-Beschriftungen, z. B. "+x", "−3", "+2x²", "· 3", ": 2". */
export function formatiereOperation(operation) {
  if (operation.typ === 'addieren') {
    const anzahl = operation.anzahl ?? 1;
    const vorzeichen = operation.sign > 0 ? '+' : '−';
    const symbol = KIND_SYMBOL[operation.kind];
    const koeffizient = operation.kind === 'zahl' ? String(anzahl) : (anzahl > 1 ? String(anzahl) : '');
    return `${vorzeichen}${koeffizient}${symbol}`;
  }
  if (operation.typ === 'multiplizieren') return `· ${operation.faktor}`;
  if (operation.typ === 'dividieren') return `: ${operation.faktor}`;
  return '';
}

/** Vervielfacht einen Plättchen-Bestand auf `faktor` Gruppen (Gruppenmodell, siehe Datei-Kommentar). */
function multipliziereTiles(tiles, faktor) {
  const ergebnis = [];
  for (let gruppe = 1; gruppe <= faktor; gruppe += 1) {
    for (const tile of tiles) ergebnis.push({ kind: tile.kind, sign: tile.sign, gruppe });
  }
  return ergebnis;
}

/** Prüft, ob alle drei (netto ausgewerteten) Plättchen-Sorten eines Bestands ohne Rest durch `faktor` teilbar sind. */
function istOhneRestTeilbar(tiles, faktor) {
  const netto = nettoKoeffizienten(tiles);
  return KIND_REIHENFOLGE.every((kind) => netto[kind] % faktor === 0);
}

/** Teilt einen Plättchen-Bestand (netto) durch `faktor` – Ergebnis ist bereits die vereinfachte, EINE verbleibende Gruppe. */
function teileTiles(tiles, faktor) {
  const netto = nettoKoeffizienten(tiles);
  const ergebnis = [];
  for (const kind of KIND_REIHENFOLGE) {
    const anteil = netto[kind] / faktor;
    if (anteil === 0) continue;
    const sign = anteil > 0 ? 1 : -1;
    for (let i = 0; i < Math.abs(anteil); i += 1) ergebnis.push({ kind, sign, gruppe: 1 });
  }
  return ergebnis;
}

/**
 * @param {{kind:string,sign:1|-1}[]} linksTiles
 * @param {{kind:string,sign:1|-1}[]} rechtsTiles
 * @param {{typ:'addieren',kind:string,sign:1|-1} | {typ:'multiplizieren',faktor:number} | {typ:'dividieren',faktor:number}} operation
 * @returns {{links:{kind:string,sign:1|-1}[]|null, rechts:{kind:string,sign:1|-1}[]|null, fehler:string|null, hinweis?:string}}
 */
export function wendeAufBeideSeitenAn(linksTiles, rechtsTiles, operation) {
  if (operation.typ === 'addieren') {
    const anzahl = operation.anzahl ?? 1;
    const neuePlaettchen = Array.from({ length: anzahl }, () => ({ kind: operation.kind, sign: operation.sign }));
    return {
      links: [...linksTiles, ...neuePlaettchen],
      rechts: [...rechtsTiles, ...neuePlaettchen.map((t) => ({ ...t }))],
      fehler: null,
    };
  }
  if (operation.typ === 'multiplizieren') {
    return {
      links: multipliziereTiles(linksTiles, operation.faktor),
      rechts: multipliziereTiles(rechtsTiles, operation.faktor),
      fehler: null,
    };
  }
  if (operation.typ === 'dividieren') {
    const linksOk = istOhneRestTeilbar(linksTiles, operation.faktor);
    const rechtsOk = istOhneRestTeilbar(rechtsTiles, operation.faktor);
    if (!linksOk || !rechtsOk) {
      const seiten = [!linksOk ? 'linken' : null, !rechtsOk ? 'rechten' : null].filter(Boolean).join(' und ');
      return {
        links: null,
        rechts: null,
        fehler: 'nicht-teilbar',
        hinweis: `Auf der ${seiten} Seite lässt sich die aktuelle Plättchen-Anzahl nicht ohne Rest durch ${operation.faktor} teilen. Wähle einen anderen Faktor, oder löse zuerst vorhandene Nullpaare auf.`,
      };
    }
    return {
      links: teileTiles(linksTiles, operation.faktor),
      rechts: teileTiles(rechtsTiles, operation.faktor),
      fehler: null,
    };
  }
  throw new Error(`Unbekannte Operation: ${operation.typ}`);
}

/** Baut den Plättchen-Bestand für `koeffizient·kind + zahl` (z. B. koeffizient=1, kind='x', zahl=3 → x, x, x oder 1 x-Plättchen? siehe unten). */
function tilesAusKoeffizient(koeffizient, kind) {
  if (koeffizient === 0) return [];
  const sign = koeffizient < 0 ? -1 : 1;
  const tiles = [];
  for (let i = 0; i < Math.abs(koeffizient); i += 1) tiles.push({ kind, sign });
  return tiles;
}

/**
 * Plant den Lösungsweg für eine einfache Gleichung der Form `a·kind + b = c`
 * (kind = 'x' oder 'x2') für die geführte Erklärung "Gleichungen" (Runde 19):
 * Schritt 1 (falls b ≠ 0) "−b auf beiden Seiten anwenden", Schritt 2 (falls
 * |a| ≠ 1) "durch a teilen". Beide Schritte nutzen exakt dieselbe
 * `wendeAufBeideSeitenAn`-Funktion wie die freie Sandbox – die geführte
 * Erklärung unterscheidet sich nur darin, dass der Lösungsweg bereits
 * feststeht, statt von der Schülerin/dem Schüler frei gewählt zu werden.
 *
 * Für `kind = 'x2'` ist "x² = wert" (Runde 19) NICHT das Ende des Lösungswegs
 * (Runde 21, Nutzer-Rückmeldung Punkt 1: "man muss am Ende auch auf x=_
 * kommen – Wurzelziehen muss vorkommen"): ein zusätzlicher Schritt zieht die
 * Wurzel und liefert – auf Nutzer-Vorgabe hin ("Zwei vollständig parallele
 * Lösungswege") – BEIDE Lösungen (+√wert und −√wert) gleichzeitig,
 * nebeneinander vollständig ausgearbeitet (Schritttyp `wurzel-ergebnis` mit
 * `zweige`, siehe unten). Ist `wert` negativ oder keine (nicht-negative)
 * Quadratzahl, liefert die Funktion – wie bei nicht aufgehender Division –
 * `schritte: null` mit passendem `fehler`-Code statt einer Darstellung.
 *
 * Bewusste Scope-Entscheidung: nur EIN Variablen-Grad (a ist der Koeffizient
 * von `kind`, die Gegenseite `c` ist eine reine Zahl) und a ≥ 1 (positiver
 * Koeffizient) – das deckt die klassische Schulform "ax + b = c" bzw.
 * "ax² + b = c" ab, für die sich ein Lösungsweg eindeutig vorausplanen
 * lässt. Allgemeinere Gleichungen (Variablen auf beiden Seiten, negative
 * Koeffizienten, gemischte Grade) bleiben Aufgabe der freien Sandbox
 * (mountGleichungenSandbox), die dieselben Operationen frei wählbar anbietet.
 *
 * @param {'x'|'x2'} kind
 * @param {number} a Koeffizient von `kind` auf der linken Seite (a ≥ 1).
 * @param {number} b Zahl-Summand auf der linken Seite.
 * @param {number} c Zahl auf der rechten Seite.
 * @returns {{schritte: object[]|null, fehler: string|null}} `fehler` kann bei
 *   `kind='x2'` zusätzlich zu `'nicht-teilbar'` auch `'keine-loesung'`
 *   (negativer Wert unter der Wurzel) oder `'keine-ganzzahlige-wurzel'`
 *   (Wert ist keine Quadratzahl) sein.
 */
export function planeGleichungsLoesung(kind, a, b, c) {
  if (!Number.isInteger(a) || a < 1) {
    return { schritte: null, fehler: 'a-ungueltig' };
  }

  let links = tilesAusKoeffizient(a, kind);
  links = links.concat(tilesAusKoeffizient(b, 'zahl'));
  let rechts = tilesAusKoeffizient(c, 'zahl');

  const symbol = KIND_SYMBOL[kind];
  const schritte = [{
    typ: 'start',
    links: [...links],
    rechts: [...rechts],
    label: `Start: ${a === 1 ? '' : a}${symbol} ${b >= 0 ? '+' : '−'} ${Math.abs(b)} = ${c}`,
  }];

  if (b !== 0) {
    const operation = { typ: 'addieren', kind: 'zahl', sign: b > 0 ? -1 : 1, anzahl: Math.abs(b) };
    const ergebnis = wendeAufBeideSeitenAn(links, rechts, operation);
    schritte.push({
      typ: 'umformung',
      operation,
      links: ergebnis.links,
      rechts: ergebnis.rechts,
      label: `${formatiereOperation(operation)} auf beiden Seiten anwenden.`,
    });
    const linksNetto = nettoKoeffizienten(ergebnis.links);
    const rechtsNetto = nettoKoeffizienten(ergebnis.rechts);
    links = [...tilesAusKoeffizient(linksNetto.x2, 'x2'), ...tilesAusKoeffizient(linksNetto.x, 'x'), ...tilesAusKoeffizient(linksNetto.zahl, 'zahl')];
    rechts = [...tilesAusKoeffizient(rechtsNetto.x2, 'x2'), ...tilesAusKoeffizient(rechtsNetto.x, 'x'), ...tilesAusKoeffizient(rechtsNetto.zahl, 'zahl')];
    schritte.push({
      typ: 'vereinfachen',
      links: [...links],
      rechts: [...rechts],
      label: 'Nullpaare auflösen.',
    });
  }

  if (a !== 1) {
    const operation = { typ: 'dividieren', faktor: a };
    const ergebnis = wendeAufBeideSeitenAn(links, rechts, operation);
    if (ergebnis.fehler) {
      return { schritte: null, fehler: 'nicht-teilbar' };
    }
    links = ergebnis.links;
    rechts = ergebnis.rechts;
    schritte.push({
      typ: 'umformung',
      operation,
      links: [...links],
      rechts: [...rechts],
      label: `${formatiereOperation(operation)} auf beiden Seiten anwenden.`,
    });
  }

  if (kind === 'x2') {
    // Runde 21 (Nutzer-Rückmeldung Punkt 1: "Bei Erklärung zu Gleichungen
    // Reiter Quadratisch muss man am Ende auch auf x=_ kommen –
    // Wurzelziehen muss vorkommen"): an dieser Stelle steht x² = wert
    // (links ist zu diesem Zeitpunkt IMMER genau ein x²-Plättchen, siehe
    // Konstruktion oben) – das ist noch NICHT die Lösung, sondern ein
    // Zwischenschritt. Das Wurzelziehen liefert ZWEI Lösungen (+√wert und
    // −√wert), die laut Nutzer-Vorgabe (Rückfrage, Antwort "Zwei vollständig
    // parallele Lösungswege") beide vollständig und gleichzeitig nebeneinander
    // dargestellt werden – siehe `typ: 'wurzel-ergebnis'` mit `zweige`
    // (Array aus zwei {label, links, rechts}) statt eines einzelnen
    // links/rechts-Paars; die aufrufende UI (modules/gleichungen/
    // erklaerung.js) muss diesen Schritttyp gesondert (zweispaltig)
    // darstellen.
    const wert = nettoKoeffizienten(rechts).zahl;
    schritte.push({
      typ: 'zwischenergebnis',
      links: [...links],
      rechts: [...rechts],
      label: `Zwischenergebnis: x² = ${wert}`,
    });

    const wurzel = ganzzahligeWurzel(wert);
    if (wurzel === null) {
      return { schritte: null, fehler: wert < 0 ? 'keine-loesung' : 'keine-ganzzahlige-wurzel' };
    }

    if (wurzel === 0) {
      // Sonderfall: +0 und −0 sind dieselbe Zahl – hier gibt es nur EINE
      // Lösung, kein Sinn in zwei identischen parallelen Wegen.
      schritte.push({
        typ: 'ergebnis',
        links: [{ kind: 'x', sign: 1 }],
        rechts: [],
        label: 'Wurzel ziehen: x² = 0 → x = 0 (einzige Lösung, da √0 = 0).',
      });
    } else {
      schritte.push({
        typ: 'wurzel-ergebnis',
        label: `Wurzel ziehen: x² = ${wert} → x = ±√${wert} = ±${wurzel}. Da sowohl (+${wurzel})² als auch (−${wurzel})² wieder ${wert} ergeben, hat die Gleichung ZWEI Lösungen.`,
        zweige: [
          {
            label: `Lösungsweg 1: x = +√${wert} = +${wurzel}`,
            links: [{ kind: 'x', sign: 1 }],
            rechts: tilesAusKoeffizient(wurzel, 'zahl'),
          },
          {
            label: `Lösungsweg 2: x = −√${wert} = −${wurzel}`,
            links: [{ kind: 'x', sign: 1 }],
            rechts: tilesAusKoeffizient(-wurzel, 'zahl'),
          },
        ],
      });
    }
  } else {
    schritte.push({
      typ: 'ergebnis',
      links: [...links],
      rechts: [...rechts],
      label: `Ergebnis: ${symbol} = ${formatiereKoeffizientForm(nettoKoeffizienten(rechts))}`,
    });
  }

  return { schritte, fehler: null };
}

function formatiereKoeffizientForm(netto) {
  const wert = netto.x2 !== 0 ? netto.x2 : netto.x !== 0 ? netto.x : netto.zahl;
  return String(wert);
}
