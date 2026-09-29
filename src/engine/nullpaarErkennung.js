/**
 * Reine Geometrie-Logik für die freie Bearbeitungsfläche (Phase 2,
 * Bearbeitungsmodus): Wird ein Plättchen nah genug an sein Gegenstück
 * (gleicher Typ, entgegengesetztes Vorzeichen) gezogen, gilt das als
 * erkanntes Nullpaar. Bewusst getrennt von jeder DOM-Logik, damit sich das
 * ohne Browser testen lässt.
 *
 * @param {{id:string, kind:string, sign:1|-1}[]} tiles
 * @param {Record<string, {x:number, y:number}>} zentren  Mittelpunkt je Plättchen-ID
 * @param {string} tileId  das gerade bewegte Plättchen
 * @param {number} maxDistance  Abstand in Pixeln, ab dem noch als "nah genug" gilt
 * @returns das nächste passende Gegenstück oder null
 */
export function findeGegenpaarInNaehe(tiles, zentren, tileId, maxDistance) {
  const tile = tiles.find((t) => t.id === tileId);
  const zentrum = zentren[tileId];
  if (!tile || !zentrum) return null;

  let beste = null;
  let besterAbstand = Infinity;

  for (const other of tiles) {
    if (other.id === tileId) continue;
    if (other.kind !== tile.kind || other.sign === tile.sign) continue;
    const oz = zentren[other.id];
    if (!oz) continue;
    const abstand = Math.hypot(oz.x - zentrum.x, oz.y - zentrum.y);
    if (abstand <= maxDistance && abstand < besterAbstand) {
      beste = other;
      besterAbstand = abstand;
    }
  }
  return beste;
}
