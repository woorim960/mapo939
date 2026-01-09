// 사진 크롭 모달 컴포넌트

import { useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { Modal } from "@/shared/components/Modal";
import { getCroppedBlob, getCroppedDataUrl } from "../utils";
import { uploadMemberPhoto } from "../api/uploads";
import type { CropPixels } from "../types";

type CropModalProps = {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onComplete: (url: string) => void;
};

export function CropModal({ open, imageSrc, onClose, onComplete }: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<CropPixels | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open || !imageSrc) {
      setCropPreviewUrl(null);
      return;
    }
  }, [open, imageSrc]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!open || !imageSrc || !cropPixels) {
        setCropPreviewUrl(null);
        return;
      }
      try {
        const durl = await getCroppedDataUrl(imageSrc, cropPixels);
        if (alive) setCropPreviewUrl(durl);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, imageSrc, cropPixels]);

  async function confirmCropAndUpload() {
    if (!imageSrc || !cropPixels) return;

    setUploading(true);
    try {
      const cropped = await getCroppedBlob(imageSrc, cropPixels);
      const file = new File([cropped], "member.jpg", { type: "image/jpeg" });
      const { url } = await uploadMemberPhoto(file);
      onComplete(url);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  if (!open || !imageSrc) return null;

  return (
    <Modal onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">사진 크롭</h2>
          <button type="button" className="rounded-lg border px-3 py-1 text-sm" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative h-[360px] w-full overflow-hidden rounded-2xl border bg-black">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCropPixels(pixels as CropPixels)}
            />
          </div>

          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold">원형 미리보기</div>
            <div className="mt-3 flex items-center gap-4">
              <div className="h-28 w-28 overflow-hidden rounded-full border bg-neutral-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {cropPreviewUrl ? (
                  <img src={cropPreviewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <img src={imageSrc} alt="" className="h-full w-full object-cover opacity-70" />
                )}
              </div>
              <div className="flex-1 text-xs text-neutral-500">
                * 회전 없음<br />
                * 크롭 후 업로드하면 서버에서 webp로 저장됩니다.
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm text-neutral-600">줌</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={onClose}>
                취소
              </button>
              <button
                type="button"
                disabled={uploading}
                className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
                onClick={confirmCropAndUpload}
              >
                {uploading ? "업로드 중..." : "크롭 완료"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
