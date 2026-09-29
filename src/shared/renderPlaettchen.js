import { styleFor, tileDimensions } from './theme.js';

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
 * Erzeugt ein einzelnes Plättchen als SVG-Element (Rechteck/Quadrat, dessen
 * Größe sich aus dem Typ ergibt – siehe theme.js).
 * Kodiert positiv/negativ IMMER über mehrere Kanäle gleichzeitig: Farbe,
 * sichtbares Symbol/Wert und (bei negativ) Schraffur.
 *
 * @param {'zahl'|'x'|'x2'} kind
 * @param {1|-1} sign
 * @param {{scale?: number, id?: string, zeigeWert?: boolean, vertical?: boolean}} [opts]
 *   scale: verkleinert/vergrößert die Standardgröße (z. B. für die Auswahl)
 *   zeigeWert: zeigt den vollen Wert ("+1", "−x²", …) statt nur +/−
 *   vertical: vertauscht Breite/Höhe (z. B. um ein x-Plättchen "hochkant"
 *   statt liegend zu zeichnen – für die Quadrat-Darstellung bei der
 *   quadratischen Ergänzung, wo ein x-Balken auch senkrecht an einer
 *   Quadratseite anliegen muss)
 */
export function createPlaettchenElement(kind, sign, opts = {}) {
  const scale = opts.scale ?? 1;
  let { w, h } = tileDimensions(kind, scale);
  if (opts.vertical) { [w, h] = [h, w]; }
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.classList.add('plaettchen', `plaettchen--${kind}`, sign > 0 ? 'plaettchen--pos' : 'plaettchen--neg');
  if (opts.id) svg.dataset.tileId = opts.id;
  ensureHatchPattern(svg);

  const style = styleFor(kind, sign);
  const pad = Math.min(w, h) * 0.09;

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(pad));
  rect.setAttribute('y', String(pad));
  rect.setAttribute('width', String(w - pad * 2));
  rect.setAttribute('height', String(h - pad * 2));
  rect.setAttribute('rx', String(Math.min(w, h) * 0.14));
  rect.setAttribute('fill', style.fill);
  rect.setAttribute('stroke', 'rgba(0,0,0,0.25)');
  rect.setAttribute('stroke-width', '1.5');
  svg.appendChild(rect);

  if (sign < 0) {
    const hatchEl = rect.cloneNode();
    hatchEl.setAttribute('fill', 'url(#plaettchen-hatch-negativ)');
    hatchEl.removeAttribute('stroke');
    svg.appendChild(hatchEl);
  }

  const label = opts.zeigeWert ? style.label : (sign > 0 ? '+' : '−');
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', '50%');
  text.setAttribute('y', '52%');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  const grundgroesse = Math.min(w, h) * (label.length > 2 ? 0.3 : 0.36);
  text.setAttribute('font-size', String(grundgroesse));
  text.setAttribute('font-weight', '700');
  text.setAttribute('fill', style.text);
  text.textContent = label;
  svg.appendChild(text);

  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${style.label} Plättchen`);

  return svg;
}
