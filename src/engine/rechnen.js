import { Board } from './board.js';

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
