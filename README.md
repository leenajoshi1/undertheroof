# Under the Roof

A home listing is designed to sell you the house. Under the Roof investigates it.

GPT-6 Astra NYC hackathon project: model-directed evidence gathering, explicit facts and inferences, cited findings, and grounding correction before results reach the buyer.

## Scope

P0: Next.js + TypeScript, a Responses API tool loop, in-memory evidence, synthetic property adapters, and a minimal results page. No database or authentication. Live trace follows a verified P0.

Never commit API keys or private property documents. `.env.local` is ignored.

## Run locally

Requires Node.js 20.9 or later.

```powershell
npm.cmd install
Copy-Item .env.example .env.local
# Edit .env.local and set OPENAI_API_KEY. Never paste the key into chat.
npm.cmd run dev
```

Open http://localhost:3000. Choose a synthetic property and click Investigate property. P0 uses real Astra calls with synthetic sources; it does not silently substitute a scripted model. Arbitrary addresses and listing URLs return SOURCE_UNAVAILABLE until real adapters are connected.

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run eval:live
```

The last command requires API credentials and incurs model usage. Offline tests use a scripted transport to test orchestration and correction mechanics, not Astra reliability. Live evals exercise the four behavioral scenarios; the invalid evidence-ID case is deterministic and runs offline.

Live eval reports are written to ignored `artifacts/live-p0/`. Completed investigation responses include non-streaming `audit` metadata showing tool selections and validation outcomes. If the provider reports exhausted credits, the API returns `API_CREDITS_UNAVAILABLE`; this is a blocked investigation, not a property finding.

## Agent and evidence contract

`lib/investigation.ts` lets Astra choose a source and investigation question through `read_evidence`; it finishes through `submit_findings`. The server returns invalid submissions as structured tool results so Astra can correct them. Each investigation has isolated in-memory evidence, at most 12 model turns, 24 tool calls, and three rejected submissions. API requests have a four-minute deadline.

`lib/tools.ts` supplies four synthetic datasets behind an adapter. Evidence is returned only when a tool collects it. `lib/evidence.ts` checks schema, source IDs, exact quotations, extractive facts, and a conservative guard against permit-absence accusations. Inference is separate from factual source text. These checks do not prove semantic entailment, source truth, completeness, or that a quoted excerpt preserves all relevant context. Live evals and human evidence review remain necessary.

The original P0 route has no live trace, external property data, PDF uploads or image analysis. An additive one-property municipal demo is now available at `/municipal`; see [MUNICIPAL_DEMO.md](MUNICIPAL_DEMO.md) for public sources, scripted execution, calculator limitations and the feature-gated spatial prototype. Do not expose this unauthenticated, API-billed prototype publicly without adding usage controls.

API integration references: [function calling](https://developers.openai.com/api/docs/guides/function-calling), [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra).
