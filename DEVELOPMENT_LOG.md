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

## Live P0 gate attempt — 2026-09-10

- Confirmed OPENAI_API_KEY is populated in ignored .env.local without printing its value. Configured model: gpt-6-astra; no model substitution.
- Ran all four behavioral evals through the live Responses API. All four were blocked before a model response: HTTP 429, provider code credit_balance_exhausted. This is not a behavioral assertion failure and does not justify changing the investigation prompt.
  - documented-roof: blocked (15:27:19 UTC).
  - missing-permit: blocked (15:27:20 UTC).
  - conflicting-documents: blocked (15:27:23 UTC).
  - no-concerns: blocked (15:27:26 UTC).
- Built and started a fresh Next.js production server on loopback port 3001. Sent a real POST /api/investigate for 456 Oak Avenue. At 15:37:25 UTC the route returned HTTP 503 with API_CREDITS_UNAVAILABLE after the upstream credit rejection. No successful end-to-end finding was produced.
- Live tool choices: none. Collected evidence: none. Final findings: none. Validator submissions/rejections: none. Live self-correction: not exercised. Offline self-correction remains tested; it is not evidence of live Astra correction.
- Added non-streaming audit metadata for completed investigations: selected source, public investigation question, and validation outcome/error codes. No raw model reasoning or rejected finding text is returned in audit metadata. No P1/UI changes.
- Live evals now save local result/error artifacts and sanitize SDK errors to avoid exposing credential fragments. Artifacts are ignored by Git. API error handling now distinguishes exhausted credits using an allowlisted code, without returning raw provider messages.
- Validation after changes: all 11 offline tests pass, including audit assertions for rejection/correction; production build and its TypeScript check pass.
- Local reports: artifacts/live-p0/{documented-roof,missing-permit,conflicting-documents,no-concerns}.error.json and artifacts/live-p0/api-e2e.json.
- Gate remains BLOCKED pending available credits for the configured credential. Rerun the four live evals and API request after credits are restored. P1 and all later priorities remain paused.

## Municipal/public-record development while Astra credits are unavailable

- User explicitly authorized continued development with the scripted model transport, prioritizing one municipality and a tiny spatial boundary. The live-credit blocker remains external; no paid model requests were made in this phase. The original P0 live transport, prompt, tools, API route, grounding validator and live eval files were preserved unchanged.
- Researched Austin, NYC and Philadelphia official/public datasets. Selected 2020 Delancey Place, Philadelphia (OPA 081035500) after verifying public CARTO responses for assessor data, assessment history and permits. Announced selection before implementing major changes. No active sale listing is asserted and owner/mailing fields are excluded.
- Public-data access decision: use fixed, bounded, read-only SQL against the city-published CARTO API. Public API requests succeeded without credentials. Initial shell request was sandbox-denied (EACCES); approved network access worked. Legacy OpenDataPhilly URL guesses failed web retrieval; the current Philadelphia Properties and Assessment History catalog provided the authoritative source/license links. No HTML scraping or protected tax-account scraping was attempted or bypassed.
- Kept three explicit data modes: live public, timestamped actual public snapshot, and synthetic scenario. A live outage fails explicitly and never becomes a synthetic result. Added schema/parcel checks and dataset caching within one investigation only.
- Astra's development analysis identified a material timing issue: the current OPA roll reflects the 2027 value, while 2026 must come from year-specific history. It also identified the double-deduction risk: taxable land/building already reflect exemptions. Implemented year-constrained, evidence-ID-based deterministic calculations.
- Snapshot/live test results: 2026 estimated tax $44,128.70; 2027 $48,311.30. These are not verified billed taxes. Modeled exemption sensitivity $1,399.80 annually is a hypothetical, not a transfer prediction. September-2026 stormwater policy supports an optional $276.60 annual scenario, not an actual property utility bill.
- CCD published charge examples have inconsistent text/arithmetic, and the parcel's district membership/bill is not verified. Avoided deriving a purported charge. Special assessments remain unknown; actual tax payments, abatement expiration, utility bills and other charges require buyer follow-up.
- Added separate municipal tool executor and model-turn interface. No tool order is imposed; a test chooses only assessor records and then concludes. The scripted demonstration sequence is clearly labeled and is never called live Astra. Public investigation event labels expose activities, not chain-of-thought. They are not streamed.
- Added structured spatial inputs/observations and two illustrative Three.js room boxes behind SPATIAL_DEMO_ENABLED. Inputs are synthetic text stand-ins, not actual images or measured geometry. The validated link is observation -> selected permit tool -> public search/permit scope -> cited finding -> kitchen area. Scene userData and accessible controls connect room selection to findings/evidence. No full reconstruction or structural/code diagnosis is implemented.
- Regression coverage expanded incrementally: 15 tests after data adapter; 19 after tools/costs; 22 after spatial contracts; 24 after municipal orchestration; 25 after synthetic-scenario correction. All pass. Injected bad citation produces one grounding rejection followed by a corrected scripted submission. This is not a live Astra self-correction result.
- Development review caught an overstatement in the scripted synthetic demo: equal supplied year values were initially described by static wording as differing. Made that wording depend on deterministic cost outputs and added a regression. Added a guard against spatial evidence being cited without a room link, and included actual permit scope in spatial findings.
- Live public-data scripted investigation succeeded with 20 evidence objects, three findings (two municipal plus one explicitly synthetic spatial), and zero natural validation rejections. Next.js POST /api/municipal returned 200 for live, snapshot and synthetic modes. The live municipal model route correctly stays disabled unless explicitly enabled. Original live evals remain ready for credits.
- Production builds and TypeScript checks pass. Three.js scene construction/linkage/disposal tests pass; tsx emits a non-failing CommonJS deprecation warning for Three.js. Browser QA attempted through the supplied browser tool, but it reported no browser available; interactive WebGL appearance is not visually verified.
- Artifacts are saved locally under ignored artifacts/municipal/. Public snapshot and documentation are committed; credentials remain ignored. No auth, database, chat, nationwide lookup, PDFs or actual photo-analysis pipeline added.

