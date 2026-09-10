import { z } from 'zod';
import { createModelTurn, investigate } from '../../../lib/investigation';
import { resolveSample } from '../../../lib/tools';

export const runtime = 'nodejs';
export const maxDuration = 300;
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: { code: 'INVALID_INPUT', message: 'Send a property address.' } }, { status: 400 }); }
  const parsed = z.object({ property: z.string().trim().min(1).max(2000) }).strict().safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: 'INVALID_INPUT', message: 'Enter a property address or listing URL.' } }, { status: 400 });
  const sample = resolveSample(parsed.data.property);
  if (!sample) return Response.json({ error: { code: 'SOURCE_UNAVAILABLE', message: 'P0 has synthetic evidence for the four sample addresses only. Choose a sample below; live listing lookup is not connected yet.' } }, { status: 422 });
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: { code: 'MISSING_API_KEY', message: 'Set OPENAI_API_KEY in .env.local and restart the server to run Astra.' } }, { status: 503 });
  try {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(240_000)]);
    return Response.json(await investigate(sample, createModelTurn(), signal));
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const controlled = ['TOOL_LIMIT', 'GROUNDING_RETRIES_EXHAUSTED', 'INVESTIGATION_LIMIT'].includes(code);
    return Response.json({ error: { code: controlled ? code : 'INVESTIGATION_FAILED', message: controlled ? 'The investigation could not produce validated findings within its limits. Please retry.' : 'Astra could not complete the investigation. Check API credentials, model access, and connectivity, then retry.' } }, { status: 502 });
  }
}
