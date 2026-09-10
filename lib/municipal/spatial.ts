import { z } from 'zod';
import { record, type MunicipalEvidence } from './data';

const normalizedBoundsSchema = z.object({ x: z.number().finite().min(0).max(1), z: z.number().finite().min(0).max(1), width: z.number().positive().max(1), depth: z.number().positive().max(1) }).strict();
export const roomSchema = z.object({ id: z.string().min(1).max(40), label: z.string().min(1).max(80), bounds: normalizedBoundsSchema, adjacentTo: z.array(z.string().min(1).max(40)).max(12), evidenceIds: z.array(z.string()).min(1).max(8), confidence: z.enum(['low', 'medium', 'high']) }).strict();
export type SpatialRoom = z.infer<typeof roomSchema>;
export type Room = SpatialRoom;
export const roomConnectionSchema = z.object({ from: z.string().min(1).max(40), to: z.string().min(1).max(40), type: z.enum(['door', 'open_transition', 'unknown']), evidenceIds: z.array(z.string()).min(1).max(8) }).strict();
export type RoomConnection = z.infer<typeof roomConnectionSchema>;
export const spatialObservationSchema = z.object({ id: z.string().min(1).max(60), area: z.string().min(1).max(40), observation: z.string().min(1).max(700), evidenceIds: z.array(z.string()).min(2).max(8), confidence: z.enum(['low', 'medium', 'high']), investigationSuggestion: z.string().min(1).max(700).nullable() }).strict();
export type SpatialObservation = z.infer<typeof spatialObservationSchema>;
export const propertySpatialGraphSchema = z.object({ coordinateSystem: z.literal('normalized_0_to_1'), geometryStatus: z.literal('approximate'), rooms: z.array(roomSchema).min(1).max(20), connections: z.array(roomConnectionSchema).max(40), observations: z.array(spatialObservationSchema).max(12) }).strict();
export type PropertySpatialGraph = z.infer<typeof propertySpatialGraphSchema>;

// Legacy fixture shape is retained only for deterministic scripted tests and is never sent as Astra geometry.
export const fallbackRoomSchema = z.object({ id: z.string(), label: z.string(), x: z.number(), z: z.number(), width: z.number(), depth: z.number(), height: z.number(), evidenceIds: z.array(z.string()) }).strict();
export type FallbackRoomGeometry = z.infer<typeof fallbackRoomSchema>;
export type SpatialInput = { floorPlanEvidenceId: string; photoEvidenceIds: string[]; propertyClaimEvidenceIds: string[]; rooms: [] };
export const spatialInstructions = 'Use only supported visual evidence. Return normalized approximate geometry; exact dimensions are unavailable unless visibly supplied. Treat all bounds as APPROXIMATE and never present them as measured truth. Treat floor-plan/photo comparisons as uncertain observations, not structural or code diagnoses. Perspective, staging and outdated plans can explain differences. Cite supplied evidence, identify the room, and suggest documentation checks.';

export function spatialFixtures(): { evidence: MunicipalEvidence[]; input: SpatialInput; fallbackRooms: FallbackRoomGeometry[] } {
  const evidence = [
    record('demo:floor-plan', 'Synthetic floor-plan image asset: an enclosed kitchen is shown beside a dining room with an open connection between the rooms and a marked sink/plumbing wall. The diagram is illustrative and is not a measured plan of 2020 Delancey Place.', { sourceType: 'floor_plan', synthetic: true, provenance: 'synthetic', scope: 'scenario', areaIds: ['kitchen', 'dining'], data: { asset: 'demo-floor-plan.png', modality: 'image' } }),
    record('demo:photo', 'Synthetic kitchen reference image: a staged illustrative room view shows cabinets and a sink on one wall. This is not an actual listing photo and does not prove a wall moved, plumbing moved, a defect, code issue or unpermitted work.', { sourceType: 'listing_photo', synthetic: true, provenance: 'synthetic', scope: 'scenario', areaIds: ['kitchen'], data: { asset: 'demo-kitchen-view.png', modality: 'image' } }),
    record('demo:claim', 'Synthetic listing claim for a hypothetical kitchen: recently reconfigured open kitchen. No seller claim is attributed to the real demo property.', { sourceType: 'listing', synthetic: true, provenance: 'synthetic', scope: 'scenario', areaIds: ['kitchen'] }),
  ];
  return { evidence, input: { floorPlanEvidenceId: 'demo:floor-plan', photoEvidenceIds: ['demo:photo'], propertyClaimEvidenceIds: ['demo:claim'], rooms: [] }, fallbackRooms: [
    { id: 'kitchen', label: 'Kitchen (fallback fixture)', x: 0, z: 0, width: 4, depth: 3, height: 2.7, evidenceIds: ['demo:floor-plan'] },
    { id: 'dining', label: 'Dining (fallback fixture)', x: 4.2, z: 0, width: 4, depth: 4, height: 2.7, evidenceIds: ['demo:floor-plan'] },
  ] };
}

const forbidden = /structural|load[ -]?bearing|code violation|unsafe|illegal|unpermitted|unpermitted work|structural defect|wall (?:was|has been) removed|exact (?:dimension|measurement)|\b\d+(?:\.\d+)?\s*(?:feet|ft|meters|m|sq\.?\s*ft)/i;
function requireEvidence(ids: string[], evidence: Map<string, MunicipalEvidence>) {
  const cited = ids.map(id => evidence.get(id));
  if (cited.some(item => !item)) throw new Error('SPATIAL_EVIDENCE_MISMATCH');
  return cited as MunicipalEvidence[];
}

