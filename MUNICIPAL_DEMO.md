# Municipal demo: one Philadelphia property

Demo: **2020 Delancey Place, Philadelphia, PA**, OPA parcel **081035500**. This is a public-record demonstration, not a representation that the home is listed for sale. No owner identities or mailing addresses are retrieved.

## Run

```powershell
npm.cmd run demo:municipal
npm.cmd run demo:municipal -- --live
npm.cmd run demo:municipal -- --synthetic
```

These use the explicitly scripted model transport. The first uses the dated public snapshot; `--live` calls the public Philadelphia API, not Astra. Reports go to ignored `artifacts/municipal/`.

Run the app as usual and visit `/municipal`. Set `SPATIAL_DEMO_ENABLED=1` and `MUNICIPAL_ASTRA_ENABLED=1` in your local environment and restart to enable the live multimodal graph demo. The app sends the synthetic floor-plan and kitchen reference PNGs to GPT-6 Astra, which returns the approximate Property Spatial Graph used by the room view. The homepage now leads to this live municipal/spatial demo; the original P0 API and behavioral evaluations remain available.

API example:

```json
{"dataMode":"live","model":"gpt-6-astra","spatial":true,"stream":true}
```

POST to `/api/municipal`. Data mode and model transport are explicit. The primary UI defaults to live public records and live GPT-6 Astra, with spatial analysis enabled when the environment flag is set. The route streams NDJSON tool events and graph evidence before the final result. Live verification and measured endpoint timings are summarized in [README.md](README.md).

## Public sources and limitations

Philadelphia publishes assessor/property characteristics and assessment history in its [open-data catalog](https://opendataphilly.org/datasets/philadelphia-properties-and-assessment-history/), including public API links and the City license. Its catalog cautions that published records may lag the values used for a bill. Data is attributed to OPA and L&I and used as published, without completeness guarantees.

The adapter queries only `https://phl.carto.com/api/v2/sql` using three fixed SELECT statements: `opa_properties_public`, `assessments`, and `permits`. There is no user-supplied SQL, arbitrary URL fetching, login, CAPTCHA bypass, or HTML scraping. Queries are bounded, time out, and validate parcel identity, schemas and unique assessment years. Permit results cap at 100 and disclose truncation. Data is cached only inside one investigation.

`lib/municipal/philadelphia.snapshot.json` contains the actual retrieved rows, exact source queries and retrieval timestamp. Run `node scripts/refresh-municipal.mjs` explicitly to refresh it, then run tests and review the diff. Snapshot is dated public evidence, not synthetic evidence and not a live retrieval. Synthetic mode is an explicit test overlay with fictional assessment amounts. Live failure returns an error; it never silently changes modes.

Reviewed policy references are labeled `reference_snapshot`:

- [Philadelphia tax-rate guidance for 2027](https://www.phila.gov/2026-07-20-learn-how-to-lower-your-property-tax-bill-ahead-of-the-2027-valuations/): used only for 2026/2027 estimates at 1.3998%.
- [Homestead guidance](https://www.phila.gov/services/payments-assistance-taxes/taxes/property-and-real-estate-taxes/get-real-estate-tax-relief/get-the-homestead-exemption/): eligibility guidance, not a buyer approval or guarantee of transfer treatment.
- [Center City District assessments](https://centercityphila.org/ccd-assessments/): separate potential charge category. Parcel membership and an actual bill are not established. Published example text and arithmetic are inconsistent, so no parcel charge is inferred from those examples. Ask for the bill/certification.
- [Water rates effective September 2026](https://water.phila.gov/drops/new-rate-information-effective-september-2026/): illustrative residential stormwater at $23.05 monthly; actual accounts, meter size, usage, discounts and applicability remain unverified.

## Buyer-cost demonstration

The snapshot's assessor current roll corresponds in value to the 2027 history row; it must not silently substitute for 2026.

| Year | Recorded taxable land + building | Estimated annual tax | Monthly tax equivalent |
|---|---:|---:|---:|
| 2026 | $3,152,500 | $44,128.70 | $3,677.39 |
| 2027 | $3,451,300 | $48,311.30 | $4,025.94 |

The tax-only difference is $4,182.60 annually. The calculator does not subtract homestead again: taxable fields already incorporate exemptions. Holding assessed value and rate constant, a no-exemption scenario is $1,399.80 more annually for these rows. This does not predict exemption loss. An optional full-year stormwater scenario adds $276.60; it is not the actual calendar-2026 utility bill and does not include water/sewer consumption or meter service charges.

Actual billed tax, payment history, arrears, tax certificates, abatement type/expiration, CCD membership/amount and other special assessments remain unverified. Unknown amounts stay null, never zero. The modeled subtotal excludes mortgage, insurance, repairs and unverified charges; it is not total ownership cost.

## Agent and spatial boundary

The executor exposes jurisdiction, assessor, tax history, exemption, special-assessment, permit, recurring-charge and calculator tools. It does not impose their order. Tests demonstrate a model-selected subset and a different order without requiring a checklist. The scripted demo has an explicit test sequence; it is never represented as autonomous Astra behavior.

Tool results become compatible Evidence objects with provenance, scope, tax year, limitations and optional derivedFrom/areaIds. Existing grounding validation is reused unchanged. The municipal wrapper additionally requires calculation dependencies and spatial-to-permit citations. Activity events use fixed high-level labels, not chain-of-thought, and stream as tool actions occur. The graph event lets the UI render before the final findings arrive.

The spatial demo uses clearly labeled synthetic floor-plan and kitchen-reference PNGs plus a synthetic claim; they are not images of this house. Astra returns a validated approximate graph with room bounds, adjacency, connections and observations. The prototype rejects structural/code diagnoses, exact dimensions without source support, nonexistent sources and unknown rooms. Spatial output is evidence, not ground truth.

The test path is:

`synthetic plan/photo/claim → structured kitchen observation → transport chooses permit tool → public permit scope/search → grounded finding → kitchen area link`

The public record contains permit 959959, a 2019 gutter/roofing scope. That does not establish anything about the hypothetical kitchen layout. Findings using these synthetic spatial inputs must explicitly say `Synthetic scenario:` and retain the underlying source citations.

Three.js generates room boxes from Astra's normalized graph bounds; visual scale and wall height are renderer units, not property measurements. Geometry userData contains adjacency, confidence, finding and evidence IDs. Selecting a room opens its floor-plan/photo evidence, Astra observation, investigation action and linked finding. There is no decorative reconstruction, wall-removal detection, measured-floor-plan claim or structural analysis. Scene construction, graph-to-geometry changes and linkage are tested. The user visually reviewed the live demo and requested the final room-panel and finding-card refinements. Automated browser verification was unavailable in the agent session; API timings are not browser render timings.
