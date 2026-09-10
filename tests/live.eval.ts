// These exercise actual Astra behavior and incur API usage. Offline tests do not substitute for them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelTurn, investigate } from '../lib/investigation';
import { validateFindings } from '../lib/evidence';
import type { SampleId } from '../lib/tools';
import { mkdir, writeFile } from 'node:fs/promises';

const reportDirectory = 'artifacts/live-p0';

for (const sample of ['documented-roof', 'missing-permit', 'conflicting-documents', 'no-concerns'] as SampleId[]) {
  test(`live Astra: ${sample}`, { timeout: 240_000 }, async () => {
    assert.equal(process.env.OPENAI_MODEL || 'gpt-6-astra', 'gpt-6-astra', 'Live gate must use GPT-6 Astra.');
    await mkdir(reportDirectory, { recursive: true });
    let result;
    try {
      result = await investigate(sample, createModelTurn(), AbortSignal.timeout(230_000));
    } catch (error) {
      // Do not print SDK errors verbatim: authentication errors can contain key fragments.
      const e = error as { status?: number; code?: string; name?: string };
      const failure = { sample, status: e.status, code: e.code, name: e.name, timestamp: new Date().toISOString() };
      await writeFile(`${reportDirectory}/${sample}.error.json`, JSON.stringify(failure, null, 2));
      assert.fail(`Live request failed: ${JSON.stringify(failure)}`);
    }
    await writeFile(`${reportDirectory}/${sample}.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ sample, findings: result.findings.length, corrections: result.corrections, audit: result.audit }));
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
