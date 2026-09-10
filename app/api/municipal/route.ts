import { z } from 'zod';
import { createMunicipalModelTurn, investigateMunicipal } from '../../../lib/municipal/investigation';
import { createScriptedMunicipalTurn } from '../../../lib/municipal/scripted';
export const runtime = 'nodejs';
export const maxDuration = 300;
function sanitizedError(error: unknown) {
  if (!(error instanceof Error)) return { name: 'UnknownError', message: String(error) };
  const value = error as Error & { code?: string; status?: number; type?: string; request_id?: string };
  return { name: value.name, message: value.message, code: value.code, status: value.status, type: value.type, requestId: value.request_id };
}
export async function POST(request: Request) {
  const parsed = z.object({ dataMode: z.enum(['live', 'snapshot', 'synthetic']), model: z.enum(['scripted', 'gpt-6-astra']), spatial: z.boolean(), stream: z.boolean().optional().default(false) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: { code: 'INVALID_INPUT', message: 'Choose an explicit data mode and model transport.' } }, { status: 400 });
  const { dataMode, model, spatial, stream } = parsed.data;
  console.info('[municipal] request', { dataMode, model, spatial, stream, spatialEnabled: process.env.SPATIAL_DEMO_ENABLED === '1', astraEnabled: process.env.MUNICIPAL_ASTRA_ENABLED === '1', configuredModel: process.env.OPENAI_MODEL || 'gpt-6-astra' });
  if (spatial && process.env.SPATIAL_DEMO_ENABLED !== '1') return Response.json({ error: { code: 'SPATIAL_DISABLED', message: 'The spatial prototype is not enabled in this demo.' } }, { status: 422 });
  if (model === 'gpt-6-astra' && process.env.MUNICIPAL_ASTRA_ENABLED !== '1') return Response.json({ error: { code: 'LIVE_MODEL_DISABLED', message: 'This municipal demo currently uses the explicitly scripted transport while live model verification is pending.' } }, { status: 503 });
  const turn = model === 'scripted' ? createScriptedMunicipalTurn(spatial) : createMunicipalModelTurn(spatial);
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(240000)]);
  if (stream) {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        const send = (value: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
        investigateMunicipal({ mode: dataMode, modelLabel: model, spatial, turn, signal, onEvent: event => { console.info('[municipal] event', { sequence: event.sequence, tool: event.tool, phase: event.phase, hasSpatialGraph: Boolean(event.spatialGraph) }); send({ type: 'event', event }); } })
          .then(result => { send({ type: 'result', result }); controller.close(); })
          .catch(error => { console.error('[municipal] stream failure', sanitizedError(error)); send({ type: 'error', error: { code: 'MUNICIPAL_INVESTIGATION_FAILED', message: 'The investigation could not complete with the selected sources. A public-source failure does not establish missing records.' } }); controller.close(); });
      },
    });
    return new Response(body, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' } });
  }
  try {
    const result = await investigateMunicipal({ mode: dataMode, modelLabel: model, spatial, turn, signal });
    return Response.json(result);
  } catch (error) {
    console.error('[municipal] request failure', sanitizedError(error));
    return Response.json({ error: { code: 'MUNICIPAL_INVESTIGATION_FAILED', message: 'The investigation could not complete with the selected sources. A public-source failure does not establish missing records. You may explicitly select the dated public snapshot or synthetic scenario and retry.' } }, { status: 502 });
  }
}
