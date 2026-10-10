// Generates docs/images/banner.svg: an animated dot-matrix India with pulsing city beacons (used in the README).
// Usage: node scripts/make-banner.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { geoContains, geoMercator } from 'd3-geo';
import { feature } from 'topojson-client';

const W = 1280;
const H = 440;
const topo = JSON.parse(readFileSync('public/india.topo.json', 'utf8'));
const fc = feature(topo, topo.objects.india);
const MAP = { x: 880, y: 24, w: 360, h: 372 };
const proj = geoMercator().fitExtent([[MAP.x, MAP.y], [MAP.x + MAP.w, MAP.y + MAP.h]], fc);

const cities = [
  ['Mumbai', [72.8777, 19.076], '#1F4BFF'],
  ['Delhi', [77.209, 28.6139], '#FF2E63'],
  ['Chennai', [80.2707, 13.0827], '#12B76A'],
  ['Kolkata', [88.3639, 22.5726], '#FF9F1C'],
  ['Hyderabad', [78.4867, 17.385], '#7B2CFF'],
  ['Bengaluru', [77.5946, 12.9716], '#00A3C4'],
].map(([n, ll, c]) => ({ n, c, p: proj(ll) }));

const STEP = 7;
let dots = '';
let count = 0;
for (let y = MAP.y; y < MAP.y + MAP.h; y += STEP) {
  for (let x = MAP.x; x < MAP.x + MAP.w; x += STEP) {
    const ll = proj.invert([x + (((y - MAP.y) / STEP) % 2 ? STEP / 2 : 0), y]);
    if (!ll || !geoContains(fc, ll)) continue;
    const near = cities.some((c) => Math.hypot(c.p[0] - x, c.p[1] - y) < 34);
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${near ? 2.3 : 1.7}" fill="#0B0B0B" opacity="${near ? 0.55 : 0.26}"/>`;
    count++;
  }
}

const arcs = [[0, 1], [1, 3], [3, 2], [0, 5], [4, 1], [2, 4]]
  .map(([a, b], i) => {
    const A = cities[a].p, B = cities[b].p;
    const mx = (A[0] + B[0]) / 2 - (B[1] - A[1]) * 0.22, my = (A[1] + B[1]) / 2 + (B[0] - A[0]) * 0.22 - 20;
    return `<path d="M${A[0].toFixed(1)},${A[1].toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${B[0].toFixed(1)},${B[1].toFixed(1)}" fill="none" stroke="#E11D2E" stroke-width="1.8" stroke-dasharray="5 6" opacity=".75"><animate attributeName="stroke-dashoffset" from="0" to="-44" dur="${1.6 + i * 0.25}s" repeatCount="indefinite"/></path>`;
  })
  .join('');

const beacons = cities
  .map(
    (c, i) => `<g><circle cx="${c.p[0].toFixed(1)}" cy="${c.p[1].toFixed(1)}" r="8" fill="none" stroke="${c.c}" stroke-width="2.5"><animate attributeName="r" values="6;26" dur="2.4s" begin="${(i * 0.4).toFixed(1)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0" dur="2.4s" begin="${(i * 0.4).toFixed(1)}s" repeatCount="indefinite"/></circle><circle cx="${c.p[0].toFixed(1)}" cy="${c.p[1].toFixed(1)}" r="7" fill="${c.c}" stroke="#0B0B0B" stroke-width="2.5"/></g>`,
  )
  .join('');

