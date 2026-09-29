/**
 * Parst eine von Hand eingetippte Termeingabe (z. B. "2x² - x + 5" oder
 * "-x^2+4") in Koeffizienten, damit sie mit den tatsächlich ausliegenden
 * Plättchen verglichen werden kann ("Plättchen zu Term" / "Term zu
 * Plättchen"). Unterstützt sowohl das Unicode-Hochzeichen "²" als auch die
 * mit der normalen Tastatur eingebbare Schreibweise "x^2" sowie sowohl "-"
 * als auch "−" (Unicode-Minus, wie es die Term-Anzeige selbst verwendet).
 *
 * Seit Runde 16 (Nutzer-Rückmeldung: "Klammern bei Termen müssen erkannt
 * werden") versteht die Eingabe zusätzlich zwei Klammer-Formen, jeweils
 * innerhalb eines Summanden: einen (optionalen) Vorfaktor vor genau EINER
 * Klammer mit linearem Inhalt (z. B. "3(x+2)", "-(x-5)") sowie das Produkt
 * zweier linearer Klammern (z. B. "(x+3)(x-2)", auch mit Vorfaktor:
 * "2(x+1)(x-1)"). Beide Formen werden automatisch ausmultipliziert, bevor
 * die Koeffizienten wie gewohnt aufsummiert werden. Der Klammerinhalt selbst
 * bleibt bewusst auf x/Zahl (linear) beschränkt – verschachtelte oder
 * quadratische Klammerinhalte sind nicht vorgesehen, das deckt sich mit dem
 * Scope von "Klammern multiplizieren" (3.4.5), das ebenfalls nur zwei
 * lineare Faktoren kennt.
 */

const MUSTER_X2 = /^(\d+)?x(\^2|²)$/i;
const MUSTER_X = /^(\d+)?x$/i;
const MUSTER_ZAHL = /^\d+$/;
// Ein Summand mit Klammer(n): optionaler Vorfaktor, optionales Mal-/Punkt-
// zeichen, eine Pflicht-Klammer, optional eine zweite Klammer (ebenfalls mit
// optionalem Mal-/Punktzeichen davor) – keine verschachtelten Klammern.
const MUSTER_KLAMMER_SUMMAND = /^(\d+)?[*·]?\(([^()]*)\)(?:[*·]?\(([^()]*)\))?$/;

/**
 * Parst den Inhalt EINER Klammer als linearen Ausdruck (nur x/Zahl, kein x²
 * – siehe Datei-Kommentar). Nutzt dieselbe additive Tokenisierung wie
 * `parseTerm`, aber ohne Klammer-Unterstützung (Klammern dürfen nicht
 * verschachtelt werden).
 * @returns {{x:number, zahl:number} | null}
 */
function parseLineareKlammer(inhalt) {
  const bereinigt = /^[+-]/.test(inhalt) ? inhalt : `+${inhalt}`;
  const teile = bereinigt.match(/[+-][^+-]+/g);
  if (!teile || teile.join('') !== bereinigt) return null;

  const ergebnis = { x: 0, zahl: 0 };
  for (const teil of teile) {
    const vorzeichen = teil[0] === '-' ? -1 : 1;
    const rest = teil.slice(1);
    if (rest === '') return null;
    let treffer;
    if ((treffer = rest.match(MUSTER_X))) {
      ergebnis.x += vorzeichen * (treffer[1] ? Number(treffer[1]) : 1);
    } else if (MUSTER_ZAHL.test(rest)) {
      ergebnis.zahl += vorzeichen * Number(rest);
    } else {
      return null; // z. B. x² innerhalb einer Klammer – nicht unterstützt
    }
  }
  return ergebnis;
}

/** Multipliziert zwei lineare Ausdrücke ({x, zahl}) nach dem Flächenmodell aus. */
function multipliziereLinear(a, b) {
  return { x2: a.x * b.x, x: a.x * b.zahl + a.zahl * b.x, zahl: a.zahl * b.zahl };
}

/**
 * Parst einen einzelnen additiven Summanden (inkl. seines führenden
 * Vorzeichens) in Koeffizienten – entweder ein einfaches Monom (Zahl, x,
 * x²) oder eine der beiden oben beschriebenen Klammer-Formen.
 * @returns {{x2:number, x:number, zahl:number} | null}
 */