export function validateSpatialGraph(value: unknown, evidence: Map<string, MunicipalEvidence>) {
  const graph = propertySpatialGraphSchema.parse(value);
  const roomIds = new Set(graph.rooms.map(room => room.id));
  if (roomIds.size !== graph.rooms.length) throw new Error('DUPLICATE_ROOM_ID');
  for (const room of graph.rooms) {
    if (room.bounds.x + room.bounds.width > 1 || room.bounds.z + room.bounds.depth > 1) throw new Error('BOUNDS_OUT_OF_RANGE');
    const cited = requireEvidence(room.evidenceIds, evidence);
    if (!cited.some(item => ['floor_plan', 'listing_photo'].includes(item.sourceType))) throw new Error('ROOM_MISSING_VISUAL_SOURCE');
    if (room.adjacentTo.some(id => !roomIds.has(id) || id === room.id)) throw new Error('INVALID_ADJACENCY');
  }
  for (const connection of graph.connections) {
    if (!roomIds.has(connection.from) || !roomIds.has(connection.to) || connection.from === connection.to) throw new Error('INVALID_CONNECTION');
    requireEvidence(connection.evidenceIds, evidence);
  }
  for (const observation of graph.observations) {
    if (!roomIds.has(observation.area)) throw new Error('UNKNOWN_ROOM');
    if (forbidden.test(`${observation.observation} ${observation.investigationSuggestion || ''}`)) throw new Error('UNSUPPORTED_IMAGE_DIAGNOSIS');
    const cited = requireEvidence(observation.evidenceIds, evidence);
    if (!cited.some(item => item.sourceType === 'floor_plan') || !cited.some(item => item.sourceType === 'listing_photo')) throw new Error('MISSING_VISUAL_SOURCE');
  }
  const graphEvidence = record('spatial:graph', `Astra-generated approximate spatial graph with ${graph.rooms.length} rooms, ${graph.connections.length} connections and ${graph.observations.length} observations. Coordinates are normalized 0-1 and are not measured dimensions.`, { sourceType: 'spatial_graph', sourceName: 'GPT-6 Astra spatial extraction', provenance: 'calculation', scope: 'scenario', synthetic: [...evidence.values()].some(item => item.synthetic), derivedFrom: [...new Set([...graph.rooms, ...graph.connections, ...graph.observations].flatMap(item => item.evidenceIds))], data: graph, areaIds: graph.rooms.map(room => room.id), limitations: ['Geometry is approximate and normalized, not measured.', 'Image evidence cannot establish structural safety, code compliance or whether work occurred.'] });
  const observationEvidence = graph.observations.map(observation => record(`spatial:${observation.id}`, `Astra spatial hypothesis, not a verified physical fact: ${observation.observation}${observation.investigationSuggestion ? ` Suggested investigation: ${observation.investigationSuggestion}` : ''}`, { sourceType: 'spatial_observation', sourceName: 'GPT-6 Astra spatial extraction', provenance: 'calculation', scope: 'scenario', synthetic: graphEvidence.synthetic, derivedFrom: [graphEvidence.id, ...observation.evidenceIds], areaIds: [observation.area], data: observation, limitations: ['Approximate visual comparison cannot establish structural safety, code compliance, exact dimensions or whether work occurred.'] }));
  return { graph, evidence: [graphEvidence, ...observationEvidence] };
}

// Compatibility helper for the earlier single-observation contract and deterministic tests.
export function validateSpatialObservation(value: unknown, evidence: Map<string, MunicipalEvidence>, rooms: FallbackRoomGeometry[]) {
  const parsed = z.object({ area: z.string(), observation: z.string(), evidenceIds: z.array(z.string()), confidence: z.enum(['low', 'medium', 'high']), investigationSuggestion: z.string().optional() }).strict().parse(value);
  if (!rooms.some(room => room.id === parsed.area)) throw new Error('UNKNOWN_ROOM');
  if (forbidden.test(`${parsed.observation} ${parsed.investigationSuggestion || ''}`)) throw new Error('UNSUPPORTED_IMAGE_DIAGNOSIS');
  const cited = requireEvidence(parsed.evidenceIds, evidence);
  if (!cited.some(item => item.sourceType === 'floor_plan') || !cited.some(item => item.sourceType === 'listing_photo')) throw new Error('MISSING_VISUAL_SOURCE');
  const observation = { id: parsed.area, ...parsed, investigationSuggestion: parsed.investigationSuggestion ?? null };
  return { observation, evidence: record(`spatial:${parsed.area}`, `Spatial hypothesis, not a verified physical fact: ${parsed.observation} Suggested investigation: ${parsed.investigationSuggestion || 'Verify documentation.'}`, { sourceType: 'spatial_observation', sourceName: 'Structured spatial observation', provenance: 'calculation', scope: 'scenario', synthetic: cited.some(item => item.synthetic), derivedFrom: parsed.evidenceIds, areaIds: [parsed.area], data: observation, limitations: ['Layout comparison cannot establish structural safety, code compliance, exact dimensions or whether work occurred.'] }) };
}