const ticker = 'MUMBAI  •  DELHI  •  CHENNAI  •  KOLKATA  •  HYDERABAD  •  BENGALURU  •  SAME SEARCH  •  DIFFERENT INDIA  •  ';
const ff = "font-family=\"Impact, 'Arial Black', 'Helvetica Neue', Arial, sans-serif\"";
const mono = "font-family=\"'Courier New', Consolas, monospace\"";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Prism India: same search, different India. Animated dot-matrix map of India with six city beacons.">
<defs><pattern id="d" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#0B0B0B" opacity=".12"/></pattern></defs>
<rect width="${W}" height="${H}" fill="#F2EEE3"/><rect width="${W}" height="${H}" fill="url(#d)"/>
<rect x="3" y="3" width="${W - 6}" height="${H - 6}" fill="none" stroke="#0B0B0B" stroke-width="6"/>
${dots}
${arcs}
${beacons}
<g transform="translate(52,40)">
  <rect x="0" y="0" width="58" height="58" rx="8" fill="#FFD60A" stroke="#0B0B0B" stroke-width="5"/>
  <text x="29" y="43" text-anchor="middle" ${ff} font-size="40" fill="#0B0B0B">P</text>
  <text x="76" y="30" ${ff} font-size="30" fill="#0B0B0B" textLength="170" lengthAdjust="spacingAndGlyphs">PRISM INDIA</text>
  <text x="77" y="52" ${mono} font-size="14" font-weight="700" fill="#5B5B55">A LIVE SERPAPI INVESTIGATION</text>
</g>
<text x="52" y="178" ${ff} font-size="92" fill="#0B0B0B" textLength="500" lengthAdjust="spacingAndGlyphs">SAME SEARCH.</text>
<rect x="46" y="196" width="382" height="92" fill="#FFD60A"><animate attributeName="width" values="0;382" dur="1.1s" begin="0.2s" fill="freeze"/></rect>
<text x="52" y="270" ${ff} font-size="92" fill="#0B0B0B" textLength="366" lengthAdjust="spacingAndGlyphs">DIFFERENT</text>
<text x="446" y="270" ${ff} font-size="92" fill="#0B0B0B" textLength="270" lengthAdjust="spacingAndGlyphs">INDIA<tspan fill="#FF2E3B">.</tspan></text>
<g transform="translate(52,318)" ${mono} font-size="15" font-weight="700" fill="#0B0B0B">
  <rect x="0" y="0" width="150" height="34" fill="#FFFDF7" stroke="#0B0B0B" stroke-width="3"/><text x="75" y="22" text-anchor="middle">6 CITIES</text>
  <rect x="164" y="0" width="190" height="34" fill="#FFFDF7" stroke="#0B0B0B" stroke-width="3"/><text x="259" y="22" text-anchor="middle">7 PUBLIC TOOLS</text>
  <rect x="368" y="0" width="236" height="34" fill="#FF5FA2" stroke="#0B0B0B" stroke-width="3"/><text x="486" y="22" text-anchor="middle">LANGUAGE GAP LAB</text>
</g>
<g transform="rotate(-6 760 70) translate(668 44)"><rect width="196" height="40" fill="#FF5FA2" stroke="#0B0B0B" stroke-width="4"/><text x="98" y="26" text-anchor="middle" ${mono} font-size="16" font-weight="700" fill="#0B0B0B">LIVE DATA / 6 CITIES</text>
<animateTransform attributeName="transform" type="translate" values="668 44;668 38;668 44" dur="3s" repeatCount="indefinite" additive="sum"/></g>
<g><rect x="3" y="${H - 52}" width="${W - 6}" height="49" fill="#0B0B0B"/>
<g clip-path="url(#c)"><clipPath id="c"><rect x="3" y="${H - 52}" width="${W - 6}" height="49"/></clipPath>
<text y="${H - 20}" ${mono} font-size="19" font-weight="700" fill="#F2EEE3" textLength="${ticker.length * 3 * 13.4}" lengthAdjust="spacing">${ticker}${ticker}${ticker}<animateTransform attributeName="transform" type="translate" from="0 0" to="-${ticker.length * 13.4}" dur="22s" repeatCount="indefinite"/></text></g></g>
</svg>`;

writeFileSync('docs/images/banner.svg', svg);
console.log('banner.svg', Math.round(svg.length / 1024) + ' KB,', count, 'dots');
