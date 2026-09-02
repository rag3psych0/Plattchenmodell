import test from 'node:test';
import assert from 'node:assert/strict';

import { Board } from '../src/engine/board.js';
import { berechneAddition, berechneSubtraktion } from '../src/engine/rechnen.js';

test('Board: legt Plättchen ab und zählt sie korrekt', () => {
  const board = new Board();
  board.add('zahl', 1, 3);
  board.add('zahl', -1, 1);
  assert.equal(board.countBySignedKind('zahl', 1), 3);
  assert.equal(board.countBySignedKind('zahl', -1), 1);
  assert.equal(board.netValue('zahl'), 2);
});

test('Board: findet Nullpaare, ohne das Board zu verändern', () => {
  const board = new Board();
  board.add('zahl', 1, 3);
  board.add('zahl', -1, 2);
  const pairs = board.findZeroPairs('zahl');
  assert.equal(pairs.length, 2);
  assert.equal(board.tiles.length, 5, 'findZeroPairs darf nicht mutieren');
});

test('Board: resolveZeroPairs entfernt genau die gefundenen Paare', () => {
  const board = new Board();
  board.add('zahl', 1, 3);
  board.add('zahl', -1, 2);
  const removed = board.resolveZeroPairs('zahl');
  assert.equal(removed.length, 2);
  assert.equal(board.tiles.length, 1);
  assert.equal(board.netValue('zahl'), 1);
});

test('Board: removeCount entfernt maximal die angeforderte Anzahl', () => {
  const board = new Board();
  board.add('zahl', 1, 2);
  const removed = board.removeCount('zahl', 1, 5);
  assert.equal(removed.length, 2, 'kann nicht mehr entfernen als vorhanden');
  assert.equal(board.tiles.length, 0);
});

test('Addition: 3 + (-5) ergibt -2 mit 3 Nullpaaren', () => {
  const { steps, result } = berechneAddition(3, -5);
  assert.equal(result, -2);
  const cancelStep = steps.find((s) => s.type === 'cancel');
  assert.ok(cancelStep, 'es sollte ein Cancel-Schritt existieren');
  assert.equal(cancelStep.cancelIds.length, 6, '3 Paare = 6 IDs');
});

test('Addition: 4 + 2 ergibt 6 ohne Nullpaare', () => {
  const { steps, result } = berechneAddition(4, 2);
  assert.equal(result, 6);
  assert.ok(!steps.some((s) => s.type === 'cancel'));
});

test('Addition: 0 + 0 ergibt 0 und leeres Board am Ende', () => {
  const { steps, result } = berechneAddition(0, 0);
  assert.equal(result, 0);
  const letzterSchritt = steps.at(-1);
  assert.equal(letzterSchritt.snapshot.length, 0);
});

test('Subtraktion: 2 - 5 ergänzt Nullpaare, bevor weggenommen wird (Ergebnis -3)', () => {
  const { steps, result } = berechneSubtraktion(2, 5);
  assert.equal(result, -3);
  const zeroPairStep = steps.find((s) => s.type === 'zero-pairs');
  assert.ok(zeroPairStep, 'es müssen Nullpaare ergänzt werden, da nur 2 positive Plättchen vorhanden sind');
});

test('Subtraktion: 3 - (-2) entspricht Addition von 2, Ergebnis 5', () => {
  const { result } = berechneSubtraktion(3, -2);
  assert.equal(result, 5);
});

test('Subtraktion: 5 - 3 braucht keine Nullpaare, Ergebnis 2', () => {
  const { steps, result } = berechneSubtraktion(5, 3);
  assert.equal(result, 2);
  assert.ok(!steps.some((s) => s.type === 'zero-pairs'));
});

test('Subtraktion: a - 0 verändert den Wert nicht', () => {
  const { result } = berechneSubtraktion(7, 0);
  assert.equal(result, 7);
});
