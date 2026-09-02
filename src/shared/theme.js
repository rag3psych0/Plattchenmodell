/**
 * Design-System für die Plättchen (siehe Ablaufplan, Abschnitt 3.1).
 *
 * Systematik: Grundfarben (Rot/Blau/Gelb) = positiv, jeweilige
 * Komplementärfarbe im klassischen Farbkreis (Grün/Orange/Violett) = negativ.
 *
 * Wichtig für Barrierefreiheit: Farbe ist NIE das einzige Unterscheidungs-
 * merkmal. Jedes Plättchen zeigt zusätzlich ein +/− Symbol, und negative
 * Plättchen erhalten zusätzlich eine Schraffur (siehe renderPlaettchen.js).
 * Das ist wichtig wegen Rot/Grün-Sehschwäche (häufigste Farbfehlsichtigkeit)
 * und funktioniert auch in Graustufen-Ausdrucken.
 */
export const THEME = {
  zahl: {
    shape: 'circle',
    positive: { fill: '#D62839', label: '+1' },
    negative: { fill: '#3CB371', label: '−1' },
  },
  x: {
    shape: 'bar',
    positive: { fill: '#3A6EA5', label: '+x' },
    negative: { fill: '#F0932B', label: '−x' },
  },
  x2: {
    shape: 'square',
    positive: { fill: '#F6C445', label: '+x²' },
    negative: { fill: '#8E5572', label: '−x²' },
  },
};

export function styleFor(kind, sign) {
  return THEME[kind][sign > 0 ? 'positive' : 'negative'];
}
