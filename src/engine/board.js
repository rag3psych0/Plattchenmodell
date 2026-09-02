import { createPlaettchen } from './plaettchen.js';

/**
 * Board: verwaltet die Menge der aktuell ausliegenden Plättchen.
 *
 * Enthält die für alle Themenmodule gemeinsame Kernregel des
 * Plättchenmodells: ein positives und ein negatives Plättchen desselben
 * Typs bilden ein "Nullpaar" und heben sich gegenseitig auf.
 */
export class Board {
  constructor() {
    /** @type {{id:string, kind:string, sign:1|-1}[]} */
    this.tiles = [];
  }

  /**
   * Legt `count` Plättchen eines Typs/Vorzeichens auf das Board.
   * @returns die neu erzeugten Plättchen
   */
  add(kind, sign, count = 1) {
    const added = [];
    for (let i = 0; i < count; i += 1) {
      const tile = createPlaettchen(kind, sign);
      this.tiles.push(tile);
      added.push(tile);
    }
    return added;
  }

  countBySignedKind(kind, sign) {
    return this.tiles.filter((t) => t.kind === kind && t.sign === sign).length;
  }

  /** Summe der Vorzeichen eines Typs, z. B. netValue('zahl') = #positiv - #negativ */
  netValue(kind) {
    return this.countBySignedKind(kind, 1) - this.countBySignedKind(kind, -1);
  }

  /**
   * Findet Paare aus je einem positiven und einem negativen Plättchen
   * desselben Typs, die sich gegenseitig aufheben ("Nullpaare").
   * Verändert das Board NICHT.
   * @returns {[string, string][]} Paare von IDs [positivId, negativId]
   */
  findZeroPairs(kind) {
    const positives = this.tiles.filter((t) => t.kind === kind && t.sign === 1);
    const negatives = this.tiles.filter((t) => t.kind === kind && t.sign === -1);
    const n = Math.min(positives.length, negatives.length);
    const pairs = [];
    for (let i = 0; i < n; i += 1) {
      pairs.push([positives[i].id, negatives[i].id]);
    }
    return pairs;
  }

  removeById(id) {
    this.tiles = this.tiles.filter((t) => t.id !== id);
  }

  /** Entfernt alle aktuell möglichen Nullpaare eines Typs. */
  resolveZeroPairs(kind) {
    const pairs = this.findZeroPairs(kind);
    for (const [posId, negId] of pairs) {
      this.removeById(posId);
      this.removeById(negId);
    }
    return pairs;
  }

  /** Entfernt bis zu `count` Plättchen eines Typs/Vorzeichens (z. B. für Subtraktion). */
  removeCount(kind, sign, count) {
    const matching = this.tiles
      .filter((t) => t.kind === kind && t.sign === sign)
      .slice(0, count);
    for (const t of matching) this.removeById(t.id);
    return matching;
  }

  /** Tiefe Kopie der aktuellen Plättchen – für Zwischenzustände/Animation. */
  snapshot() {
    return this.tiles.map((t) => ({ ...t }));
  }

  clear() {
    this.tiles = [];
  }
}
