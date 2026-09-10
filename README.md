# Under the Roof

**The listing sells. We investigate.**

Under the Roof helps homebuyers turn a polished listing into questions worth asking before an offer. It connects public property records, visual evidence, and assessment-based costs in one investigation—with sources a buyer can inspect.

Built for the GPT-6 Astra hackathon, this is a working Next.js application with live model calls, public municipal APIs, streamed tool activity, and an interactive Three.js spatial model.

## From images to an investigation

A floor plan can suggest a question that a public record alone would never raise. Under the Roof makes that connection visible:

```text
Property → Astra selects evidence tools
                     ↓
Floor plan + image → Astra spatial graph → Interactive 3D model
                     ↓
           Qualified spatial observation
                     ↓
          Model-selected permit follow-up
                     ↓
          Grounded finding + buyer action
```

GPT-6 Astra analyzes the supplied images and returns a structured PropertySpatialGraph: rooms, approximate bounds, adjacency, connections, and qualified observations. Three.js renders those returned bounds. The geometry is not a prerecorded reconstruction in the live path.

When an observation warrants further investigation, Astra can choose a municipal tool, inspect the returned permit scope, and connect a buyer finding to the relevant room. Tool selection remains model-directed; the diagram illustrates a supported path, not a forced sequence.

The current demo investigates **2020 Delancey Place, Philadelphia, PA — OPA parcel 081035500**. Public records are retrieved live. The floor plan, kitchen image, and hypothetical listing claim are **synthetic demo inputs**, analyzed live by Astra; they are not representations of this property's actual interior or a current sale listing.

## Watch the demo

1. Open **/municipal** and keep **Live Philadelphia public API**, **Live GPT-6 Astra**, and **Multimodal spatial analysis** selected.
2. Click **Start investigation**. The activity trace shows real tool events as they arrive.
3. When Astra's graph arrives, the 3D model appears while the investigation continues.
4. Select **Kitchen** to inspect its spatial observation, linked permit evidence, and buyer action. Expand **Technical evidence** for the originals.
5. Review the ownership-cost and renovation findings. **View evidence** exposes full facts, inferences, qualifications, and citations.

The visual centerpiece is the connection between an observation and a follow-up action—not simply a generated property report. The model can return a different sequence on each run, and the interface only attributes permit follow-up to spatial evidence when the event order supports it.

### A measured live run

A September 10, 2026 request to the same **POST /api/municipal** endpoint used by the browser completed with GPT-6 Astra, live Philadelphia records, and both PNG inputs:

| Milestone | Elapsed time |
| --- | ---: |
| First streamed tool event | 5.148 s |
| Astra spatial graph received | 36.853 s |
| First grounded findings received | 63.350 s |
| Stream completed | 63.350 s |

The run returned **HTTP 200, 15 evidence objects, 2 findings, and 0 grounding corrections**. Permit history was selected after graph creation. These are observed API timings from one live run, not latency guarantees or browser paint measurements. Allow roughly a minute or longer for a live demonstration.

## How it works

| Component | Responsibility |
| --- | --- |
| GPT-6 Astra / Responses API | Multimodal interpretation, tool selection, evidence reconciliation, and structured finding submission |
| Philadelphia adapters | Bounded public API queries for parcel records, assessment history, and permits |
| Evidence layer | Source identity, provenance, tax year, scope, limitations, and derivation links |
| Deterministic calculator | Assessment-based tax estimates and explicitly qualified cost scenarios from collected evidence |
| Grounding loop | Validates submissions; returns structured errors for Astra to correct |
| Next.js + Three.js | Streams tool activity, renders graph-derived geometry, and links rooms to evidence |

Astra submits findings through a strict function schema. Validation checks source IDs, exact supporting quotations, fact/inference separation, calculation dependencies, and spatial-to-permit links. Rejected submissions return to the model as tool results for correction. Private reasoning is not displayed in the browser.

The municipal loop is bounded by 20 model turns, 30 tool calls, a three-rejection limit, and a four-minute route deadline. Requests use isolated in-memory evidence. Philadelphia queries validate parcel identity and data shape, cap permit results, disclose truncation, and cache only within an investigation.

