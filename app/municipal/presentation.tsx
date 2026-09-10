import type { MunicipalEvidence } from '../../lib/municipal/data';
import type { MunicipalFinding } from '../../lib/municipal/investigation';

export function permitSummary(evidence: MunicipalEvidence[]) {
  const permits = evidence.filter(e => e.sourceType === 'permit');
  const roof = permits.find(e => /roof|gutter/i.test(String(e.data?.approvedscopeofwork)) && /complet/i.test(String(e.data?.status)));
  if (roof && permits.length === 1) return 'Philadelphia records returned a completed roof/gutter permit, but that record does not verify kitchen work.';
  return evidence.some(e => e.sourceType === 'permit_search') ? 'Permit history was checked. Returned records verify only their stated scope; kitchen documentation still needs review.' : 'Permit evidence is not yet available.';
}

export function EvidenceDetails({ evidence }: { evidence: MunicipalEvidence[] }) {
  return <div className="technical-evidence">{evidence.map(e => <blockquote key={e.id}><strong>{e.sourceName}</strong><p>{e.content}</p><small>{e.id} · {e.provenance}{e.synthetic ? ' · Synthetic' : ''}</small>{e.limitations.map(l => <p key={l}>{l}</p>)}{e.sourceUrl && <a href={e.sourceUrl} target="_blank" rel="noreferrer">Public source ↗</a>}</blockquote>)}</div>;
}

export function FindingCard({ finding: f, evidence, selected, explore }: { finding: MunicipalFinding; evidence: MunicipalEvidence[]; selected: boolean; explore: () => void }) {
  const cited = evidence.filter(e => f.evidenceIds.includes(e.id));
  const spatial = f.areaIds.length > 0;
  const cost = cited.filter(e => e.sourceType === 'calculation' && typeof e.data?.annualTaxEstimate === 'number').sort((a,b) => (b.year ?? 0) - (a.year ?? 0))[0];
  const prior = cost && evidence.find(e => e.sourceType === 'calculation' && e.year === (cost.year ?? 0) - 1 && typeof e.data?.annualTaxEstimate === 'number');
  const amount = cost?.data?.annualTaxEstimate as number | undefined;
  const delta = amount !== undefined && prior ? amount - Number(prior.data?.annualTaxEstimate) : undefined;
  const usd = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  return <article className={`finding-card ${selected ? 'is-selected' : ''}`} id={f.id}>
    <div className="finding-top"><span className="finding-kind">{spatial ? `RENOVATION / ${f.areaIds[0].toUpperCase()}` : cost ? `${cost.year} ESTIMATED PROPERTY TAX` : 'OWNERSHIP COST'}</span><span>{f.confidence} confidence</span></div>
    <h3 className={cost ? 'tax-amount' : ''}>{amount !== undefined ? <>{usd(amount)} <small>/ year</small></> : spatial ? 'Documentation worth verifying' : f.title}</h3>
    {delta !== undefined && <p className="tax-delta">{delta >= 0 ? '+' : '−'}{usd(Math.abs(delta))} vs. {prior?.year} estimate</p>}
    <p>{spatial ? `Astra’s spatial analysis suggested checking renovation documentation. ${permitSummary(cited)}` : cost ? 'Assessment-based estimate using the recorded taxable value and reviewed tax rate. Confirm the actual bill and exemption treatment before relying on this amount.' : f.inference}</p>
    <h4>Buyer action</h4><p>{spatial ? 'Request renovation plans, work scope, applicable permits and final inspection records from the seller.' : f.recommendedAction}</p>
    <p className="qualification">{spatial ? 'Synthetic spatial imagery. Municipal search may be incomplete; no conclusion that unpermitted work occurred.' : cost ? 'Estimate, not a tax bill or complete ownership cost.' : ''}</p>
    <div className="finding-actions">{spatial && <button className="text-button" onClick={explore}>Explore in 3D →</button>}<details><summary>View evidence</summary><h4>Fact</h4><p className="full-fact">{f.fact}</p><h4>Inference</h4><p>{f.inference}</p><h4>Original buyer action</h4><p>{f.recommendedAction}</p><EvidenceDetails evidence={cited} /></details></div>
  </article>;
}
