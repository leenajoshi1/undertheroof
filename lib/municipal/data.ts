import { z } from 'zod';
import snapshot from './philadelphia.snapshot.json';
import type { Evidence } from '../evidence';

export const demo = { address: '2020 Delancey Place, Philadelphia, PA', location: '2020 DELANCEY PL', parcel: '081035500', municipality: 'Philadelphia', state: 'PA' } as const;
export type DataMode = 'live' | 'snapshot' | 'synthetic';
export type MunicipalEvidence = Evidence & {
  provenance: 'live_public' | 'public_snapshot' | 'synthetic' | 'reference_snapshot' | 'calculation' | 'unavailable';
  scope: 'parcel' | 'jurisdiction' | 'scenario';
  parcel?: string; year?: number; retrievedAt?: string; limitations: string[];
  data?: Record<string, unknown>; derivedFrom?: string[]; areaIds?: string[];
};
export const queries = {
  assessor: `SELECT location,parcel_number,category_code_description,market_value,taxable_land,taxable_building,exempt_land,exempt_building,homestead_exemption,assessment_date,market_value_date FROM opa_properties_public WHERE parcel_number='081035500' LIMIT 2`,
  history: `SELECT parcel_number,year,market_value,taxable_land,taxable_building,exempt_land,exempt_building FROM assessments WHERE parcel_number='081035500' AND year >= '2023' AND year <= '2027' ORDER BY year DESC LIMIT 10`,
  permits: `SELECT permitnumber,opa_account_num,address,permittype,approvedscopeofwork,status,permitissuedate,permitcompleteddate FROM permits WHERE opa_account_num='081035500' ORDER BY permitissuedate DESC NULLS LAST,permitnumber DESC LIMIT 101`,
};
export type Dataset = keyof typeof queries;
export const publicUrl = (dataset: Dataset) => 'https://phl.carto.com/api/v2/sql?q=' + encodeURIComponent(queries[dataset]);
const money = z.number().finite().nonnegative().nullable();
const assessmentFields = { parcel_number: z.literal(demo.parcel), market_value: money, taxable_land: money, taxable_building: money, exempt_land: money, exempt_building: money };
const schemas = {
  assessor: z.object({ ...assessmentFields, location: z.literal(demo.location), category_code_description: z.string(), homestead_exemption: money, assessment_date: z.string().nullable(), market_value_date: z.string().nullable() }),
  history: z.object({ ...assessmentFields, year: z.string().regex(/^202[3-7]$/) }),
  permits: z.object({ permitnumber: z.string(), opa_account_num: z.literal(demo.parcel), address: z.literal(demo.location), permittype: z.string().nullable(), approvedscopeofwork: z.string().nullable(), status: z.string().nullable(), permitissuedate: z.string().nullable(), permitcompleteddate: z.string().nullable() }),
};
export type PublicRows = Record<string, unknown>[];
export type PublicFetcher = (url: string, init: RequestInit) => Promise<Response>;
export async function loadDataset(dataset: Dataset, mode: DataMode, fetcher: PublicFetcher = fetch, signal?: AbortSignal) {
  let rows: unknown, retrievedAt: string;
  if (mode === 'live') {
    const response = await fetcher(publicUrl(dataset), { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000), redirect: 'error', cache: 'no-store' });
    if (!response.ok) throw new Error(`PUBLIC_DATA_HTTP_${response.status}`);
    const body = await response.json();
    if (body.error) throw new Error('PUBLIC_DATA_ERROR');
    rows = body.rows; retrievedAt = new Date().toISOString();
  } else {
    rows = snapshot.datasets[dataset].rows; retrievedAt = snapshot.retrievedAt;
  }
  const parsed = z.array(schemas[dataset]).parse(rows) as PublicRows;
  if (dataset === 'assessor' && parsed.length !== 1) throw new Error('PARCEL_MATCH_NOT_UNIQUE');
  if (dataset === 'history' && new Set(parsed.map(r => r.year)).size !== parsed.length) throw new Error('DUPLICATE_TAX_YEAR');
  if (mode === 'synthetic') {
    // Explicit scenario overlay; never a silent network fallback.
    for (const row of parsed) {
      if ('market_value' in row) { row.market_value = 500000; row.taxable_land = 100000; row.taxable_building = 300000; row.exempt_land = 0; row.exempt_building = 100000; }
    }
  }
  return { rows: parsed, retrievedAt, provenance: mode === 'live' ? 'live_public' as const : mode === 'snapshot' ? 'public_snapshot' as const : 'synthetic' as const };
}

export function record(id: string, content: string, fields: Partial<MunicipalEvidence> = {}): MunicipalEvidence {
  return { id, sourceType: 'municipal', sourceName: 'Under the Roof adapter', content, timestamp: new Date().toISOString(), synthetic: false,
    provenance: 'unavailable', scope: 'parcel', parcel: demo.parcel, limitations: [], ...fields };
}
