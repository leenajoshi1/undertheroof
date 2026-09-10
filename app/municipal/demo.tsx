'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { investigateMunicipal } from '../../lib/municipal/investigation';
const RoomView = dynamic(() => import('./room-view'), { ssr: false });
type Result = Awaited<ReturnType<typeof investigateMunicipal>>;
export default function MunicipalDemo({ spatialEnabled }: { spatialEnabled: boolean }) {
  const [mode, setMode] = useState<'live' | 'snapshot' | 'synthetic'>('live');
  const [model, setModel] = useState<'scripted' | 'gpt-6-astra'>('gpt-6-astra');
  const [spatial, setSpatial] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [liveEvents, setLiveEvents] = useState<Result['events']>([]);
  const [selected, setSelected] = useState<string | null>(null);
  async function run() {
    setBusy(true); setError(''); setResult(null); setSelected(null); setLiveEvents([]);
    try {
      const response = await fetch('/api/municipal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataMode: mode, model, spatial, stream: true }) });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error?.message || 'Request failed.'); }
      if (!response.body) throw new Error('Investigation stream unavailable.');
      const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '';
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break; buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines.filter(Boolean)) { const item = JSON.parse(line); if (item.type === 'event') setLiveEvents(events => [...events, item.event]); if (item.type === 'result') setResult(item.result); if (item.type === 'error') throw new Error(item.error.message); }
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed.'); } finally { setBusy(false); }
  }
  return <main><header><a href="/">⌂ UNDER THE ROOF</a></header>
    <p className="eyebrow">ONE-PROPERTY MUNICIPAL DEMO</p><h1>Beyond the listing price.</h1>
    <h2>2020 Delancey Place, Philadelphia</h2><p>OPA parcel 081035500 · Public-record demonstration; no current sale listing is asserted.</p>
    <p className="note">Scripted investigation transport — not a live Astra investigation. Public data and illustrative inputs are labeled separately.</p>
    <p className="note">Astra selects the investigation steps. Public data and the illustrative floor-plan image are labeled separately.</p>
    <label htmlFor="model">Investigator</label><select id="model" disabled={busy} value={model} onChange={e => setModel(e.target.value as typeof model)}><option value="gpt-6-astra">Live GPT-6 Astra</option><option value="scripted">Scripted contract demo</option></select>
    <label htmlFor="data-mode">Evidence source</label><select id="data-mode" disabled={busy} value={mode} onChange={e => setMode(e.target.value as typeof mode)}>
      <option value="snapshot">Dated public snapshot — September 10, 2026</option><option value="live">Live Philadelphia public API</option><option value="synthetic">Explicit synthetic scenario</option>
    </select>
    {spatialEnabled && <label><input type="checkbox" disabled={busy} checked={spatial} onChange={e => setSpatial(e.target.checked)} /> Include illustrative spatial scenario (not the actual home)</label>}
    <p><button disabled={busy} onClick={run}>{busy ? 'Collecting municipal evidence…' : 'Run municipal demo →'}</button></p>
    {error && <p role="alert" className="error">{error}</p>}
    {(busy || liveEvents.length > 0) && <section aria-label="Live investigation trace" className="trace"><p className="eyebrow">Investigation trace</p><ol>{liveEvents.map(event => <li key={event.sequence} className={event.phase}>{event.label}{event.phase === 'completed' ? ' done' : event.phase === 'rejected' ? ' — correcting evidence' : event.phase === 'failed' ? ' — source unavailable' : '…'}</li>)}</ol>{busy && <p className="note">Astra’s internal reasoning stays private; this timeline shows only tool-level actions.</p>}</section>}
    {result && <section><p className="eyebrow">{result.model} · {result.dataMode} · {result.corrections} corrections</p>
      <details><summary>Completed investigation activity</summary><ol>{result.events.filter(e => e.phase !== 'started').map(e => <li key={e.sequence}>{e.label} {e.phase}{e.errors ? ` (${e.errors.join(', ')})` : ''}</li>)}</ol></details>
      {result.rooms.length > 0 && <RoomView rooms={result.rooms} findings={result.findings} selected={selected} onSelect={id => { setSelected(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} />}
      {result.findings.map(f => <article id={f.id} key={f.id} style={selected === f.id ? { borderColor: '#b38742' } : undefined}>
        <p className="eyebrow">{f.severity} · {f.confidence} confidence</p><h3>{f.title}</h3>
        {f.areaIds.length > 0 && <button className="sample" onClick={() => setSelected(f.id)}>Locate {f.areaIds.join(', ')} in illustrative rooms</button>}
        <h4>Fact · source statements</h4><p className="facts">{f.fact}</p><h4>Inference</h4><p>{f.inference}</p><h4>Next action</h4><p>{f.recommendedAction}</p>
        <details><summary>Inspect supporting evidence</summary>{f.evidenceIds.map(id => { const e = result.evidence.find(item => item.id === id)!; return <blockquote key={id}><strong>{e.sourceName}</strong><p>{e.provenance} · {e.scope}{e.synthetic ? ' · SYNTHETIC' : ''}{e.year ? ` · Tax year ${e.year}` : ''}</p><p>{e.content}</p>{e.sourceUrl && <a href={e.sourceUrl} target="_blank" rel="noreferrer">Public source</a>}<p className="note">{e.retrievedAt ? `Source retrieved/reviewed ${e.retrievedAt}` : `Evidence created ${e.timestamp}`}</p>{e.limitations.map(l => <p className="note" key={l}>{l}</p>)}</blockquote>; })}</details>
      </article>)}
      <details><summary>All {result.evidence.length} evidence objects</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(result.evidence, null, 2)}</pre></details>
    </section>}
  </main>;
}
