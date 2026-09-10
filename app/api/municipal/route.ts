import { z } from 'zod';
import { createMunicipalModelTurn, investigateMunicipal } from '../../../lib/municipal/investigation';
import { createScriptedMunicipalTurn } from '../../../lib/municipal/scripted';
export const runtime = 'nodejs';
export const maxDuration = 300;
export async function POST(request: Request) {
  const parsed = z.object({ dataMode: z.enum(['live', 'snapshot', 'synthetic']), model: z.enum(['scripted', 'gpt-6-astra']), spatial: z.boolean() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: { code: 'INVALID_INPUT', message: 'Choose an explicit data mode and model transport.' } }, { status: 400 });
  const { dataMode, model, spatial } = parsed.data;
  if (spatial && process.env.SPATIAL_DEMO_ENABLED !== '1') return Response.json({ error: { code: 'SPATIAL_DISABLED', message: 'The spatial prototype is not enabled in this demo.' } }, { status: 422 });
  if (model === 'gpt-6-astra' && process.env.MUNICIPAL_ASTRA_ENABLED !== '1') return Response.json({ error: { code: 'LIVE_MODEL_DISABLED', message: 'This municipal demo currently uses the explicitly scripted transport while live model verification is pending.' } }, { status: 503 });
  try {
    const result = await investigateMunicipal({ mode: dataMode, modelLabel: model, spatial, turn: model === 'scripted' ? createScriptedMunicipalTurn(spatial) : createMunicipalModelTurn(spatial), signal: AbortSignal.any([request.signal, AbortSignal.timeout(240000)]) });
    return Response.json(result);
  } catch {
    return Response.json({ error: { code: 'MUNICIPAL_INVESTIGATION_FAILED', message: 'The investigation could not complete with the selected sources. A public-source failure does not establish missing records. You may explicitly select the dated public snapshot or synthetic scenario and retry.' } }, { status: 502 });
  }
}
