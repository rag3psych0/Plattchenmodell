import { THEME, styleFor } from './theme.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
let hatchPatternReady = false;

/**
 * Legt einmalig ein <pattern> für die Schraffur negativer Plättchen an.
 * Wird in ein <defs> im übergebenen SVG-Wurzelelement eingefügt.
 */
function ensureHatchPattern(svgRoot) {
  if (hatchPatternReady) return;
  let defs = svgRoot.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    svgRoot.insertBefore(defs, svgRoot.firstChild);
  }
  const pattern = document.createElementNS(SVG_NS, 'pattern');
  pattern.setAttribute('id', 'plaettchen-hatch-negativ');
  pattern.setAttribute('width', '6');
  pattern.setAttribute('height', '6');
  pattern.setAttribute('patternTransform', 'rotate(45)');
  pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', '0');
  line.setAttribute('y1', '0');
  line.setAttribute('x2', '0');
  line.setAttribute('y2', '6');
  line.setAttribute('stroke', 'rgba(255,255,255,0.55)');
  line.setAttribute('stroke-width', '3');
  pattern.appendChild(line);
  defs.appendChild(pattern);
  hatchPatternReady = true;
}

/**
 * Erzeugt ein einzelnes Plättchen als SVG-Element.
 * Kodiert positiv/negativ IMMER über drei Kanäle gleichzeitig:
 * Farbe, sichtbares +/− Symbol und (bei negativ) Schraffur.
 *
 * @param {'zahl'|'x'|'x2'} kind
 * @param {1|-1} sign
 * @param {{size?: number, id?: string}} [opts]
 */
export function createPlaettchenElement(kind, sign, opts = {}) {
  const size = opts.size ?? 48;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.classList.add('plaettchen', `plaettchen--${kind}`, sign > 0 ? 'plaettchen--pos' : 'plaettchen--neg');
  if (opts.id) svg.dataset.tileId = opts.id;
  ensureHatchPattern(svg);

  const style = styleFor(kind, sign);
  const shape = THEME[kind].shape;
  const pad = size * 0.08;
  let shapeEl;

  if (shape === 'circle') {
    shapeEl = document.createElementNS(SVG_NS, 'circle');
    shapeEl.setAttribute('cx', String(size / 2));
    shapeEl.setAttribute('cy', String(size / 2));
    shapeEl.setAttribute('r', String(size / 2 - pad));
  } else if (shape === 'square') {
    shapeEl = document.createElementNS(SVG_NS, 'rect');
    shapeEl.setAttribute('x', String(pad));
    shapeEl.setAttribute('y', String(pad));
    shapeEl.setAttribute('width', String(size - pad * 2));
    shapeEl.setAttribute('height', String(size - pad * 2));
    shapeEl.setAttribute('rx', String(size * 0.08));
  } else {
    // 'bar' – schmales, langes Rechteck für x-Plättchen
    shapeEl = document.createElementNS(SVG_NS, 'rect');
    shapeEl.setAttribute('x', String(pad));
    shapeEl.setAttribute('y', String(size * 0.32));
    shapeEl.setAttribute('width', String(size - pad * 2));
    shapeEl.setAttribute('height', String(size * 0.36));
    shapeEl.setAttribute('rx', String(size * 0.08));
  }

  shapeEl.setAttribute('fill', style.fill);
  shapeEl.setAttribute('stroke', 'rgba(0,0,0,0.25)');
  shapeEl.setAttribute('stroke-width', '1.5');
  svg.appendChild(shapeEl);

  if (sign < 0) {
    const hatchEl = shapeEl.cloneNode();
    hatchEl.setAttribute('fill', 'url(#plaettchen-hatch-negativ)');
    hatchEl.removeAttribute('stroke');
    svg.appendChild(hatchEl);
  }

  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', '50%');
  text.setAttribute('y', '52%');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('font-size', String(size * 0.34));
  text.setAttribute('font-weight', '700');
  text.setAttribute('fill', '#161616');
  text.textContent = sign > 0 ? '+' : '−';
  svg.appendChild(text);

  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${style.label} Plättchen`);

  return svg;
}
