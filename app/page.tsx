'use client';

import { useState, type FormEvent } from 'react';
import { samples } from '../lib/tools';
import type { InvestigationResult } from '../lib/investigation';

export default function Home() {
  const [property, setProperty] = useState('456 Oak Avenue');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<InvestigationResult | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/investigate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ property }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Investigation failed.');
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not connect.'); }
    finally { setBusy(false); }
  }
  return <main>
    <header>⌂ &nbsp; UNDER THE ROOF <span>ASTRA INVESTIGATIONS</span></header>
    <p className="eyebrow">BEFORE YOU MAKE AN OFFER</p>
    <h1>The listing sells.<br />We investigate.</h1>
    <p className="intro">Follow the evidence beneath the listing. Get grounded questions worth asking before your next big decision.</p>
    <form onSubmit={submit}>
      <label htmlFor="property">Property address or listing URL</label>
      <div className="input-row"><input id="property" value={property} onChange={e => setProperty(e.target.value)} required disabled={busy} maxLength={2000} /><button disabled={busy}>{busy ? 'Investigating…' : 'Investigate property →'}</button></div>
    </form>
    <p className="note">Prototype · Synthetic property evidence, investigated by live Astra. Real address and URL lookup is not connected yet.</p>
    <div className="samples">{samples.map(s => <button className="sample" disabled={busy} key={s.id} onClick={() => setProperty(s.address)}>{s.label}</button>)}</div>
    {busy && <p role="status">Under the Roof is investigating the available evidence. This can take a few minutes.</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {result && <section aria-label="Investigation results">
      <p className="eyebrow">INVESTIGATION COMPLETE · SYNTHETIC EVIDENCE</p>
      <h2>{result.findings.length ? `${result.findings.length} finding${result.findings.length === 1 ? '' : 's'} to consider` : 'No material concern identified in the reviewed evidence'}</h2>
      <p className="note">{result.toolCalls} tool calls · {result.evidence.length} sources collected · {result.corrections} correction rounds. This review does not establish that a property is free of defects.</p>
      {result.findings.map(f => <article key={f.id}>
        <p className="eyebrow">{f.severity} · {f.confidence} confidence</p><h3>{f.title}</h3>
        <h4>Fact · source statements</h4><p className="facts">{f.fact}</p>
        <h4>Inference</h4><p>{f.inference}</p>
        <h4>Your next action</h4><p>{f.recommendedAction}</p>
        <details><summary>Inspect {f.evidenceIds.length} supporting sources</summary>{f.evidenceIds.map(id => {
          const e = result.evidence.find(item => item.id === id)!;
          return <blockquote key={id}><strong>{e.sourceName}</strong><p>{e.content}</p><small>{e.id} · Retrieved {new Date(e.timestamp).toLocaleString()}</small></blockquote>;
        })}</details>
      </article>)}
      <details><summary>All collected evidence</summary>{result.evidence.map(e => <blockquote key={e.id}><strong>{e.sourceName}</strong><p>{e.content}</p></blockquote>)}</details>
    </section>}
    <footer>Built for the buyer. Grounded in evidence.</footer>
  </main>;
}