function parseSummand(summand) {
  const vorzeichen = summand[0] === '-' ? -1 : 1;
  const rest = summand.slice(1);
  if (rest === '') return null;

  let treffer;
  if ((treffer = rest.match(MUSTER_X2))) {
    return { x2: vorzeichen * (treffer[1] ? Number(treffer[1]) : 1), x: 0, zahl: 0 };
  }
  if ((treffer = rest.match(MUSTER_X))) {
    return { x2: 0, x: vorzeichen * (treffer[1] ? Number(treffer[1]) : 1), zahl: 0 };
  }
  if (MUSTER_ZAHL.test(rest)) {
    return { x2: 0, x: 0, zahl: vorzeichen * Number(rest) };
  }

  const klammerTreffer = rest.match(MUSTER_KLAMMER_SUMMAND);
  if (klammerTreffer) {
    const [, koeffStr, inhaltA, inhaltB] = klammerTreffer;
    const koeff = koeffStr ? Number(koeffStr) : 1;
    const linA = parseLineareKlammer(inhaltA);
    if (!linA) return null;
    if (inhaltB !== undefined) {
      const linB = parseLineareKlammer(inhaltB);
      if (!linB) return null;
      const produkt = multipliziereLinear(linA, linB);
      return {
        x2: vorzeichen * koeff * produkt.x2,
        x: vorzeichen * koeff * produkt.x,
        zahl: vorzeichen * koeff * produkt.zahl,
      };
    }
    return { x2: 0, x: vorzeichen * koeff * linA.x, zahl: vorzeichen * koeff * linA.zahl };
  }

  return null;
}

/**
 * Zerlegt eine (bereits normalisierte, mit führendem Vorzeichen versehene)
 * Termeingabe klammerbewusst in additive Summanden: ein "+"/"-" trennt nur
 * dann, wenn es NICHT innerhalb einer Klammer steht. Gibt bei unbalancierten
 * Klammern `null` zurück.
 * @returns {string[] | null}
 */
function zerlegeInSummanden(bereinigt) {
  const summanden = [];
  let tiefe = 0;
  let start = 0;
  for (let i = 0; i < bereinigt.length; i += 1) {
    const zeichen = bereinigt[i];
    if (zeichen === '(') tiefe += 1;
    else if (zeichen === ')') {
      tiefe -= 1;
      if (tiefe < 0) return null;
    } else if ((zeichen === '+' || zeichen === '-') && tiefe === 0 && i > start) {
      summanden.push(bereinigt.slice(start, i));
      start = i;
    }
  }
  if (tiefe !== 0) return null;
  summanden.push(bereinigt.slice(start));
  return summanden;
}

/**
 * @param {string} eingabe
 * @returns {{x2:number, x:number, zahl:number} | null} `null` bei einer
 *   Eingabe, die sich nicht als Term lesen lässt.
 */
export function parseTerm(eingabe) {
  if (typeof eingabe !== 'string') return null;
  let bereinigt = eingabe.trim();
  if (bereinigt === '') return null;

  bereinigt = bereinigt.replace(/\s+/g, '').replace(/−/g, '-');
  if (!/^[+-]/.test(bereinigt)) bereinigt = `+${bereinigt}`;

  const summanden = zerlegeInSummanden(bereinigt);
  if (!summanden || summanden.join('') !== bereinigt) return null;

  const koeffizienten = { x2: 0, x: 0, zahl: 0 };
  for (const summand of summanden) {
    const teilErgebnis = parseSummand(summand);
    if (!teilErgebnis) return null;
    koeffizienten.x2 += teilErgebnis.x2;
    koeffizienten.x += teilErgebnis.x;
    koeffizienten.zahl += teilErgebnis.zahl;
  }
  return koeffizienten;
}

/**
 * Liest die tatsächlichen, bereits vereinfachten Koeffizienten von den
 * aktuell ausliegenden Plättchen ab (Summe der Vorzeichen je Sorte) –
 * unabhängig davon, ob vorhandene Nullpaare bereits per Ziehen entfernt
 * wurden: (+1) und (-1) heben sich rechnerisch ohnehin auf.
 * @param {{kind:string, sign:1|-1}[]} tiles
 * @returns {{x2:number, x:number, zahl:number}}
 */
export function nettoKoeffizienten(tiles) {
  const ergebnis = { x2: 0, x: 0, zahl: 0 };
  for (const tile of tiles) ergebnis[tile.kind] += tile.sign;
  return ergebnis;
}

/** Vergleicht zwei Koeffizienten-Objekte ({x2, x, zahl}) auf Gleichheit. */
export function koeffizientenGleich(a, b) {
  return a.x2 === b.x2 && a.x === b.x && a.zahl === b.zahl;
}

/**
 * Parst eine Gleichungseingabe ("2x² - x + 3 = -x + 5") in zwei
 * Koeffizienten-Objekte (links/rechts). Erwartet genau ein "=".
 * @param {string} eingabe
 * @returns {{links:{x2:number,x:number,zahl:number}, rechts:{x2:number,x:number,zahl:number}} | null}
 */
