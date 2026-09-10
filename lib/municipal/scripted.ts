// Explicit test/demo transport, never called Astra and never used as a live-model fallback.
// The executor has no checklist: this scripted scenario chooses a sequence to exercise its contract.
import type { ModelTurn } from '../investigation';
import type { MunicipalEvidence } from './data';
import type { MunicipalFinding } from './investigation';
export function createScriptedMunicipalTurn(spatial: boolean, injectBadCitation = false): ModelTurn {
  let step = 0, submittedBad = false;
  const plan: [string, unknown][] = [
    ['identify_jurisdiction', { address: '2020 Delancey Place, Philadelphia, PA' }],
    ['get_assessor_record', { parcel: '081035500' }], ['get_tax_history', { parcel: '081035500' }],
    ['get_exemptions', { parcel: '081035500' }], ['get_special_assessments', { parcel: '081035500' }], ['get_recurring_charges', { parcel: '081035500' }],
    ['calculate_ownership_cost', { taxEvidenceId: 'phila:assessment:2026', rateEvidenceId: 'phila:tax-rate', includeStormwaterScenario: false }],
    ['calculate_ownership_cost', { taxEvidenceId: 'phila:assessment:2027', rateEvidenceId: 'phila:tax-rate', includeStormwaterScenario: true }],
  ];
  if (spatial) plan.push(['record_spatial_observation', { area: 'kitchen', observation: 'The supplied synthetic floor-plan and photo descriptions suggest a possible kitchen layout difference.', evidenceIds: ['demo:floor-plan', 'demo:photo', 'demo:claim'], confidence: 'medium', investigationSuggestion: 'Check whether renovation and permit documentation addresses the kitchen layout.' }]);
  plan.push(['get_permit_history', { parcel: '081035500' }]);
  return async input => {
    const evidence = new Map<string, MunicipalEvidence>();
    for (const item of input) {
      if (item.type === 'function_call_output' && typeof item.output === 'string') {
        const value = JSON.parse(item.output); for (const e of value.evidence ?? []) evidence.set(e.id, e);
      }
    }
    const initial = input[0];
    if ('content' in initial && typeof initial.content === 'string') for (const e of JSON.parse(initial.content).initialEvidence) evidence.set(e.id, e);
    let name: string, args: unknown;
    if (step < plan.length) [name, args] = plan[step];
    else {
      const make = (id: string, title: string, inference: string, action: string, ids: string[], areaIds: string[] = []): MunicipalFinding => {
        const all = new Set(ids);
        for (const key of all) evidence.get(key)?.derivedFrom?.forEach(parent => all.add(parent));
        const quotes = [...all].map(key => {
          const e = evidence.get(key); if (!e) throw new Error('SCRIPTED_REQUIRED_SOURCE_UNAVAILABLE');
          // A short complete leading sentence fits the shared extractive-fact contract.
          const quote = e.content.match(e.sourceType === 'calculation' ? /^.*?[.!?](?=\s|$).*?[.!?](?=\s|$)/ : /^.*?[.!?](?=\s|$)/)?.[0] || e.content;
          return { evidenceId: key, quote };
        });
        return { id, title, severity: 'investigate', fact: quotes.map(q => `[${q.evidenceId}] ${q.quote}`).join('\n'), inference, evidenceIds: [...all], supportingQuotes: quotes, confidence: 'medium', recommendedAction: action, areaIds };
      };
      const differentTax = evidence.get('phila:cost:2026:tax-only')?.data?.annualTaxEstimate !== evidence.get('phila:cost:2027:stormwater')?.data?.annualTaxEstimate;
      const findings = [
        make('tax-years', 'Budget against the correct tax year', `${differentTax ? 'The assessment-based tax estimates differ between 2026 and 2027.' : 'The assessment-based tax estimates are equal for the two supplied years.'} The current roll alone does not establish a billed amount. Estimates and hypothetical exemption sensitivity do not establish the buyer’s bill.`, 'Request the 2026 bill and 2027 notice of value, and confirm buyer exemption eligibility with Revenue before budgeting.', ['phila:cost:2026:tax-only', 'phila:cost:2027:stormwater']),
        make('extra-charges', 'Confirm municipal charges beyond real-estate tax', 'The reviewed guidance identifies separate charge categories, but does not establish this parcel’s special-assessment liability or actual utility bill. An unknown charge must not be budgeted as zero.', 'Ask for the CCD statement or written non-applicability confirmation and recent water bills showing meter, service and stormwater charges.', ['phila:special-assessments', 'phila:recurring']),
      ];
      if (spatial) findings.push(make('kitchen-documents', 'Synthetic scenario: reconcile kitchen layout documentation', 'In this synthetic scenario, the illustrative spatial comparison warrants a documentation question. The public permit search does not establish whether the hypothetical kitchen change occurred, required a permit, or is covered by other records. No physical defect is established at the real property.', 'For an actual listing with this discrepancy, request dated plans, renovation invoices and relevant permit scope, and ask the seller to reconcile the images.', ['spatial:kitchen', 'phila:permit-search', ...[...evidence.values()].filter(e => e.sourceType === 'permit').map(e => e.id)], ['kitchen']));
      if (injectBadCitation && !submittedBad) { findings[0].evidenceIds.push('invented'); submittedBad = true; }
      name = 'submit_findings'; args = { findings };
    }
    step++;
    return { output: [{ type: 'function_call', call_id: `script-${step}`, name, arguments: JSON.stringify(args) }] };
  };
}
