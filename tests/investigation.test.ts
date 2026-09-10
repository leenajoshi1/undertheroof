import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFindings, type Finding } from '../lib/evidence';
import { readSampleEvidence } from '../lib/tools';
import { investigate, type ModelTurn } from '../lib/investigation';

const listing = readSampleEvidence('missing-permit', 'listing');
const permits = readSampleEvidence('missing-permit', 'permits');
function finding(): Finding {
  return { id: 'roof', title: 'Roof documentation should be verified', severity: 'investigate',
    fact: `[${listing.id}] ${listing.content}\n[${permits.id}] ${permits.content}`,
    inference: 'The available records do not establish the roof documentation; the search may be incomplete.',
    evidenceIds: [listing.id, permits.id], supportingQuotes: [{ evidenceId: listing.id, quote: listing.content }, { evidenceId: permits.id, quote: permits.content }],
    confidence: 'medium', recommendedAction: 'Ask the seller for roof invoices and permit documentation.' };
}

test('missing permit supports a verification question', () => {
  assert.equal(validateFindings({ findings: [finding()] }, [listing, permits]).ok, true);
});
test('missing permit does not support an accusation', () => {
  const f = finding(); f.inference = 'The roof was replaced illegally.';
  const result = validateFindings({ findings: [f] }, [listing, permits]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some(e => e.error === 'ABSENCE_IS_NOT_PROOF'));
});
test('nonexistent evidence IDs are rejected', () => {
  const f = finding(); f.evidenceIds.push('invented');
  assert.equal(validateFindings({ findings: [f] }, [listing, permits]).ok, false);
});
test('real citation IDs cannot legitimize invented facts', () => {
  const f = finding(); f.fact = 'The roof is unsafe.';
  assert.equal(validateFindings({ findings: [f] }, [listing, permits]).ok, false);
});
test('altered quotes and absent evidence are rejected', () => {
  const f = finding(); f.supportingQuotes[0].quote = 'The seller committed fraud.';
  assert.equal(validateFindings({ findings: [f] }, [listing, permits]).ok, false);
  assert.equal(validateFindings({ findings: [finding()] }, []).ok, false);
});
test('distinct fact and inference fields are required', () => {
  const { inference, ...f } = finding();
  assert.equal(validateFindings({ findings: [f] }, [listing, permits]).ok, false);
});
test('zero findings are valid; documented roof does not require a warning', () => {
  assert.equal(validateFindings({ findings: [] }, [readSampleEvidence('documented-roof', 'listing'), readSampleEvidence('documented-roof', 'permits')]).ok, true);
});
test('conflicting source statements remain separately attributable', () => {
  const disclosure = readSampleEvidence('conflicting-documents', 'disclosure');
  const inspection = readSampleEvidence('conflicting-documents', 'inspection');
  const f = finding();
  f.evidenceIds = [disclosure.id, inspection.id];
  f.supportingQuotes = [disclosure, inspection].map(e => ({ evidenceId: e.id, quote: e.content }));
  f.fact = f.supportingQuotes.map(q => `[${q.evidenceId}] ${q.quote}`).join('\n');
  f.title = 'Clarify basement moisture'; f.inference = 'The reports appear inconsistent; timing or seller knowledge may explain the difference.';
  f.recommendedAction = 'Ask the seller and inspector to reconcile the reports and assess the source of moisture.';
  assert.equal(validateFindings({ findings: [f] }, [disclosure, inspection]).ok, true);
});

function call(name: string, args: unknown, id: number) {
  return { type: 'function_call' as const, name, arguments: JSON.stringify(args), call_id: String(id) };
}
test('tool loop feeds structured errors back and accepts corrected findings', async () => {
  let step = 0;
  const bad = finding(); bad.inference = 'The roof was replaced illegally.';
  const turn: ModelTurn = async input => {
    const id = ++step;
    if (step === 1) return { output: [call('read_evidence', { source: 'listing', question: 'What is claimed?' }, id)] };
    if (step === 2) return { output: [call('read_evidence', { source: 'permits', question: 'Is roof work documented?' }, id)] };
    if (step === 3) return { output: [call('submit_findings', { findings: [bad] }, id)] };
    assert.match(JSON.stringify(input.at(-1)), /ABSENCE_IS_NOT_PROOF/);
    return { output: [call('submit_findings', { findings: [finding()] }, id)] };
  };
  const result = await investigate('missing-permit', turn);
  assert.equal(result.corrections, 1);
  assert.equal(result.toolCalls, 4);
  assert.equal(result.findings.length, 1);
  assert.deepEqual(result.audit.map(event => event.status), ['collected', 'collected', 'rejected', 'accepted']);
  assert.deepEqual(result.audit[2].errors, ['ABSENCE_IS_NOT_PROOF']);
});
test('loop cannot return results without reading the listing', async () => {
  const turn: ModelTurn = async () => ({ output: [call('submit_findings', { findings: [] }, 1)] });
  await assert.rejects(investigate('no-concerns', turn), /GROUNDING_RETRIES_EXHAUSTED/);
});
test('unproductive model is bounded', async () => {
  let calls = 0;
  await assert.rejects(investigate('no-concerns', async () => { calls++; return { output: [] }; }), /INVESTIGATION_LIMIT/);
  assert.equal(calls, 12);
});
