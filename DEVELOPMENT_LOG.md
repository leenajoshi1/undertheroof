# Development log

## 2026-09-10 — Repository initialization

- Renamed HomeTruth to Under the Roof at the user's request.
- Astra inspected the empty repository and selected a minimal Next.js/API/in-memory evidence architecture.
- Initial workspace commands stalled. A later clone failed with permission denied; explicitly approved escalation succeeded.
- PowerShell blocked npm.ps1; use npm.cmd without changing execution policy.
- Verified the Astra model and function-calling API against official OpenAI documentation.
- No API key was available in the environment. Live model verification is pending local configuration; offline tests must not be described as live Astra evaluations.
- Grounding analysis: existing evidence IDs alone cannot establish semantic support. P0 will require exact source quotations for factual statements and separately labeled inferences; deterministic guards remain limited, not a semantic truth guarantee.

## P0 implementation and verification

- Added Next.js input/results page and a single investigation API route. No dashboard, database, authentication, or fixed investigation checklist.
- Astra chooses evidence sources via Responses function calls and submits findings to deterministic validation. Rejections return structured errors in tool results for self-correction. Raw reasoning is not exposed.
- Added four explicitly synthetic property datasets, per-request evidence isolation, bounded tool/model calls, and a request deadline. Unsupported properties return SOURCE_UNAVAILABLE rather than receiving fabricated sample evidence.
- Added 11 offline tests, including missing IDs, invented facts despite valid IDs, missing fact/inference fields, permit-absence accusations, and rejection/correction round trips. All 11 pass. These use a scripted model transport, not live Astra.
- Added separate live behavioral evals for documented roof, incomplete records, conflicting documents, and no material concern. Not run: no API key is configured.
- First typecheck discovered missing Next type references and an SDK response-union mismatch. Added Next references and narrowed retained conversation items while preserving reasoning context. Typecheck now passes.
- Sandbox npm registry access failed with EACCES; approved installation succeeded. Test runner hit a sandbox Windows user-info error; approved execution passed without modifying machine policy.
- Production build passes. HTTP smoke checks: homepage 200; invalid input 400; unknown property 422; unconfigured API key 503, all with expected response content.
- P0 live gate remains pending API credentials. P1 streaming and later priorities have not started.
- Opportunity for Astra: relevance selection and conflict reconciliation stay model-directed instead of encoding a roof/permit/water checklist. The deterministic validator protects the evidence contract, not semantic truth.