export function parseGleichung(eingabe) {
  if (typeof eingabe !== 'string') return null;
  const teile = eingabe.split('=');
  if (teile.length !== 2) return null;
  const links = parseTerm(teile[0]);
  const rechts = parseTerm(teile[1]);
  if (!links || !rechts) return null;
  return { links, rechts };
}

function zufaelligeGanzzahl(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Wie `zufaelligeGanzzahl`, aber zur oberen Hälfte des Bereichs hin
 * verschoben (Maximum zweier unabhängiger Versuche). Seit Runde 21 (Punkt
 * 6/7, Nutzer-Rückmeldung: "Erhöhe die Wahrscheinlichkeit komplexerer
 * Plättchen-Aufstellungen/Terme") als gemeinsamer Baustein für alle
 * Zufallsgeneratoren dieser Datei genutzt, statt einer reinen
 * Gleichverteilung, die kleine/einfache Werte genauso häufig zöge wie große.
 */
function zufaelligeGanzzahlKomplex(min, max) {
  return Math.max(zufaelligeGanzzahl(min, max), zufaelligeGanzzahl(min, max));
}

/** Zufällige, vorzeichenbehaftete Zahl in [-maxBetrag, maxBetrag], deren
 * BETRAG zur oberen Hälfte hin verschoben ist (siehe
 * `zufaelligeGanzzahlKomplex`) – 0 bleibt weiterhin möglich. */
function zufaelligeVorzeichenbehafteteZahlKomplex(maxBetrag) {
  const betrag = zufaelligeGanzzahlKomplex(0, maxBetrag);
  return Math.random() < 0.5 ? -betrag : betrag;
}

/** Zufällige, bereits vereinfachte Koeffizienten für einen zufälligen Term. */
function zufaelligeKoeffizienten({ mitX2 = true } = {}) {
  let koeffizienten;
  do {
    koeffizienten = {
      x2: mitX2 ? zufaelligeVorzeichenbehafteteZahlKomplex(4) : 0,
      x: zufaelligeVorzeichenbehafteteZahlKomplex(6),
      zahl: zufaelligeVorzeichenbehafteteZahlKomplex(6),
    };
  } while (koeffizienten.x2 === 0 && koeffizienten.x === 0 && koeffizienten.zahl === 0);
  return koeffizienten;
}

function formatEintrag(wert, symbol) {
  const zeichen = wert > 0 ? '+' : '−';
  const abs = Math.abs(wert);
  const koeffizient = symbol === '' ? String(abs) : (abs === 1 ? '' : String(abs));
  return `${zeichen}${koeffizient}${symbol}`;
}

/** Formatiert bereits vereinfachte Koeffizienten als lesbaren Term-String. */
export function formatiereKoeffizientenAlsTerm(koeffizienten) {
  const teile = [];
  if (koeffizienten.x2 !== 0) teile.push(formatEintrag(koeffizienten.x2, 'x²'));
  if (koeffizienten.x !== 0) teile.push(formatEintrag(koeffizienten.x, 'x'));
  if (koeffizienten.zahl !== 0) teile.push(formatEintrag(koeffizienten.zahl, ''));
  return teile.length > 0 ? teile.join(' ') : '0';
}

/** Erzeugt einen zufälligen Term als String (für den "Zufällig"-Button bei "Term zu Plättchen"). */
export function erzeugeZufaelligenTerm(opts = {}) {
  return formatiereKoeffizientenAlsTerm(zufaelligeKoeffizienten(opts));
}

/** Erzeugt eine zufällige Gleichung als String (für "Gleichung zu Plättchen"). */
export function erzeugeZufaelligeGleichung(opts = {}) {
  const links = zufaelligeKoeffizienten(opts);
  const rechts = zufaelligeKoeffizienten(opts);
  return `${formatiereKoeffizientenAlsTerm(links)} = ${formatiereKoeffizientenAlsTerm(rechts)}`;
}

// Runde 21 (Punkt 6): angehoben (war x2:2, x:3, zahl:3), damit größere
// Stapel und mehr gleichzeitig offene Nullpaare möglich sind.
const KACHEL_GRENZEN = { x2: 3, x: 4, zahl: 4 };

/**
 * Erzeugt eine zufällige, NICHT zwingend schon vereinfachte Sammlung
 * physischer Plättchen (für den "Zufällige Plättchensammlung
 * generieren"-Button bei "Plättchen zu Term"/"Plättchen zu Gleichung") –
 * kann auch bereits Nullpaare enthalten, die die Schülerin/der Schüler beim
 * Ablesen selbst erkennen muss. Seit Runde 21 (Punkt 6) nutzt sowohl die
 * Anzahl positiver als auch negativer Plättchen je Sorte die nach oben
 * verschobene `zufaelligeGanzzahlKomplex` statt einer reinen
 * Gleichverteilung – das erhöht sowohl die durchschnittliche Stapelgröße
 * als auch die Wahrscheinlichkeit, dass mehrere Sorten gleichzeitig ein noch
 * unaufgelöstes Nullpaar zeigen.
 * @param {{mitX2?: boolean}} [opts]
 * @returns {{kind:string, sign:1|-1}[]}
 */
export function erzeugeZufaelligeKachelsammlung({ mitX2 = true } = {}) {
  const kinds = mitX2 ? ['x2', 'x', 'zahl'] : ['x', 'zahl'];
  let sammlung;
  do {
    sammlung = [];
    for (const kind of kinds) {
      const positiv = zufaelligeGanzzahlKomplex(0, KACHEL_GRENZEN[kind]);
      const negativ = zufaelligeGanzzahlKomplex(0, KACHEL_GRENZEN[kind]);
      for (let i = 0; i < positiv; i += 1) sammlung.push({ kind, sign: 1 });
      for (let i = 0; i < negativ; i += 1) sammlung.push({ kind, sign: -1 });
    }
  } while (sammlung.length === 0);
  return sammlung;
}

/**
 * Prüft, ob ein eingetippter Term-Text bereits VOLLSTÄNDIG vereinfacht ist:
 * jede Sorte (x², x, Zahl) darf höchstens einmal als eigener Summand
 * auftauchen (z. B. gilt "2x+3x" NICHT als vereinfacht, "5x" schon), und
 * Klammerausdrücke gelten grundsätzlich nicht als vereinfachte Form.
 *
 * Seit Runde 21 (Punkt 6, Nutzer-Rückmeldung: "Lasse als Lösung auch nur den
 * vollständig vereinfachten Term zu"): bei "Plättchen zu Term"/"Plättchen zu
 * Gleichung" reicht der reine Wertevergleich (`koeffizientenGleich`) allein
 * nicht mehr aus, da er z. B. "2x+3x" und "5x" als gleichwertig ansähe,
 * obwohl nur Letzteres eine bereits abgelesene, vereinfachte Antwort ist.
 * @param {string} eingabe
 * @returns {boolean}
 */
export function istVereinfachterTermText(eingabe) {
  if (typeof eingabe !== 'string') return false;
  let bereinigt = eingabe.trim().replace(/\s+/g, '').replace(/−/g, '-');
  if (bereinigt === '') return false;
  if (!/^[+-]/.test(bereinigt)) bereinigt = `+${bereinigt}`;

  const summanden = zerlegeInSummanden(bereinigt);
  if (!summanden || summanden.join('') !== bereinigt) return false;

  const gesehen = { x2: 0, x: 0, zahl: 0 };
  for (const summand of summanden) {
    const rest = summand.slice(1);
    if (rest === '') return false;
    if (MUSTER_X2.test(rest)) gesehen.x2 += 1;
    else if (MUSTER_X.test(rest)) gesehen.x += 1;
    else if (MUSTER_ZAHL.test(rest)) gesehen.zahl += 1;
    else return false; // Klammerform o. Ä. – nicht als vereinfachte Form akzeptiert
  }
  return gesehen.x2 <= 1 && gesehen.x <= 1 && gesehen.zahl <= 1;
}

/**
 * Prüft, ob eine Plättchen-Sammlung bereits VOLLSTÄNDIG gekürzt ist: keine
 * Sorte darf noch sowohl positive als auch negative Plättchen gleichzeitig
 * enthalten (das wäre ein noch nicht aufgelöstes Nullpaar).
 *
 * Seit Runde 21 (Punkt 7, Nutzer-Rückmeldung: "Lasse auch hier nur den
 * vollständig gekürzte Bearbeitungsfläche als Lösung zu"): bei "Term zu
 * Plättchen"/"Gleichung zu Plättchen" zählt nur die vollständig gekürzte
 * Fläche als Lösung – auch wenn der NETTO-Wert (`nettoKoeffizienten`) schon
 * vorher mit dem vorgegebenen Term/der Gleichung übereinstimmt.
 * @param {{kind:string, sign:1|-1}[]} tiles
 * @returns {boolean}
 */
export function istKachelnVollstaendigGekuerzt(tiles) {
  const zaehler = {
    x2: { pos: 0, neg: 0 },
    x: { pos: 0, neg: 0 },
    zahl: { pos: 0, neg: 0 },
  };
  for (const tile of tiles) {
    if (tile.sign > 0) zaehler[tile.kind].pos += 1;
    else zaehler[tile.kind].neg += 1;
  }
  return Object.values(zaehler).every((z) => z.pos === 0 || z.neg === 0);
}
