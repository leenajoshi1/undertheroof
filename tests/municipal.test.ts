import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset } from '../lib/municipal/data';
import { record, type MunicipalEvidence } from '../lib/municipal/data';
import { calculateCost, createMunicipalExecutor } from '../lib/municipal/tools';
import { investigateMunicipal, validateMunicipalFindings } from '../lib/municipal/investigation';
import { createScriptedMunicipalTurn } from '../lib/municipal/scripted';

test('public snapshot preserves tax years and explicit provenance', async () => {
  const data = await loadDataset('history', 'snapshot');
  assert.equal(data.provenance, 'public_snapshot');
  assert.ok(data.rows.some(r => r.year === '2026'));
  assert.ok(data.rows.some(r => r.year === '2027'));
});
test('live outage never silently changes to fixture data', async () => {
  await assert.rejects(loadDataset('assessor', 'live', async () => new Response('', { status: 503 })), /PUBLIC_DATA_HTTP_503/);
});
test('wrong parcel and missing monetary fields fail closed', async () => {
  const response = async () => Response.json({ rows: [{ parcel_number: '999' }] });
  await assert.rejects(loadDataset('assessor', 'live', response));
});
test('synthetic mode is distinct from a public snapshot', async () => {
  const data = await loadDataset('assessor', 'synthetic');
  assert.equal(data.provenance, 'synthetic');
  assert.equal(data.rows[0].market_value, 500000);
});

test('year-specific cost avoids double exemption deduction and quantifies sensitivity', async () => {
  const evidence = new Map<string, MunicipalEvidence>();
  const execute = createMunicipalExecutor('snapshot', evidence);
  for (const e of await execute('get_tax_history', { parcel: '081035500' })) evidence.set(e.id, e);
  const [cost] = await execute('calculate_ownership_cost', { taxEvidenceId: 'phila:assessment:2026', rateEvidenceId: 'phila:tax-rate', includeStormwaterScenario: false });
  assert.equal(cost.data?.annualTaxEstimate, 44128.70);
  assert.equal(cost.data?.exemptionSensitivityAnnual, 1399.80);
  const [next] = await execute('calculate_ownership_cost', { taxEvidenceId: 'phila:assessment:2027', rateEvidenceId: 'phila:tax-rate', includeStormwaterScenario: false });
  assert.equal(next.data?.annualTaxEstimate, 48311.30);
  assert.equal(cost.provenance, 'calculation');
  assert.match(cost.content, /not a tax bill/);
});
test('missing inputs and unsupported tax years are never converted to zero', () => {
  const rate = record('phila:tax-rate', 'rate', { data: { rate: 0.013998 } });
  const tax = record('tax', 'tax', { sourceType: 'assessment_history', year: 2026, data: { taxable_land: null, taxable_building: 100, market_value: 200 } });
  assert.throws(() => calculateCost(tax, rate), /MISSING_COST_INPUT/);
  assert.throws(() => calculateCost({ ...tax, year: 2024 }, rate), /UNSUPPORTED_RATE_YEAR/);
});
test('jurisdiction is limited to exact demo address and rejects injected SQL', async () => {
  const execute = createMunicipalExecutor('snapshot', new Map());
  await assert.rejects(execute('identify_jurisdiction', { address: "' OR 1=1" }), /UNSUPPORTED_ADDRESS/);
  const [item] = await execute('identify_jurisdiction', { address: '2020 Delancey Place, Philadelphia, PA' });
  assert.equal(item.parcel, '081035500');
});
test('special charges remain unknown and water is an explicit scenario', async () => {
  const execute = createMunicipalExecutor('snapshot', new Map());
  const [special] = await execute('get_special_assessments', { parcel: '081035500' });
  assert.equal(special.data?.annualAmount, null);
  const [water] = await execute('get_recurring_charges', { parcel: '081035500' });
  assert.equal(water.data?.propertyChargeVerified, false);
});

