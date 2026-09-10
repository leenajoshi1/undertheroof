// These exercise actual Astra behavior and incur API usage. Offline tests do not substitute for them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelTurn, investigate } from '../lib/investigation';
import { validateFindings } from '../lib/evidence';
import type { SampleId } from '../lib/tools';

for (const sample of ['documented-roof', 'missing-permit', 'conflicting-documents', 'no-concerns'] as SampleId[]) {
  test(`live Astra: ${sample}`, { timeout: 240_000 }, async () => {
    const result = await investigate(sample, createModelTurn(), AbortSignal.timeout(230_000));
    assert.equal(validateFindings({ findings: result.findings }, result.evidence).ok, true);
    const text = JSON.stringify(result.findings).toLowerCase();
    if (sample === 'documented-roof' || sample === 'no-concerns') assert.equal(result.findings.length, 0, text);
    if (sample === 'missing-permit') {
      assert.ok(result.findings.length > 0);
      assert.match(text, /roof/); assert.match(text, /verif|document|invoice/);
      assert.doesNotMatch(text, /illegally|was unpermitted/);
    }
    if (sample === 'conflicting-documents') {
      assert.ok(result.findings.some(f => f.evidenceIds.includes(`${sample}:disclosure`) && f.evidenceIds.includes(`${sample}:inspection`)));
      assert.match(text, /moisture|water/); assert.match(text, /clarif|reconcil|ask/);
    }
  });
}
