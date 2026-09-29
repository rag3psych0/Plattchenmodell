/**
 * Design-System für die Plättchen (siehe Ablaufplan, Abschnitt 3.1, und
 * Nutzer-Feedback: alle drei Typen sind Rechtecke/Quadrate unterschiedlicher
 * Größe – wie bei klassischen Algebra-Kacheln: das 1-Plättchen ist ein
 * kleines Quadrat, das x-Plättchen ein Balken mit derselben Höhe wie das
 * 1-Plättchen und derselben Breite wie das x²-Plättchen, das x²-Plättchen
 * ein großes Quadrat.
 *
 * Farb-Systematik: Grundfarben (Rot/Blau/Gelb) = positiv, jeweilige
 * Komplementärfarbe im klassischen Farbkreis (Grün/Orange/Violett) = negativ.
 *
 * Wichtig für Barrierefreiheit: Farbe ist NIE das einzige Unterscheidungs-
 * merkmal. Jedes Plättchen zeigt zusätzlich ein +/− Symbol (bzw. in der
 * Auswahl den vollen Wert), und negative Plättchen erhalten zusätzlich eine
 * Schraffur (siehe renderPlaettchen.js).
 */
export const THEME = {
  zahl: {
    positive: { fill: '#D62839', label: '+1', text: '#ffffff' },
    negative: { fill: '#3CB371', label: '−1', text: '#123522' },
  },
  x: {
    positive: { fill: '#3A6EA5', label: '+x', text: '#ffffff' },
    negative: { fill: '#F0932B', label: '−x', text: '#3a2100' },
  },
  x2: {
    positive: { fill: '#F6C445', label: '+x²', text: '#3a2c00' },
    negative: { fill: '#8E5572', label: '−x²', text: '#ffffff' },
  },
};

export function styleFor(kind, sign) {
  return THEME[kind][sign > 0 ? 'positive' : 'negative'];
}

/** Seitenlänge des 1-Plättchens ("S"). */
export const TILE_UNIT = 32;
/** Seitenlänge des x²-Plättchens, zugleich Länge des x-Balkens ("L"). */
export const TILE_LONG = 64;

const GRUNDMASSE = {
  zahl: { w: TILE_UNIT, h: TILE_UNIT },
  x: { w: TILE_LONG, h: TILE_UNIT },
  x2: { w: TILE_LONG, h: TILE_LONG },
};

/** Breite/Höhe eines Plättchen-Typs, optional skaliert (z. B. für die Auswahlleiste). */
export function tileDimensions(kind, scale = 1) {
  const basis = GRUNDMASSE[kind];
  return { w: basis.w * scale, h: basis.h * scale };
}
