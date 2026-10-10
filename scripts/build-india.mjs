// Builds public/india.topo.json: a single simplified India outline (TopoJSON) merged from a district-level source.
// Usage: node scripts/build-india.mjs <source-topojson>
import { readFileSync, writeFileSync } from 'node:fs';
import { merge } from 'topojson-client';
import { topology } from 'topojson-server';
import { presimplify, simplify, quantile } from 'topojson-simplify';

const src = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const objName = Object.keys(src.objects)[0];
const outline = merge(src, src.objects[objName].geometries);
let topo = topology({ india: { type: 'Feature', properties: { name: 'India' }, geometry: outline } }, 1e4);
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 0.35));
writeFileSync('public/india.topo.json', JSON.stringify(topo));
console.log('bytes', JSON.stringify(topo).length, 'polygons', outline.coordinates.length);
