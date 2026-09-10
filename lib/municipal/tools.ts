import { z } from 'zod';
import type { Tool } from 'openai/resources/responses/responses';
import { demo, loadDataset, publicUrl, record, type DataMode, type MunicipalEvidence, type PublicFetcher } from './data';

export const eventLabels = {
  identify_jurisdiction: 'Identifying local jurisdiction...',
  get_assessor_record: 'Checking assessor records...',
  get_tax_history: 'Reviewing property tax history...',
  get_exemptions: 'Checking exemptions and abatements...',
  get_special_assessments: 'Checking special-assessment coverage...',
  get_permit_history: 'Searching permit history...',
  get_recurring_charges: 'Checking municipal recurring charges...',
  calculate_ownership_cost: 'Calculating potential ownership costs...',
} as const;
const parcelArgs = z.object({ parcel: z.literal(demo.parcel) }).strict();
export const argumentSchemas = {
  identify_jurisdiction: z.object({ address: z.string().min(1).max(150) }).strict(),
  get_assessor_record: parcelArgs, get_tax_history: parcelArgs, get_exemptions: parcelArgs,
  get_special_assessments: parcelArgs, get_permit_history: parcelArgs, get_recurring_charges: parcelArgs,
  calculate_ownership_cost: z.object({ taxEvidenceId: z.string(), rateEvidenceId: z.string(), includeStormwaterScenario: z.boolean() }).strict(),
};
export const municipalTools: Tool[] = Object.entries(argumentSchemas).map(([name, schema]) => ({ type: 'function', name, strict: true, parameters: z.toJSONSchema(schema),
  description: name === 'calculate_ownership_cost' ? 'Calculate a tax baseline and no-exemption sensitivity from collected evidence IDs. Optional stormwater scenario is not a verified bill. Never input invented monetary amounts.' : `${eventLabels[name as keyof typeof eventLabels]} One Philadelphia parcel only. Returns Evidence with provenance and explicit coverage limitations. Choose only when relevant.` }));
export const rateUrl = 'https://www.phila.gov/2026-07-20-learn-how-to-lower-your-property-tax-bill-ahead-of-the-2027-valuations/';
export const waterUrl = 'https://water.phila.gov/drops/new-rate-information-effective-september-2026/';
export const ccdUrl = 'https://centercityphila.org/ccd-assessments/';
const reference = { provenance: 'reference_snapshot' as const, scope: 'jurisdiction' as const, retrievedAt: '2026-09-10T00:00:00Z', limitations: ['Manually reviewed public guidance, not fetched afresh during this request; verify before relying on it.'] };
const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calculateCost(tax: MunicipalEvidence, rate: MunicipalEvidence, water?: MunicipalEvidence): MunicipalEvidence {
  if (tax.sourceType !== 'assessment_history' || rate.id !== 'phila:tax-rate' || tax.parcel !== demo.parcel) throw new Error('INVALID_COST_EVIDENCE');
  if (!tax.year || ![2026, 2027].includes(tax.year) || rate.data?.rate !== 0.013998) throw new Error('UNSUPPORTED_RATE_YEAR');
  const land = tax.data?.taxable_land, building = tax.data?.taxable_building, market = tax.data?.market_value;
  if (![land, building, market].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0)) throw new Error('MISSING_COST_INPUT');
  const taxable = (land as number) + (building as number);
  if (taxable > (market as number)) throw new Error('INCONSISTENT_ASSESSMENT');
  if (water && (water.id !== 'phila:recurring' || water.data?.stormwaterMonthly !== 23.05)) throw new Error('INVALID_RECURRING_EVIDENCE');
  const annualTax = round(taxable * 0.013998), withoutExemptions = round((market as number) * 0.013998);
  const stormwater = water ? round(23.05 * 12) : 0;
  const data = { year: tax.year, taxableValue: taxable, rate: 0.013998, annualTaxEstimate: annualTax, monthlyTaxEstimate: round(annualTax / 12), noExemptionsAnnualScenario: withoutExemptions, exemptionSensitivityAnnual: round(withoutExemptions - annualTax), stormwaterAnnualScenario: water ? stormwater : null, modeledAnnualSubtotal: round(annualTax + stormwater), modeledMonthlySubtotal: round((annualTax + stormwater) / 12) };
  return record(`phila:cost:${tax.year}:${water ? 'stormwater' : 'tax-only'}`, `For ${tax.year}, the recorded taxable land plus building value is ${usd(taxable)}. At the reviewed 1.3998% rate, the annual tax estimate is ${usd(annualTax)} (${usd(data.monthlyTaxEstimate)} per month). A hypothetical removal of all recorded exemptions, holding assessed value and rate constant, gives ${usd(withoutExemptions)} annually, a difference of ${usd(data.exemptionSensitivityAnnual)}. ${water ? `Adding an illustrative residential stormwater charge of $23.05 monthly gives a modeled subtotal of ${usd(data.modeledAnnualSubtotal)} annually.` : 'No utility or special-assessment amounts are included.'} This is an assessment-based estimate, not a tax bill, payoff, transfer forecast, or complete ownership cost.`, {
    sourceType: 'calculation', sourceName: 'Deterministic municipal cost calculator', provenance: 'calculation', scope: 'scenario', year: tax.year, data,
    synthetic: tax.synthetic, derivedFrom: [tax.id, rate.id, ...(water ? [water.id] : [])],
    limitations: ['Exemptions are already reflected in taxable land/building; no additional homestead deduction.', 'No-exemption scenario does not predict that an exemption will end.', 'Excludes mortgage, insurance, maintenance, CCD/special assessments, water/sewer consumption and fixed meter service charges.', 'Stormwater assumption, if selected, uses the reviewed September 2026 rate for a hypothetical full year; it is not the actual 2026 bill.'],
  });
}

