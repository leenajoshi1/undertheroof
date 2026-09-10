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
    const trace: unknown[] = [];
    let modelTurns = 0;
    const startedAt = Date.now();
    const liveTurn = createModelTurn();
    let result;
    try {
      result = await investigate(sample, async (input, signal) => {
        modelTurns++;
        const last = input.at(-1);
        if (last?.type === 'function_call_output') trace.push({ event: 'tool_result', callId: last.call_id, result: last.output });
        await writeFile(`${reportDirectory}/${sample}.trace.json`, JSON.stringify({ modelTurns, trace }, null, 2));
        const response = await liveTurn(input, signal);
        trace.push({ event: 'model_tools', turn: modelTurns, calls: response.output.filter(item => item.type === 'function_call').map(item => ({ callId: item.call_id, name: item.name, arguments: JSON.parse(item.arguments) })) });
        await writeFile(`${reportDirectory}/${sample}.trace.json`, JSON.stringify({ modelTurns, trace }, null, 2));
        return response;
      }, AbortSignal.timeout(230_000));
    } catch (error) {
      // Do not print SDK errors verbatim: authentication errors can contain key fragments.
      const e = error as { status?: number; code?: string; name?: string };
      const failure = { sample, status: e.status, code: e.code, name: e.name, timestamp: new Date().toISOString() };
      await writeFile(`${reportDirectory}/${sample}.error.json`, JSON.stringify(failure, null, 2));
      assert.fail(`Live request failed: ${JSON.stringify(failure)}`);
    }
    await writeFile(`${reportDirectory}/${sample}.json`, JSON.stringify({ ...result, modelTurns, latencyMs: Date.now() - startedAt, runAt: new Date().toISOString() }, null, 2));
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
