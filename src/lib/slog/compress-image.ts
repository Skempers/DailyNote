const MAX_EDGE = 1280;
const THUMB_EDGE = 180;
const MAX_CHARS = 420_000;
const THUMB_CHARS = 28_000;
const MAX_PER_DAY = 999;
const MAX_FILE_BYTES = 100 * 1024 * 1024;

export const IMAGE_LIMITS = { maxPerDay: MAX_PER_DAY, maxChars: MAX_CHARS, maxFileBytes: MAX_FILE_BYTES };

export type CompressedImage = {
  dataUrl: string;
  thumbUrl: string;
};

function drawToUrl(
  bitmap: ImageBitmap,
  maxEdge: number,
  startQuality: number,
  maxChars: number,
): string {
  let w = bitmap.width;
  let h = bitmap.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法处理这张图片");
  ctx.fillStyle = "#f8f4ec";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);

  let quality = startQuality;
  let url = canvas.toDataURL("image/jpeg", quality);
  while (url.length > maxChars && quality > 0.32) {
    quality = Math.max(0.32, quality - 0.1);
    url = canvas.toDataURL("image/jpeg", quality);
  }
  return url;
}

async function decodeBitmap(file: File): Promise<ImageBitmap> {
  let bmp: ImageBitmap | null = null;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("这张图打不开，试试 JPG、PNG 或 WebP"));
        el.src = url;
      });
      bmp = await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const maxDim = Math.max(bmp.width, bmp.height);
  if (maxDim > 2560) {
    const scale = 2560 / maxDim;
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bmp, 0, 0, w, h);
      bmp.close();
      bmp = await createImageBitmap(canvas);
    }
  }
  return bmp;
}

export async function compressImageFile(file: File): Promise<CompressedImage> {
  const looksImage =
    file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)$/i.test(file.name);
  if (!looksImage) throw new Error("请选择图片文件");
  if (file.size > MAX_FILE_BYTES) throw new Error("图片超过 100MB，换一张小一点的");

  const bitmap = await decodeBitmap(file);
  try {
    let edge = MAX_EDGE;
    let quality = 0.82;
    let dataUrl = "";
    for (let i = 0; i < 12; i++) {
      try {
        dataUrl = drawToUrl(bitmap, edge, quality, MAX_CHARS);
      } catch {
        dataUrl = "";
      }
      if (dataUrl && dataUrl.length <= MAX_CHARS) break;
      if (quality > 0.4) {
        quality = Math.max(0.4, quality - 0.14);
        continue;
      }
      edge = Math.max(280, Math.round(edge * 0.72));
      quality = 0.7;
      if (edge <= 280 && dataUrl) break;
    }
    if (!dataUrl) throw new Error("这张图处理失败，换一张再试");
    const thumbUrl = drawToUrl(bitmap, THUMB_EDGE, 0.58, THUMB_CHARS);
    return { dataUrl, thumbUrl };
  } finally {
    bitmap.close();
  }
}

export async function compressAvatarFile(file: File): Promise<string> {
  const looksImage =
    file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|avif|bmp)$/i.test(file.name);
  if (!looksImage) throw new Error("请选择图片文件");
  if (file.size > MAX_FILE_BYTES) throw new Error("图片超过 100MB");
  const bitmap = await decodeBitmap(file);
  try {
    let edge = 320;
    let url = drawToUrl(bitmap, edge, 0.82, 80_000);
    while (url.length > 80_000 && edge > 96) {
      edge = Math.max(96, Math.round(edge * 0.75));
      url = drawToUrl(bitmap, edge, 0.68, 80_000);
    }
    return url;
  } finally {
    bitmap.close();
  }
}

export function imageThumb(img: { dataUrl: string; thumbUrl?: string }) {
  return img.thumbUrl || img.dataUrl;
}

export function isFullImage(img: { dataUrl: string; thumbUrl?: string }) {
  return Boolean(img.dataUrl) && img.dataUrl.length > 32_000;
}

export function imageFull(img: { dataUrl: string; thumbUrl?: string }) {
  return isFullImage(img) ? img.dataUrl : "";
}
