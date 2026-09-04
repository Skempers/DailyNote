const MAX_EDGE = 1280;
const THUMB_EDGE = 180;
const MAX_CHARS = 420_000;
const THUMB_CHARS = 28_000;
const MAX_PER_DAY = 999;

export const IMAGE_LIMITS = { maxPerDay: MAX_PER_DAY, maxChars: MAX_CHARS };

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
  while (url.length > maxChars && quality > 0.38) {
    quality -= 0.1;
    url = canvas.toDataURL("image/jpeg", quality);
  }
  return url;
}

export async function compressImageFile(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("图片超过 12MB，请换一张小一点的");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const dataUrl = drawToUrl(bitmap, MAX_EDGE, 0.82, MAX_CHARS);
    if (dataUrl.length > MAX_CHARS * 1.15) {
      throw new Error("压缩后仍然太大，请裁切后再试");
    }
    const thumbUrl = drawToUrl(bitmap, THUMB_EDGE, 0.62, THUMB_CHARS);
    return { dataUrl, thumbUrl };
  } finally {
    bitmap.close();
  }
}

export async function compressAvatarFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");
  if (file.size > 8 * 1024 * 1024) throw new Error("图片超过 8MB");
  const bitmap = await createImageBitmap(file);
  try {
    return drawToUrl(bitmap, 320, 0.82, 80_000);
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
