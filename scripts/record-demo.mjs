// Records live results for the 4 demo queries into data/demo/*.json (uses SerpApi credits unless cached).
// Usage: start `npm run dev`, then `node scripts/record-demo.mjs [baseUrl]`
import { writeFileSync, mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:3000';
const english = process.argv[3] === 'english'; // node scripts/record-demo.mjs <url> english -> *.en.json
const queries = ['best career after 12th', 'is tap water safe to drink', 'how to start a business', 'monsoon health tips'];
const slug = (q) => q.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
mkdirSync('data/demo', { recursive: true });

for (const query of queries) {
  const res = await fetch(`${base}/api/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, regions: ['mumbai', 'delhi', 'chennai', 'kolkata', 'hyderabad', 'bengaluru'], langMode: english ? 'english' : 'native', includeNews: !english }),
  });
  const text = await res.text();
  const block = text.split('\n\n').find((b) => b.startsWith('event: done'));
  if (!block) {
    console.error(`FAILED ${query}:`, text.slice(0, 300));
    continue;
  }
  const data = JSON.parse(block.split('data: ')[1]);
  data.demo = true;
  writeFileSync(`data/demo/${slug(query)}${english ? '.en' : ''}.json`, JSON.stringify(data, null, 1));
  const ok = data.outcomes.filter((o) => o.ok).length;
  console.log(`saved ${slug(query)}  regions ok=${ok}/6  score=${data.analysis?.score}`);
  await new Promise((r) => setTimeout(r, 1500));
}
