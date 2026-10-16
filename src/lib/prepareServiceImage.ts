export const MAX_SERVICE_IMAGE_BYTES = 800000;

async function decode(file: File): Promise<{source: CanvasImageSource; width: number; height: number; close: () => void}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {source:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close()};
    } catch { /* Older Safari may decode the same file through an img element. */ }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve,reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Não foi possível abrir a foto. Tente uma imagem JPG ou PNG.'));
      image.src = url;
    });
    return {source:image,width:image.naturalWidth,height:image.naturalHeight,close:()=>URL.revokeObjectURL(url)};
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}

export async function prepareServiceImage(file: File): Promise<Blob> {
  const decoded = await decode(file);
  const canvas = document.createElement('canvas');
  try {
    if (!decoded.width || !decoded.height) throw new Error('A foto está vazia ou inválida.');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a foto neste navegador.');
    const encode = (type:string,quality:number) => new Promise<Blob>((resolve,reject) =>
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a foto.')),type,quality));
    let format = 'image/webp';
    // Bound both output size and retries; redraw from the original at each resolution.
    for (const edge of [1200,960,768,600,480]) {
      const ratio = Math.min(1,edge / Math.max(decoded.width,decoded.height));
      canvas.width = Math.max(1,Math.round(decoded.width * ratio));
      canvas.height = Math.max(1,Math.round(decoded.height * ratio));
      const draw = () => {
        context.clearRect(0,0,canvas.width,canvas.height);
        if (format === 'image/jpeg') { context.fillStyle='#fff'; context.fillRect(0,0,canvas.width,canvas.height); }
        context.drawImage(decoded.source,0,0,canvas.width,canvas.height);
      };
      draw();
      for (const quality of [0.8,0.65,0.5]) {
        let blob = await encode(format,quality);
        // Unsupported canvas formats silently fall back to PNG, ignoring quality.
        if (format === 'image/webp' && blob.type !== 'image/webp') {
          format = 'image/jpeg';
          draw();
          blob = await encode(format,quality);
        }
        if (blob.type !== format) throw new Error('Este navegador não conseguiu converter a foto. Tente enviar em JPG.');
        if (blob.size > 0 && blob.size <= MAX_SERVICE_IMAGE_BYTES) return blob;
      }
    }
    throw new Error('Não foi possível reduzir esta foto. Tente outra imagem JPG ou PNG.');
  } finally {
    decoded.close();
    canvas.width=1;canvas.height=1;
  }
}
