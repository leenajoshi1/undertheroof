import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { roomSchema, type PropertySpatialGraph } from './spatial';

export type RoomFindingLink = { findingId: string; area: string; evidenceIds: string[] };
// Graph bounds are normalized and approximate. The scale and wall height are visual units, never property measurements.
export function buildRoomScene(graph: PropertySpatialGraph, links: RoomFindingLink[]) {
  const group = new Group();
  for (const value of graph.rooms) {
    const room = roomSchema.parse(value);
    const relevant = links.filter(link => link.area === room.id);
    const scale = 10, wallHeight = 2.7;
    const mesh = new Mesh(new BoxGeometry(room.bounds.width * scale, wallHeight, room.bounds.depth * scale), new MeshBasicMaterial({ color: relevant.length ? 0xb38742 : 0x617169, wireframe: true }));
    mesh.position.set((room.bounds.x + room.bounds.width / 2) * scale, wallHeight / 2, (room.bounds.z + room.bounds.depth / 2) * scale);
    mesh.name = room.id;
    mesh.userData = { area: room.id, label: room.label, approximate: true, confidence: room.confidence, adjacentTo: room.adjacentTo, findingIds: relevant.map(l => l.findingId), evidenceIds: [...new Set([...room.evidenceIds, ...relevant.flatMap(l => l.evidenceIds)])] };
    group.add(mesh);
  }
  return group;
}
export function disposeRoomScene(scene: Group) {
  for (const child of scene.children) if (child instanceof Mesh) { child.geometry.dispose(); const materials = Array.isArray(child.material) ? child.material : [child.material]; materials.forEach(m => m.dispose()); }
  scene.clear();
}
