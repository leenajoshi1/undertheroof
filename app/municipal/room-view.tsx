'use client';
import { useEffect, useRef } from 'react';
import { Color, Mesh, MeshBasicMaterial, OrthographicCamera, Raycaster, Scene, Vector2, WebGLRenderer } from 'three';
import { buildRoomScene, disposeRoomScene } from '../../lib/municipal/room-scene';
import type { RoomGeometry } from '../../lib/municipal/spatial';
import type { MunicipalFinding } from '../../lib/municipal/investigation';
export default function RoomView({ rooms, findings, selected, onSelect }: { rooms: RoomGeometry[]; findings: MunicipalFinding[]; selected: string | null; onSelect: (id: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const element = host.current;
    let renderer: WebGLRenderer;
    try { renderer = new WebGLRenderer({ antialias: true }); } catch { element.textContent = '3D preview unavailable. Use the room buttons below to inspect linked findings.'; return; }
    const scene = new Scene(); scene.background = new Color('#f8f7f3');
    const group = buildRoomScene(rooms, findings.flatMap(f => f.areaIds.map(area => ({ area, findingId: f.id, evidenceIds: f.evidenceIds })))); scene.add(group);
    for (const mesh of group.children) if (mesh instanceof Mesh && mesh.material instanceof MeshBasicMaterial && mesh.userData.findingIds.includes(selected)) mesh.material.color.set('#c46d25');
    const camera = new OrthographicCamera(-8, 8, 5, -5, 0.1, 100); camera.position.set(12, 12, 14); camera.lookAt(4, 0, 2);
    const resize = () => { const width = element.clientWidth || 600; renderer.setSize(width, 240); camera.left = -5 * width / 240; camera.right = 5 * width / 240; camera.updateProjectionMatrix(); renderer.render(scene, camera); };
    element.appendChild(renderer.domElement); resize();
    const observer = new ResizeObserver(resize); observer.observe(element);
    const click = (e: MouseEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect(); const ray = new Raycaster();
      ray.setFromCamera(new Vector2((e.clientX - bounds.left) / bounds.width * 2 - 1, -(e.clientY - bounds.top) / bounds.height * 2 + 1), camera);
      const id = ray.intersectObjects(group.children)[0]?.object.userData.findingIds[0]; if (id) onSelect(id);
    };
    renderer.domElement.addEventListener('click', click);
    return () => { observer.disconnect(); renderer.domElement.removeEventListener('click', click); disposeRoomScene(group); renderer.dispose(); renderer.domElement.remove(); };
  }, [rooms, findings, selected, onSelect]);
  return <section aria-label="Illustrative rooms linked to findings"><h3>Locate the documentation question</h3><p className="note">Synthetic room boxes in meters — not a measured floor plan or reconstruction of this property. Select the kitchen to inspect its linked permit question.</p><div ref={host} />
    {rooms.map(room => <button className="sample" key={room.id} disabled={!findings.some(f => f.areaIds.includes(room.id))} onClick={() => { const f = findings.find(f => f.areaIds.includes(room.id)); if (f) onSelect(f.id); }}>{room.label}</button>)}
  </section>;
}
