// 이미지 관련 유틸리티

import type { CropPixels } from "../types";

export function isLikelyBlobUrl(url: string): boolean {
  return typeof url === "string" && url.includes("vercel-storage.com");
}

/** 이미지(src)를 cropPixels 영역으로 잘라서 Blob(JPEG)로 반환 (회전 없음) */
export async function getCroppedBlob(imageSrc: string, cropPixels: CropPixels): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no_canvas_context");

  ctx.drawImage(
    img,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob_failed"))), "image/jpeg", 0.92);
  });
}

/** 크롭 결과를 DataURL로 만들어 원형 미리보기용으로 사용 */
export async function getCroppedDataUrl(imageSrc: string, cropPixels: CropPixels): Promise<string> {
  const blob = await getCroppedBlob(imageSrc, cropPixels);
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
