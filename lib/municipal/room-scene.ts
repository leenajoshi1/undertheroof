import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { roomSchema, type RoomGeometry } from './spatial';

export type RoomFindingLink = { findingId: string; area: string; evidenceIds: string[] };
// No reconstruction, photogrammetry, textures or WebGL dependency in the investigation path.
// A future renderer can use Raycaster's hit.object.userData to open the exact finding/evidence.
export function buildRoomScene(rooms: RoomGeometry[], links: RoomFindingLink[]) {
  const group = new Group();
  for (const value of rooms) {
    const room = roomSchema.parse(value);
    const relevant = links.filter(link => link.area === room.id);
    const mesh = new Mesh(new BoxGeometry(room.width, room.height, room.depth), new MeshBasicMaterial({ color: relevant.length ? 0xb38742 : 0x617169, wireframe: true }));
    mesh.position.set(room.x + room.width / 2, room.height / 2, room.z + room.depth / 2);
    mesh.name = room.id;
    mesh.userData = { area: room.id, label: room.label, illustrative: true, findingIds: relevant.map(l => l.findingId), evidenceIds: [...new Set([...room.evidenceIds, ...relevant.flatMap(l => l.evidenceIds)])] };
    group.add(mesh);
  }
  return group;
}
export function disposeRoomScene(scene: Group) {
  for (const child of scene.children) if (child instanceof Mesh) { child.geometry.dispose(); const materials = Array.isArray(child.material) ? child.material : [child.material]; materials.forEach(m => m.dispose()); }
  scene.clear();
}
