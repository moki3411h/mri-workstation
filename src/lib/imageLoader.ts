// MRI Image Loader — loads real images as defaults and handles import
// Auto-loads public/mri_*.* into the viewport store on app start

export const DEFAULT_IMAGES = {
  axial:    '/mri_axial.png',
  coronal:  '/mri_coronal.jpg',
  sagittal: '/mri_sagittal.jpg',
} as const;

export type ImagePlane = 'axial' | 'coronal' | 'sagittal';

export async function preloadDefaultImages(): Promise<Record<ImagePlane, string>> {
  const results: Partial<Record<ImagePlane, string>> = {};

  await Promise.all(
    (Object.entries(DEFAULT_IMAGES) as [ImagePlane, string][]).map(async ([plane, url]) => {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) {
          results[plane] = url;
        }
      } catch {
        // Image not found, skip
      }
    })
  );

  return results as Record<ImagePlane, string>;
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function grayscaleDataURL(dataURL: string): Promise<string> {
  return new Promise(resolve => {
    if (!dataURL.startsWith('data:image/')) {
      resolve(dataURL);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < id.data.length; i += 4) {
        const g = id.data[i]! * 0.299 + id.data[i+1]! * 0.587 + id.data[i+2]! * 0.114;
        id.data[i] = id.data[i+1] = id.data[i+2] = g;
      }
      ctx.putImageData(id, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataURL;
  });
}

export const ACCEPTED_TYPES = ['image/jpeg','image/png','image/bmp','image/tiff','image/webp','video/mp4','application/pdf'];
export const ACCEPTED_EXT   = '.jpg,.jpeg,.png,.bmp,.tif,.tiff,.webp,.dcm,.mp4,.pdf';
