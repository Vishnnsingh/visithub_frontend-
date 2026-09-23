const MAX_BYTES = 5 * 1024 * 1024;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read photo'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Could not compress photo'));
        else resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

function drawImage(image: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not compress photo');
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

export async function compressImage(file: Blob, name = `photo-${Date.now()}.jpg`, maxEdge = 1280): Promise<File> {
  const image = await loadImage(file);
  let width = image.naturalWidth || image.width;
  let height = image.naturalHeight || image.height;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  let quality = 0.82;
  let blob = await canvasToBlob(drawImage(image, width, height), quality);
  while (blob.size > MAX_BYTES && quality > 0.42) {
    quality -= 0.08;
    blob = await canvasToBlob(drawImage(image, width, height), quality);
  }
  while (blob.size > MAX_BYTES && Math.max(width, height) > 640) {
    width = Math.max(1, Math.round(width * 0.85));
    height = Math.max(1, Math.round(height * 0.85));
    blob = await canvasToBlob(drawImage(image, width, height), quality);
  }
  if (blob.size > MAX_BYTES) {
    throw new Error('Photo must be 5 MB or smaller');
  }
  return new File([blob], name, { type: 'image/jpeg' });
}
