import { mkdir, writeFile } from 'node:fs/promises';
import { investigateMunicipal } from '../lib/municipal/investigation';
import { createScriptedMunicipalTurn } from '../lib/municipal/scripted';
import { createMunicipalModelTurn } from '../lib/municipal/investigation';
async function main() {
  const mode = process.argv.includes('--live') ? 'live' : process.argv.includes('--synthetic') ? 'synthetic' : 'snapshot';
  const model = process.argv.includes('--astra') ? 'gpt-6-astra' : 'scripted';
  const started = performance.now();
  const result = await investigateMunicipal({ mode, modelLabel: model, spatial: true, turn: model === 'gpt-6-astra' ? createMunicipalModelTurn(true) : createScriptedMunicipalTurn(true), signal: AbortSignal.timeout(240000) });
  const latencyMs = Math.round(performance.now() - started);
  await mkdir('artifacts/municipal', { recursive: true });
  await writeFile(`artifacts/municipal/${mode}-${model}.json`, JSON.stringify({ ...result, latencyMs }, null, 2));
  console.log(JSON.stringify({ mode, model: result.model, latencyMs, evidence: result.evidence.length, findings: result.findings.map(f => ({ title: f.title, areaIds: f.areaIds })), costs: result.evidence.filter(e => e.sourceType === 'calculation').map(e => e.data), corrections: result.corrections, tools: result.events.filter(e => e.phase === 'started').map(e => e.tool) }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Demo failed'); process.exitCode = 1; });
