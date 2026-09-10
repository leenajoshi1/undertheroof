'use client';
import { useEffect, useRef, useState } from 'react';
import { Color, Mesh, MeshBasicMaterial, OrthographicCamera, Raycaster, Scene, Vector2, WebGLRenderer } from 'three';
import { buildRoomScene, disposeRoomScene } from '../../lib/municipal/room-scene';
import type { PropertySpatialGraph } from '../../lib/municipal/spatial';
import type { MunicipalEvidence } from '../../lib/municipal/data';
import type { MunicipalFinding } from '../../lib/municipal/investigation';

export default function RoomView({ graph, evidence, findings, selected, selectedRoom, onSelect, onSelectRoom }: { graph: PropertySpatialGraph; evidence: MunicipalEvidence[]; findings: MunicipalFinding[]; selected: string | null; selectedRoom: string | null; onSelect: (id: string) => void; onSelectRoom: (id: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const element = host.current;
    let renderer: WebGLRenderer;
    try { renderer = new WebGLRenderer({ antialias: true }); } catch { element.textContent = '3D preview unavailable. Use the room buttons below to inspect linked evidence.'; return; }
    const scene = new Scene(); scene.background = new Color('#f8f7f3');
    const renderStarted = performance.now();
    const group = buildRoomScene(graph, findings.flatMap(f => f.areaIds.map(area => ({ area, findingId: f.id, evidenceIds: f.evidenceIds })))); scene.add(group);
    setRenderMs(Math.round((performance.now() - renderStarted) * 10) / 10);
    for (const mesh of group.children) if (mesh instanceof Mesh && mesh.material instanceof MeshBasicMaterial && mesh.userData.area === selectedRoom) mesh.material.color.set('#c46d25');
    const camera = new OrthographicCamera(-6, 6, 5, -5, 0.1, 100); camera.position.set(12, 12, 14); camera.lookAt(5, 0, 5);
    const resize = () => { const width = element.clientWidth || 600; renderer.setSize(width, 260); camera.left = -5 * width / 260; camera.right = 5 * width / 260; camera.updateProjectionMatrix(); renderer.render(scene, camera); };
    element.appendChild(renderer.domElement); resize();
    const observer = new ResizeObserver(resize); observer.observe(element);
    const click = (event: MouseEvent) => { const bounds = renderer.domElement.getBoundingClientRect(); const ray = new Raycaster(); ray.setFromCamera(new Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera); const area = ray.intersectObjects(group.children)[0]?.object.userData.area; if (area) onSelectRoom(area); };
    renderer.domElement.addEventListener('click', click);
    return () => { observer.disconnect(); renderer.domElement.removeEventListener('click', click); disposeRoomScene(group); renderer.dispose(); renderer.domElement.remove(); };
  }, [graph, findings, selectedRoom, onSelectRoom]);
  const room = graph.rooms.find(item => item.id === selectedRoom);
  const roomEvidence = room ? evidence.filter(item => item.areaIds?.includes(room.id) && ['floor_plan', 'listing_photo'].includes(item.sourceType)) : [];
  const observation = room ? evidence.find(item => item.sourceType === 'spatial_observation' && item.areaIds?.includes(room.id)) : undefined;
  const finding = room ? findings.find(item => item.areaIds.includes(room.id)) : undefined;
  return <section aria-label="AI reconstructed spatial evidence"><h3>AI-reconstructed spatial model</h3><p className="note">Approximate, not to scale. Generated from Astra's validated spatial graph; normalized bounds are not measured property dimensions.{renderMs !== null ? ` Generated in ${renderMs} ms.` : ''}</p><div ref={host} />
    {graph.rooms.map(item => <button className="sample" key={item.id} onClick={() => onSelectRoom(item.id)}>{item.label}</button>)}
    {room && <aside className="spatial-detail"><p className="eyebrow">Room</p><h4>{room.label}</h4><p className="eyebrow">Spatial evidence</p>{roomEvidence.map(item => <p key={item.id}>{item.sourceName}</p>)}{observation && <><p className="eyebrow">Astra observation</p><p>{observation.content}</p></>}{finding && <><p className="eyebrow">Investigation and final buyer finding</p><p>{finding.recommendedAction}</p><p>{finding.title}</p></>}</aside>}
  </section>;
}
