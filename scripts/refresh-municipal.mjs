// Explicit, read-only public queries. No owners or mailing addresses are selected.
import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile('lib/municipal/data.ts', 'utf8');
const matches = [...source.matchAll(/  (assessor|history|permits): `([^`]+)`/g)];
if (matches.length !== 3) throw new Error('Query manifest changed; review refresh script.');
const datasets = {};
for (const [,name,query] of matches) {
  const url = 'https://phl.carto.com/api/v2/sql?q=' + encodeURIComponent(query);
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body.rows)) throw new Error(`${name}: invalid response`);
  datasets[name] = { sourceUrl: url, rows: body.rows };
  console.log(`${name}: ${body.rows.length} public rows`);
}
await writeFile('lib/municipal/philadelphia.snapshot.json', JSON.stringify({ retrievedAt: new Date().toISOString(), attribution: 'City of Philadelphia OPA and Department of Licenses and Inspections', license: 'https://opendataphilly.org/datasets/philadelphia-properties-and-assessment-history/', datasets }, null, 2) + '\n');
