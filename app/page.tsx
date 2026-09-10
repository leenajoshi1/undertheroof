'use client';

import Link from 'next/link';

export default function Home() {
  return <main className="landing-shell">
    <header className="site-header"><Link href="/">UNDER THE ROOF</Link><span>ASTRA INVESTIGATIONS</span></header>
    <section className="landing-hero">
      <div>
        <p className="eyebrow">BEFORE YOU MAKE AN OFFER</p>
        <h1>The listing sells.<br /><em>We investigate.</em></h1>
        <p className="intro">Astra follows the evidence beneath the listing, from public records to the physical organization of a home.</p>
        <Link className="primary-cta" href="/municipal">Investigate the Philadelphia demo <span>→</span></Link>
        <p className="note">Live Astra orchestration · Philadelphia public records · multimodal spatial analysis</p>
      </div>
      <div className="hero-arc" aria-hidden="true"><span>PROPERTY</span><span>ASTRA INVESTIGATES</span><span>BUYER FINDING</span></div>
    </section>
    <section className="landing-story" aria-label="Demo capabilities">
      <div><p className="eyebrow">THE DEMO</p><h2>From the listing<br />to what it leaves out.</h2></div>
      <div className="story-steps"><div><b>01</b><span>Investigate</span><small>Public records, selected by Astra</small></div><div><b>02</b><span>Reconstruct</span><small>Images become a spatial graph</small></div><div><b>03</b><span>Findings</span><small>Grounded actions for a buyer</small></div></div>
    </section>
    <details className="evaluation-section"><summary>Evaluation scenarios</summary><p>Developer-only P0 scenarios remain available for behavioral evaluation.</p><Link href="/">Open the evaluation harness</Link></details>
    <footer>Built for the buyer. Grounded in evidence.</footer>
  </main>;
}