Live failures remain errors. They never silently switch to scripted transport, dated snapshots, or synthetic records.

## Building with Astra and Codex

We worked with GPT-6 Astra through Codex as a development collaborator: inspecting the repository, implementing the Responses tool loop and municipal adapters, connecting multimodal outputs to Three.js, and refining the demo through concrete runs and feedback.

That collaboration also shaped the engineering details. Development uncovered that the current assessment roll could represent a later tax year, and that taxable fields already reflect exemptions. The calculator therefore uses year-specific collected evidence and avoids deducting exemptions twice. Live integration exposed unsupported SVG image inputs and a strict-schema optional-field mismatch; the working path uses PNG input_image payloads and a required-but-nullable investigation suggestion.

We kept deterministic regression tests separate from live behavioral evaluations. The original four-scenario live Astra evaluation passed 4/4 at its verified checkpoint; subsequent municipal runs exercised public records, multimodal graph extraction, and permit follow-up through the application endpoint. The [development log](DEVELOPMENT_LOG.md) records the iterations, failures, and verification checkpoints.

## Run locally

Requires Node.js 20.9+ and an OpenAI API key with access to **gpt-6-astra**. Live runs incur API usage. Start the server in an environment that can reach the OpenAI API and Philadelphia's public CARTO API.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
```

Set these values in the ignored **.env.local** file:

```dotenv
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-6-astra
SPATIAL_DEMO_ENABLED=1
MUNICIPAL_ASTRA_ENABLED=1
```

For the production demo:

```powershell
npm.cmd run build
npm.cmd run start
```

Open [localhost:3000](http://localhost:3000) for the introduction or [localhost:3000/municipal](http://localhost:3000/municipal) directly. For development, use **npm.cmd run dev** instead. On macOS/Linux, use **npm** in place of **npm.cmd**. Restart the server after changing environment variables.

The browser sends:

```json
{"dataMode":"live","model":"gpt-6-astra","spatial":true,"stream":true}
```

The parcel is fixed by the server-side demo adapter; arbitrary addresses and listing URLs are outside the current municipal scope. The response is newline-delimited JSON containing event messages followed by a result or error. An HTTP 200 stream alone is not proof of a successful investigation: confirm a final result and normal stream completion.

## Verification

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run eval:live
```

Offline tests cover grounding, correction round trips, municipal records and calculations, spatial validation, and graph-to-scene linkage. They use controlled transports and do not establish live model reliability. **eval:live** calls Astra for the original four synthetic behavioral scenarios; it does not replace the live municipal endpoint check.

Typecheck and production build passed after the final presentation polish. The most recent sandboxed test invocation stopped before loading tests with a Windows Node/tsx user-info error; earlier documented regression checkpoints passed. That environment failure is not reported as a passing suite.

A fast generic investigation error can indicate blocked outbound networking in the server process. In development, inspect server logs and verify the server's network permissions, configured model access, and image availability. Changing the browser's permissions alone does not restore the server's API access.

## Scope and qualifications

- **One jurisdiction and parcel.** Philadelphia is the supported municipal demonstration.
- **Approximate spatial model.** Synthetic imagery does not establish actual renovations, dimensions, structural safety, or code compliance.
- **Qualified public-record findings.** A permit verifies only its stated scope. Incomplete search results do not prove that work was unpermitted.
- **Estimates, not bills.** Tax calculations are assessment-based; they do not establish billed tax, buyer exemption eligibility, or total ownership cost. Unknown municipal charges remain unknown.
- **Grounding has limits.** Validation enforces the evidence contract; it does not prove source truth, completeness, or semantic entailment.
- **Hackathon prototype.** No authentication or usage controls are included. Credentials and local run artifacts are ignored by Git; use a controlled environment for the API-billed demo.

## Repository guide

- [Municipal demo and source notes](MUNICIPAL_DEMO.md)
- [Development history](DEVELOPMENT_LOG.md)
- [Municipal investigation loop](lib/municipal/investigation.ts)
- [Municipal tools and calculator](lib/municipal/tools.ts)
- [Spatial graph contract](lib/municipal/spatial.ts)
- [Streaming API route](app/api/municipal/route.ts)
- [Regression tests](tests)
