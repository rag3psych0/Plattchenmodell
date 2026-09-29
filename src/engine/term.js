/**
 * Liest aus den aktuell ausliegenden Plättchen den dargestellten Term ab –
 * OHNE ihn zu vereinfachen. Positive und negative Plättchen desselben Typs
 * werden also nicht gegeneinander aufgerechnet (das übernimmt die
 * Nullpaar-Erkennung, wenn die Schülerin/der Schüler sie tatsächlich
 * zusammenschiebt) – hier wird nur gezählt und aufgeschrieben, was gerade
 * auf der Fläche liegt.
 */

const REIHENFOLGE = ['x2', 'x', 'zahl'];
const SYMBOL = { x2: 'x²', x: 'x', zahl: '' };

/**
 * @param {{kind:string, sign:1|-1}[]} tiles
 * @returns {string} z. B. "+x² −x² +3x −2"
 */
export function termAusBoard(tiles) {
  const teile = [];
  for (const kind of REIHENFOLGE) {
    const positiv = tiles.filter((t) => t.kind === kind && t.sign === 1).length;
    const negativ = tiles.filter((t) => t.kind === kind && t.sign === -1).length;
    if (positiv > 0) teile.push(formatiereTeil(1, positiv, kind));
    if (negativ > 0) teile.push(formatiereTeil(-1, negativ, kind));
  }
  return teile.length > 0 ? teile.join(' ') : '0';
}

function formatiereTeil(sign, anzahl, kind) {
  const zeichen = sign > 0 ? '+' : '−';
  if (kind === 'zahl') return `${zeichen}${anzahl}`;
  const koeffizient = anzahl > 1 ? String(anzahl) : '';
  return `${zeichen}${koeffizient}${SYMBOL[kind]}`;
}
