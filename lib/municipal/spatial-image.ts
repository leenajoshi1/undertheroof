import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const spatialAssetPath = join(process.cwd(), 'lib', 'municipal', 'demo-floor-plan.png');

export async function spatialImageInput() {
  const png = await readFile(spatialAssetPath);
  return {
    type: 'input_image' as const,
    image_url: `data:image/png;base64,${png.toString('base64')}`,
    detail: 'high' as const,
  };
}
