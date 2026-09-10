'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { investigateMunicipal } from '../../lib/municipal/investigation';
const RoomView = dynamic(() => import('./room-view'), { ssr: false });
type Result = Awaited<ReturnType<typeof investigateMunicipal>>;
export default function MunicipalDemo({ spatialEnabled }: { spatialEnabled: boolean }) {
  const [mode, setMode] = useState<'live' | 'snapshot' | 'synthetic'>('snapshot');
  const [spatial, setSpatial] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  async function run() {
    setBusy(true); setError(''); setResult(null); setSelected(null);
    try {
      const response = await fetch('/api/municipal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataMode: mode, model: 'scripted', spatial }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Request failed.');
      setResult(body);
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed.'); } finally { setBusy(false); }
  }
  return <main><header><a href="/">⌂ UNDER THE ROOF</a></header>
    <p className="eyebrow">ONE-PROPERTY MUNICIPAL DEMO</p><h1>Beyond the listing price.</h1>
    <h2>2020 Delancey Place, Philadelphia</h2><p>OPA parcel 081035500 · Public-record demonstration; no current sale listing is asserted.</p>
    <p className="note">Scripted investigation transport — not a live Astra investigation. Public data and illustrative inputs are labeled separately.</p>
    <label htmlFor="data-mode">Evidence source</label><select id="data-mode" disabled={busy} value={mode} onChange={e => setMode(e.target.value as typeof mode)}>
      <option value="snapshot">Dated public snapshot — September 10, 2026</option><option value="live">Live Philadelphia public API</option><option value="synthetic">Explicit synthetic scenario</option>
    </select>
    {spatialEnabled && <label><input type="checkbox" disabled={busy} checked={spatial} onChange={e => setSpatial(e.target.checked)} /> Include illustrative spatial scenario (not the actual home)</label>}
    <p><button disabled={busy} onClick={run}>{busy ? 'Collecting municipal evidence…' : 'Run municipal demo →'}</button></p>
    {error && <p role="alert" className="error">{error}</p>}
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
