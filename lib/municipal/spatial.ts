import { z } from 'zod';
import { record, type MunicipalEvidence } from './data';

export const roomSchema = z.object({ id: z.string().min(1), label: z.string().min(1), x: z.number().finite(), z: z.number().finite(), width: z.number().positive().max(50), depth: z.number().positive().max(50), height: z.number().positive().max(10), evidenceIds: z.array(z.string()).min(1) }).strict();
export type RoomGeometry = z.infer<typeof roomSchema>;
export const spatialObservationSchema = z.object({
  area: z.string().min(1), observation: z.string().min(1).max(600), evidenceIds: z.array(z.string()).min(2).max(6),
  confidence: z.enum(['low', 'medium']), investigationSuggestion: z.string().min(1).max(600),
}).strict();
export type SpatialObservation = z.infer<typeof spatialObservationSchema>;
export type SpatialInput = { floorPlanEvidenceId: string; photoEvidenceIds: string[]; propertyClaimEvidenceIds: string[]; rooms: RoomGeometry[] };
export const spatialInstructions = 'Treat floor-plan/photo comparisons as uncertain observations, not structural or code diagnoses. Perspective, staging and outdated plans can explain differences. Cite supplied evidence, identify the room, and suggest documentation checks. Geometry is illustrative unless measurements are verified.';

// These are text fixtures simulating future multimodal inputs, NOT images of the real property.
export function spatialFixtures(): { evidence: MunicipalEvidence[]; input: SpatialInput } {
  const evidence = [
    record('demo:floor-plan', 'Synthetic floor-plan image asset: an enclosed kitchen is shown beside a dining room with an open connection between the rooms and a marked sink/plumbing wall. The diagram is illustrative and is not a measured plan of 2020 Delancey Place.', { sourceType: 'floor_plan', synthetic: true, provenance: 'synthetic', scope: 'scenario', areaIds: ['kitchen', 'dining'], data: { asset: 'demo-floor-plan.svg', modality: 'image' } }),
    record('demo:photo', 'Synthetic photo description: the kitchen appears open to a neighboring dining area. This is a text fixture, not an actual listing photo and not proof that a wall was removed.', { sourceType: 'listing_photo', synthetic: true, provenance: 'synthetic', scope: 'scenario', areaIds: ['kitchen', 'dining'] }),
    record('demo:claim', 'Synthetic listing claim for a hypothetical kitchen: recently reconfigured open kitchen. No seller claim is attributed to the real demo property.', { sourceType: 'listing', synthetic: true, provenance: 'synthetic', scope: 'scenario', areaIds: ['kitchen'] }),
  ];
  return { evidence, input: { floorPlanEvidenceId: 'demo:floor-plan', photoEvidenceIds: ['demo:photo'], propertyClaimEvidenceIds: ['demo:claim'], rooms: [
    { id: 'kitchen', label: 'Kitchen (illustrative)', x: 0, z: 0, width: 4, depth: 3, height: 2.7, evidenceIds: ['demo:floor-plan'] },
    { id: 'dining', label: 'Dining (illustrative)', x: 4.2, z: 0, width: 4, depth: 4, height: 2.7, evidenceIds: ['demo:floor-plan'] },
  ] } };
}

export function validateSpatialObservation(value: unknown, evidence: Map<string, MunicipalEvidence>, rooms: RoomGeometry[]) {
  const item = spatialObservationSchema.parse(value);
  if (!rooms.some(r => r.id === item.area)) throw new Error('UNKNOWN_ROOM');
  const cited = item.evidenceIds.map(id => evidence.get(id));
  if (cited.some(e => !e || !e.areaIds?.includes(item.area))) throw new Error('SPATIAL_EVIDENCE_MISMATCH');
  if (!['floor_plan', 'listing_photo'].every(type => cited.some(e => e?.sourceType === type))) throw new Error('MISSING_VISUAL_SOURCE');
  if (/structural|load.bearing|code violation|unsafe|illegal|unpermitted|defect|wall (?:was|has been) removed/i.test(item.observation + ' ' + item.investigationSuggestion)) throw new Error('UNSUPPORTED_IMAGE_DIAGNOSIS');
  return { observation: item, evidence: record(`spatial:${item.area}`, `Spatial hypothesis, not a verified physical fact: ${item.observation} Suggested investigation: ${item.investigationSuggestion}`, {
    sourceType: 'spatial_observation', sourceName: 'Structured spatial observation', provenance: 'calculation', scope: 'scenario',
    synthetic: cited.some(e => e!.synthetic), derivedFrom: item.evidenceIds, areaIds: [item.area], data: item,
    limitations: ['Layout comparison cannot establish structural safety, code compliance, or whether work occurred.'],
  }) };
}