export function createMunicipalExecutor(mode: DataMode, evidence: Map<string, MunicipalEvidence>, fetcher: PublicFetcher = fetch, signal?: AbortSignal) {
  const cache = new Map<string, Awaited<ReturnType<typeof loadDataset>>>();
  async function dataset(name: 'assessor' | 'history' | 'permits') {
    if (!cache.has(name)) cache.set(name, await loadDataset(name, mode, fetcher, signal));
    return cache.get(name)!;
  }
  return async (name: string, args: unknown): Promise<MunicipalEvidence[]> => {
    if (!(name in argumentSchemas)) throw new Error('UNKNOWN_TOOL');
    const parsed = argumentSchemas[name as keyof typeof argumentSchemas].parse(args);
    if (name === 'identify_jurisdiction') {
      const address = (parsed as { address: string }).address.trim().toUpperCase().replace(/[.,]/g, '').replace(/\s+/g, ' ');
      if (![demo.address.toUpperCase().replace(/[.,]/g, ''), demo.location, '2020 DELANCEY PLACE PHILADELPHIA PA', '2020 DELANCEY PL PHILADELPHIA PA'].includes(address)) throw new Error('UNSUPPORTED_ADDRESS');
      const d = await dataset('assessor');
      return [record('phila:jurisdiction', `The Philadelphia OPA dataset matches ${demo.location} to parcel ${demo.parcel}. This single-parcel adapter resolves the City and County of Philadelphia, Pennsylvania; assessment authority OPA, tax authority Department of Revenue, and permit authority Department of Licenses and Inspections. It does not resolve special-district membership.`, { sourceName: 'Philadelphia OPA / single-parcel jurisdiction adapter', sourceUrl: publicUrl('assessor'), provenance: d.provenance, synthetic: mode === 'synthetic', retrievedAt: d.retrievedAt })];
    }
    if (name === 'calculate_ownership_cost') {
      const p = parsed as z.infer<typeof argumentSchemas.calculate_ownership_cost>;
      const tax = evidence.get(p.taxEvidenceId), rate = evidence.get(p.rateEvidenceId), water = evidence.get('phila:recurring');
      if (!tax || !rate || (p.includeStormwaterScenario && !water)) throw new Error('COLLECT_COST_EVIDENCE_FIRST');
      return [calculateCost(tax, rate, p.includeStormwaterScenario ? water : undefined)];
    }
    if (name === 'get_assessor_record' || name === 'get_exemptions') {
      const d = await dataset('assessor'); const row = d.rows[0];
      const content = name === 'get_assessor_record'
        ? `OPA public property record: ${JSON.stringify(row)}. This current-roll record is not a tax bill and may represent a future assessment; use year-specific history for tax calculations.`
        : `OPA records homestead_exemption=${row.homestead_exemption}, exempt_land=${row.exempt_land}, exempt_building=${row.exempt_building}. These fields do not establish a separate abatement's type, expiration, buyer eligibility, or transfer treatment. Ask for the exemption/abatement approval and current bill.`;
      const result = [record(name === 'get_exemptions' ? 'phila:exemptions' : 'phila:assessor', content, { sourceType: name, sourceName: 'Philadelphia Office of Property Assessment', sourceUrl: publicUrl('assessor'), provenance: d.provenance, synthetic: mode === 'synthetic', retrievedAt: d.retrievedAt, data: row })];
      if (name === 'get_exemptions') result.push(record('phila:homestead-rule', 'Philadelphia describes a $100,000 reduction in assessed value for eligible owner-occupied primary residences. Buyer eligibility and the treatment of any existing exemption must be confirmed; this guidance does not establish this buyer’s approval.', { ...reference, sourceType: 'tax_policy', sourceName: 'Philadelphia Department of Revenue homestead guidance', sourceUrl: 'https://www.phila.gov/services/payments-assistance-taxes/taxes/property-and-real-estate-taxes/get-real-estate-tax-relief/get-the-homestead-exemption/' }));
      return result;
    }
    if (name === 'get_tax_history') {
      const d = await dataset('history');
      return [...d.rows.map(row => record(`phila:assessment:${row.year}`, `OPA assessment history for tax year ${row.year}: market value ${row.market_value}; taxable land ${row.taxable_land}; taxable building ${row.taxable_building}; exempt land ${row.exempt_land}; exempt building ${row.exempt_building}. Amounts are USD. These are assessment components, not billed tax, payments, arrears, or a tax certificate.`, { sourceType: 'assessment_history', sourceName: 'Philadelphia OPA assessment history', sourceUrl: publicUrl('history'), provenance: d.provenance, synthetic: mode === 'synthetic', retrievedAt: d.retrievedAt, year: Number(row.year), data: row })),
        record('phila:tax-rate', 'Philadelphia Revenue guidance reviewed September 10, 2026 gives a 1.3998% real-estate tax rate and states it remains the same for 2027. Use only for 2026 or 2027 estimates and confirm against the actual bill.', { ...reference, sourceType: 'tax_policy', sourceName: 'Philadelphia Department of Revenue', sourceUrl: rateUrl, data: { rate: 0.013998, supportedYears: [2026, 2027] } })];
    }
    if (name === 'get_permit_history') {
      const d = await dataset('permits'); const rows = d.rows.slice(0, 100);
      return [record('phila:permit-search', `Searched Philadelphia L&I published permits by exact OPA parcel ${demo.parcel}, all available issue dates, returning ${rows.length} records${d.rows.length > 100 ? ' (truncated to the latest 100)' : ''}. ${rows.length ? 'A returned permit establishes only its stated scope and status.' : 'No matching permit was found in this searched dataset.'} The search may omit records; absence does not prove that work lacked a permit or that one was required.`, { sourceType: 'permit_search', sourceName: 'Philadelphia L&I published permit search', sourceUrl: publicUrl('permits'), provenance: d.provenance, synthetic: mode === 'synthetic', retrievedAt: d.retrievedAt, data: { count: rows.length, truncated: d.rows.length > 100 } }),
        ...rows.map(row => record(`phila:permit:${row.permitnumber}`, `L&I permit record: ${JSON.stringify(row)}. This scope does not verify unrelated interior work or current physical condition.`, { sourceType: 'permit', sourceName: 'Philadelphia Department of Licenses and Inspections', sourceUrl: publicUrl('permits'), provenance: d.provenance, synthetic: mode === 'synthetic', retrievedAt: d.retrievedAt, data: row }))];
    }
    if (name === 'get_special_assessments') return [record('phila:special-assessments', 'Center City District publishes a separate annual assessment for taxable properties inside its boundaries; its calculation does not use city homestead or abatement reductions. This adapter has not established this parcel’s district membership, charge, liens, or other special assessments. Unknown is not zero. Request the parcel-specific CCD statement and municipal/title certification.', { ...reference, sourceType: 'special_assessment_coverage', sourceName: 'Center City District assessment guidance / coverage limitation', sourceUrl: ccdUrl, data: { parcelLiability: null, annualAmount: null, membershipVerified: false } })];
    return [record('phila:recurring', 'Philadelphia Water Department’s September 2026 typical residential example lists a $23.05 monthly stormwater charge and a separate $14.79 service charge for a 5/8-inch meter. Water/sewer usage is additional. This parcel’s meter size, accounts, discounts and actual bills have not been verified. The stormwater amount can be used only as an illustrative scenario, not a known property charge.', { ...reference, sourceType: 'recurring_charge_policy', sourceName: 'Philadelphia Water Department rate guidance', sourceUrl: waterUrl, data: { stormwaterMonthly: 23.05, meterServiceMonthlyExample: 14.79, propertyChargeVerified: false } })];
  };
}
