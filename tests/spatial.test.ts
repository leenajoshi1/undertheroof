import test from 'node:test';
import assert from 'node:assert/strict';
import { spatialFixtures, validateSpatialObservation } from '../lib/municipal/spatial';
import { buildRoomScene, disposeRoomScene } from '../lib/municipal/room-scene';

const assets = spatialFixtures();
const evidence = new Map(assets.evidence.map(e => [e.id, e]));
const observation = { area: 'kitchen', observation: 'The supplied synthetic plan and photo descriptions suggest a possible layout difference.', evidenceIds: ['demo:floor-plan', 'demo:photo'], confidence: 'medium', investigationSuggestion: 'Check the relevant renovation documentation.' };
test('structured spatial observation is an attributed hypothesis', () => {
  const result = validateSpatialObservation(observation, evidence, assets.input.rooms);
  assert.equal(result.evidence.synthetic, true);
  assert.equal(result.evidence.scope, 'scenario');
  assert.deepEqual(result.evidence.derivedFrom, observation.evidenceIds);
});
test('images cannot establish structural defects and references must be real', () => {
  assert.throws(() => validateSpatialObservation({ ...observation, observation: 'A structural defect is present.' }, evidence, assets.input.rooms), /UNSUPPORTED_IMAGE_DIAGNOSIS/);
  assert.throws(() => validateSpatialObservation({ ...observation, area: 'attic' }, evidence, assets.input.rooms), /UNKNOWN_ROOM/);
  assert.throws(() => validateSpatialObservation({ ...observation, evidenceIds: ['missing', 'demo:photo'] }, evidence, assets.input.rooms), /SPATIAL_EVIDENCE_MISMATCH/);
});
test('Three.js geometry connects the physical room to findings and evidence', () => {
  const scene = buildRoomScene(assets.input.rooms, [{ area: 'kitchen', findingId: 'layout', evidenceIds: ['spatial:kitchen', 'phila:permit-search'] }]);
  const kitchen = scene.getObjectByName('kitchen')!;
  assert.deepEqual(kitchen.userData.findingIds, ['layout']);
  assert.ok(kitchen.userData.evidenceIds.includes('phila:permit-search'));
  assert.equal(scene.children.length, 2);
  disposeRoomScene(scene); assert.equal(scene.children.length, 0);
});
