import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const spatialAssetPath = join(process.cwd(), 'lib', 'municipal', 'demo-floor-plan.png');
export const spatialPhotoPath = join(process.cwd(), 'lib', 'municipal', 'demo-kitchen-view.png');

async function inputImage(path: string) {
  const png = await readFile(path);
  console.info('[municipal] spatial image prepared', { path, bytes: png.byteLength, mime: 'image/png' });
  return { type: 'input_image' as const, image_url: `data:image/png;base64,${png.toString('base64')}`, detail: 'high' as const };
}
export async function spatialImageInput() {
  return [await inputImage(spatialAssetPath), await inputImage(spatialPhotoPath)];
}
