import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from 'three';
import { spatialFixtures, validateSpatialGraph } from '../lib/municipal/spatial';
import { buildRoomScene, disposeRoomScene } from '../lib/municipal/room-scene';

const assets = spatialFixtures();
const evidence = new Map(assets.evidence.map(item => [item.id, item]));
const graph = {
  coordinateSystem: 'normalized_0_to_1' as const,
  geometryStatus: 'approximate' as const,
  rooms: [
    { id: 'kitchen', label: 'Kitchen', bounds: { x: 0.08, z: 0.16, width: 0.39, depth: 0.59 }, adjacentTo: ['dining'], evidenceIds: ['demo:floor-plan', 'demo:photo'], confidence: 'medium' as const },
    { id: 'dining', label: 'Dining', bounds: { x: 0.5, z: 0.16, width: 0.42, depth: 0.59 }, adjacentTo: ['kitchen'], evidenceIds: ['demo:floor-plan'], confidence: 'medium' as const },
  ],
  connections: [{ from: 'kitchen', to: 'dining', type: 'open_transition' as const, evidenceIds: ['demo:floor-plan'] }],
  observations: [{ id: 'kitchen-layout', area: 'kitchen', observation: 'The available floor-plan and room-image evidence suggests the kitchen configuration may have changed.', evidenceIds: ['demo:floor-plan', 'demo:photo', 'demo:claim'], confidence: 'medium' as const, investigationSuggestion: 'Check renovation and permit records.' }],
};

test('Astra spatial graph is attributed and approximate', () => {
  const result = validateSpatialGraph(graph, evidence);
  assert.equal(result.graph.geometryStatus, 'approximate');
  assert.equal(result.evidence[0].sourceType, 'spatial_graph');
  assert.ok(result.evidence.some(item => item.id === 'spatial:kitchen-layout'));
});
test('Three.js geometry is derived from model-returned bounds', () => {
  const validated = validateSpatialGraph(graph, evidence).graph;
  const scene = buildRoomScene(validated, [{ area: 'kitchen', findingId: 'layout', evidenceIds: ['spatial:kitchen-layout'] }]);
  const kitchen = scene.getObjectByName('kitchen')!;
  assert.ok(kitchen instanceof Mesh);
  assert.ok(Math.abs(kitchen.geometry.parameters.width - 3.9) < 0.00001);
  assert.deepEqual(kitchen.userData.adjacentTo, ['dining']);
  disposeRoomScene(scene); assert.equal(scene.children.length, 0);
});
test('changing graph bounds changes rendered room geometry', () => {
  const original = buildRoomScene(validateSpatialGraph(graph, evidence).graph, []);
  const changedGraph = structuredClone(graph); changedGraph.rooms[0].bounds.width = 0.25;
  const changed = buildRoomScene(validateSpatialGraph(changedGraph, evidence).graph, []);
  const originalKitchen = original.getObjectByName('kitchen')!, changedKitchen = changed.getObjectByName('kitchen')!;
  assert.ok(originalKitchen instanceof Mesh && changedKitchen instanceof Mesh);
  assert.notEqual(originalKitchen.geometry.parameters.width, changedKitchen.geometry.parameters.width);
  disposeRoomScene(original); disposeRoomScene(changed);
});
test('graph rejects nonexistent evidence and malformed normalized geometry', () => {
  const missing = structuredClone(graph); missing.rooms[0].evidenceIds = ['invented'];
  assert.throws(() => validateSpatialGraph(missing, evidence), /SPATIAL_EVIDENCE_MISMATCH/);
  const malformed = structuredClone(graph); malformed.rooms[0].bounds.x = 0.9;
  assert.throws(() => validateSpatialGraph(malformed, evidence), /BOUNDS_OUT_OF_RANGE/);
});
test('exact dimensions and unsafe image-only claims are rejected', () => {
  const exact = structuredClone(graph); exact.observations[0].observation = 'The kitchen is exactly 12 feet wide.';
  assert.throws(() => validateSpatialGraph(exact, evidence), /UNSUPPORTED_IMAGE_DIAGNOSIS/);
  const unsafe = structuredClone(graph); unsafe.observations[0].observation = 'The image proves an illegal renovation.';
  assert.throws(() => validateSpatialGraph(unsafe, evidence), /UNSUPPORTED_IMAGE_DIAGNOSIS/);
});
