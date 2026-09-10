import type { Evidence } from './evidence';

export const samples = [
  { id: 'documented-roof', address: '123 Main Street', label: 'Documented roof' },
  { id: 'missing-permit', address: '456 Oak Avenue', label: 'Incomplete roof records' },
  { id: 'conflicting-documents', address: '789 Cedar Lane', label: 'Conflicting water disclosures' },
  { id: 'no-concerns', address: '101 Maple Court', label: 'No material issue' },
] as const;
export type SampleId = typeof samples[number]['id'];
export type Source = 'listing' | 'permits' | 'disclosure' | 'inspection';
export const sources: Source[] = ['listing', 'permits', 'disclosure', 'inspection'];
const fixtures: Record<SampleId, Record<Source, string>> = {
  'documented-roof': {
    listing: 'The listing states: New roof installed in 2025.',
    permits: 'Sample municipal record R-2025-14 matches this property: roof replacement, completed and final inspection approved in 2025.',
    disclosure: 'The seller reports a roof replacement in 2025 and provides permit R-2025-14.',
    inspection: 'The inspector observed a recently installed roof with no material roof defects identified during the accessible visual inspection.',
  },
  'missing-permit': {
    listing: 'The listing states: New roof installed in 2025.',
    permits: 'No matching permit was found for roof work in the sample municipal dataset searched for 2024-2026. The dataset may be incomplete and does not establish whether a permit was required or obtained.',
    disclosure: 'The seller reports that the roof was replaced in 2025. No roof invoices or permit documents were included in the supplied disclosure packet.',
    inspection: 'The inspector observed newer roof coverings. The inspection does not establish the installation date, contractor, or permit status.',
  },
  'conflicting-documents': {
    listing: 'The listing describes a finished basement and a dry, comfortable lower level.',
    permits: 'The sample record search contains a 2019 basement finishing permit with final approval. It contains no information about current moisture conditions.',
    disclosure: 'The seller disclosure dated August 20, 2026 states: No known basement water intrusion.',
    inspection: 'The inspection dated September 1, 2026 reports: Active moisture and water staining observed at the basement east wall. The cause and repair scope were not determined.',
  },
  'no-concerns': {
    listing: 'The listing describes a three-bedroom home with an unfinished basement. No recent renovation claims are made.',
    permits: 'The sample record contains the original occupancy approval and no open permit items.',
    disclosure: 'The seller reports no known material defects in the supplied disclosure.',
    inspection: 'The accessible visual inspection identifies routine maintenance only and no material defects. Concealed conditions were not evaluated.',
  },
};

export function resolveSample(property: string): SampleId | undefined {
  return samples.find(s => [s.id, s.address].some(v => v.toLowerCase() === property.trim().toLowerCase()))?.id;
}

// Swap this adapter for real providers without changing the agent's investigation order.
export function readSampleEvidence(sample: SampleId, source: Source): Evidence {
  return { id: `${sample}:${source}`, sourceType: source, sourceName: `Synthetic ${source} — ${samples.find(s => s.id === sample)!.address}`,
    content: fixtures[sample][source], timestamp: new Date().toISOString(), synthetic: true };
}
