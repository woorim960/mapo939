// 멤버 추가/수정 폼 컴포넌트

import { useState } from "react";
import { Modal } from "@/shared/components/Modal";
import { CropModal } from "./CropModal";
import type { MemberFormState } from "../types";

type MemberFormProps = {
  form: MemberFormState;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onChange: (updates: Partial<MemberFormState>) => void;
  onSave: () => void;
  onPhotoUploaded: (url: string) => void;
};

export function MemberForm({ form, error, saving, onClose, onChange, onSave, onPhotoUploaded }: MemberFormProps) {
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropImageSrc(url);
    setCropOpen(true);
    e.currentTarget.value = "";
  }

  function handleCropComplete(url: string) {
    onChange({ photoUrl: url });
    onPhotoUploaded(url);
    setCropOpen(false);
    setCropImageSrc(null);
  }

  if (!form.open) return null;

  return (
    <>
      <Modal onClose={onClose}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{form.mode === "create" ? "멤버 추가" : "멤버 수정"}</h2>
            <button type="button" className="rounded-lg border px-3 py-1 text-sm" onClick={onClose}>
              닫기
            </button>
          </div>

          <div className="grid gap-3 rounded-2xl border p-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm text-neutral-600">이름 *</label>
              <input
                value={form.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="홍길동"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm text-neutral-600">핸드폰 번호 *</label>
              <input
                value={form.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="010-1234-5678"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm text-neutral-600">생년월일(YYYY-MM-DD) *</label>
              <input
                value={form.birthDateYmd}
                onChange={(e) => onChange({ birthDateYmd: e.target.value })}
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="2004-03-21"
              />
              <div className="text-xs text-neutral-500">* 한국나이 계산은 서버 기준입니다.</div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm text-neutral-600">사진 업로드 *</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm"
                onChange={handleFileChange}
              />
              {!form.photoUrl && (
                <div className="text-xs text-neutral-500">* 업로드 후 크롭 완료해야 저장 가능</div>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="flex items-start gap-3 rounded-2xl border p-3">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border bg-neutral-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {form.photoUrl ? (
                    <img src={form.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">미리보기</div>
                  )}
                </div>

                <div className="flex-1 text-sm text-neutral-700">
                  <div className="font-semibold">사진 미리보기</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    * 업로드 후 서버에서 webp(예: 512x512)로 저장된 URL이 들어갑니다.
                  </div>
                </div>

                <div className="h-20 w-20 overflow-hidden rounded-full border bg-neutral-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {form.photoUrl ? (
                    <img src={form.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">원형</div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="md:col-span-2 rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700">{error}</div>
            )}

            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                onClick={onClose}
              >
                취소
              </button>
              <button
                type="button"
                disabled={saving}
                className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
                onClick={onSave}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <CropModal
        open={cropOpen}
        imageSrc={cropImageSrc}
        onClose={() => {
          setCropOpen(false);
          setCropImageSrc(null);
        }}
        onComplete={handleCropComplete}
      />
    </>
  );
}