## Hackathon demo hardening - multimodal Astra and live trace - 2026-09-10

- Added `lib/municipal/demo-floor-plan.png`, a clearly labeled synthetic floor-plan asset. The municipal Astra request sends it as a real `input_image` data URL with `detail: high`; the image is not converted into a hard-coded observation. The model still calls `record_spatial_observation`, whose structured output becomes a derived Evidence object.
- The first live multimodal attempt correctly reached GPT-6 Astra but failed because SVG was not an accepted image MIME type. Converted the same diagram to PNG and reran successfully. This failure is documented rather than hidden.
- Final live run: `gpt-6-astra`, Philadelphia public API, PNG floor plan, permit follow-up, one grounding correction, two findings, 14 evidence objects, 76.5 seconds end to end. The final tool path included jurisdiction identification, tax history, deterministic ownership-cost calculation, spatial observation, permit history and grounded submission. The kitchen finding links to the `kitchen` room and cites the spatial and permit evidence.
- Latency measurements: scripted public-record baseline 2.54 seconds; first successful multimodal Astra run 118.0 seconds; reduced output budget/reasoning effort and demo-focused finding prompt brought the next run to 63.9 seconds, then the final two-finding run measured 76.5 seconds. No public source was replaced with a fixture during live mode; per-investigation dataset caching remains provenance-labeled.
- Added an NDJSON investigation stream. The UI shows only tool-level labels such as jurisdiction, assessor, floor-plan analysis, permit history, cost calculation and reconciliation; reasoning tokens are never sent to the browser. A validator guard requires a room-linked spatial finding when a spatial observation and permit search both exist, preventing a successful permit call from disappearing from the final demo.
- Incorporated the existing live-eval diff intentionally: live P0 artifacts now retain sanitized tool traces, model-turn counts and per-case latency metadata. No credentials or raw provider errors are written.
- Final verification after hardening: 26 tests pass, TypeScript passes, and production build passes. The local demo flags enable the verified live Astra/spatial configuration; the synthetic image and synthetic listing/photo descriptions remain explicitly labeled.

## Municipal and spatial stage verified checkpoint - 2026-09-10

- Jurisdiction/property selected for the hackathon demo: Philadelphia, Pennsylvania; 2020 Delancey Place, OPA parcel 081035500. The source decision is documented in `MUNICIPAL_DEMO.md` and uses the City-published OpenDataPhilly/OPA and L&I public CARTO endpoints with bounded, read-only queries.
- Real public municipal end-to-end run succeeded with the live Philadelphia endpoint. It collected 20 evidence objects and produced deterministic assessment-based estimates of $44,128.70 for 2026 and $48,311.30 for 2027. The $4,182.60 difference is an assessment-history comparison, not a prediction of the billed tax. Unknown special-assessment liability, abatement expiration, buyer eligibility, payment history and actual utility charges remain unknown and are presented as follow-up questions.
- The municipal executor exposes model-selectable jurisdiction, assessor, tax history, exemptions/abatements, special assessments, permits, recurring charges and ownership-cost calculation tools. Tests confirm the model may choose a subset and any order; no fixed checklist is required. All tool outputs are grounded Evidence objects and calculations require collected evidence IDs.
- Spatial stage is integrated with a minimal room-level Three.js scene. A qualified kitchen layout observation cites floor-plan/photo inputs, can trigger permit lookup, and links the resulting finding back to the kitchen. Validation rejects unsupported structural/code/illegal-work diagnoses, unknown rooms, missing visual sources, missing permit linkage and synthetic spatial findings without an explicit label.
- Verification: 25 tests pass, TypeScript passes, production build passes, and `npm.cmd run demo:municipal -- --live` succeeds. The scripted demo uses a clearly labeled synthetic spatial fixture because no actual listing photos or measured floor plan are asserted for this public-record demonstration. The original P0 architecture and live Astra route remain unchanged.

## Live P0 verified checkpoint - 2026-09-10

- Re-ran all four behavioral evaluations through the live GPT-6 Astra Responses API with the configured `gpt-6-astra` model. All four passed: `documented-roof` (0 findings), `missing-permit` (1 finding), `conflicting-documents` (1 finding), and `no-concerns` (0 findings).
- The live audit confirms Astra autonomously selected relevant evidence sources and stopped when no material concern existed. The successful runs exercised the live tool-selection and grounded-finding path; no fixed roof/permit checklist was imposed.
- This replaces the earlier credit-exhaustion status for the gate. The verified P0 checkpoint is committed before the municipal/spatial work continues.