test('scripted municipal/spatial flow rejects invented citation, corrects and links room to permit evidence', async () => {
  const result = await investigateMunicipal({ mode: 'snapshot', turn: createScriptedMunicipalTurn(true, true), modelLabel: 'scripted', spatial: true });
  assert.equal(result.corrections, 1);
  assert.equal(result.model, 'scripted');
  assert.equal(result.findings.length, 3);
  const spatialIndex = result.events.findIndex(e => e.tool === 'record_spatial_graph');
  const permitIndex = result.events.findIndex(e => e.tool === 'get_permit_history');
  assert.ok(spatialIndex < permitIndex);
  const finding = result.findings.find(f => f.areaIds.includes('kitchen'))!;
  assert.ok(finding.evidenceIds.includes('phila:permit-search'));
  assert.ok(finding.evidenceIds.includes('demo:floor-plan'));
  assert.ok(finding.evidenceIds.includes('spatial:graph'));
  assert.ok(finding.evidenceIds.includes('phila:permit:959959'));
  assert.equal(result.events.filter(e => e.phase === 'rejected').length, 1);
  const invalid = structuredClone(result.findings); invalid[0].evidenceIds = invalid[0].evidenceIds.filter(id => id !== 'phila:tax-rate');
  assert.equal(validateMunicipalFindings({ findings: invalid }, new Map(result.evidence.map(e => [e.id, e]))).ok, false);
  const unlinked = structuredClone(result.findings); unlinked[2].areaIds = [];
  assert.equal(validateMunicipalFindings({ findings: unlinked }, new Map(result.evidence.map(e => [e.id, e]))).ok, false);
});
test('executor permits model-selected subset and order, without requiring a checklist', async () => {
  let step = 0;
  const result = await investigateMunicipal({ mode: 'snapshot', modelLabel: 'scripted', turn: async () => {
    const name = step++ === 0 ? 'get_assessor_record' : 'submit_findings';
    return { output: [{ type: 'function_call', call_id: String(step), name, arguments: JSON.stringify(name === 'get_assessor_record' ? { parcel: '081035500' } : { findings: [] }) }] };
  } });
  assert.equal(result.toolCalls, 2);
  assert.deepEqual(result.findings, []);
  assert.ok(!result.events.some(e => e.tool === 'get_permit_history'));
});

test('spatial Astra request carries the real PNG image input', async () => {
  let turn = 0;
  const result = await investigateMunicipal({ mode: 'snapshot', modelLabel: 'gpt-6-astra', spatial: true, turn: async input => {
    if (turn++ === 0) {
      const content = (input[0] as { content: unknown }).content;
      assert.ok(Array.isArray(content));
      assert.ok(content.some(item => (item as { type?: string }).type === 'input_image' && (item as { image_url?: string }).image_url?.startsWith('data:image/png;base64,')));
      return { output: [{ type: 'function_call', call_id: 'image-check', name: 'get_assessor_record', arguments: JSON.stringify({ parcel: '081035500' }) }] };
    }
    return { output: [{ type: 'function_call', call_id: 'submit', name: 'submit_findings', arguments: JSON.stringify({ findings: [] }) }] };
  } });
  assert.equal(result.findings.length, 0);
});
test('spatial observation does not automatically force a permit lookup', async () => {
  let step = 0;
  const graph = { coordinateSystem: 'normalized_0_to_1', geometryStatus: 'approximate', rooms: [{ id: 'kitchen', label: 'Kitchen', bounds: { x: 0, z: 0, width: 0.5, depth: 0.5 }, adjacentTo: [], evidenceIds: ['demo:floor-plan', 'demo:photo'], confidence: 'low' }], connections: [], observations: [{ id: 'kitchen-note', area: 'kitchen', observation: 'The supplied visual evidence may warrant a documentation question.', evidenceIds: ['demo:floor-plan', 'demo:photo'], confidence: 'low', investigationSuggestion: null }] };
  const result = await investigateMunicipal({ mode: 'snapshot', modelLabel: 'scripted', spatial: true, turn: async () => { step++; const name = step === 1 ? 'record_spatial_graph' : step === 2 ? 'get_assessor_record' : 'submit_findings'; const args = name === 'record_spatial_graph' ? graph : name === 'get_assessor_record' ? { parcel: '081035500' } : { findings: [] }; return { output: [{ type: 'function_call', call_id: String(step), name, arguments: JSON.stringify(args) }] }; } });
  assert.ok(result.spatialGraph);
  assert.ok(!result.events.some(event => event.tool === 'get_permit_history'));
});

test('synthetic scenario does not invent a tax increase when supplied years are equal', async () => {
  const result = await investigateMunicipal({ mode: 'synthetic', modelLabel: 'scripted', turn: createScriptedMunicipalTurn(false) });
  assert.match(result.findings[0].inference, /are equal/);
  assert.ok(result.evidence.filter(e => e.sourceType === 'assessment_history').every(e => e.synthetic));
});
