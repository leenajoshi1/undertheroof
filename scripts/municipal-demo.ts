import { mkdir, writeFile } from 'node:fs/promises';
import { investigateMunicipal } from '../lib/municipal/investigation';
import { createScriptedMunicipalTurn } from '../lib/municipal/scripted';
async function main() {
  const mode = process.argv.includes('--live') ? 'live' : process.argv.includes('--synthetic') ? 'synthetic' : 'snapshot';
  const result = await investigateMunicipal({ mode, modelLabel: 'scripted', spatial: true, turn: createScriptedMunicipalTurn(true), signal: AbortSignal.timeout(90000) });
  await mkdir('artifacts/municipal', { recursive: true });
  await writeFile(`artifacts/municipal/${mode}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ mode, model: result.model, evidence: result.evidence.length, findings: result.findings.map(f => ({ title: f.title, areaIds: f.areaIds })), costs: result.evidence.filter(e => e.sourceType === 'calculation').map(e => e.data), corrections: result.corrections, tools: result.events.filter(e => e.phase === 'started').map(e => e.tool) }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Demo failed'); process.exitCode = 1; });
