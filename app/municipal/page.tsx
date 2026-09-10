import MunicipalDemo from './demo';
export const dynamic = 'force-dynamic';
export default function Page() { return <MunicipalDemo spatialEnabled={process.env.SPATIAL_DEMO_ENABLED === '1'} />; }
