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
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
              <span>{form.mode === "create" ? "➕" : "✏️"}</span>
              <span>{form.mode === "create" ? "멤버 추가" : "멤버 수정"}</span>
            </div>
            <button
              type="button"
              className="text-xs px-2 py-1 rounded-md text-gray-600 hover:bg-white/50 hover:text-gray-800 transition-colors"
              onClick={onClose}
              aria-label="닫기"
            >
              ✕ 닫기
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">이름 *</label>
                <input
                  value={form.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  className="w-full rounded-xl border-2 border-blue-300 px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:border-gray-300"
                  placeholder="홍길동"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">핸드폰 번호 *</label>
                <input
                  value={form.phone}
                  onChange={(e) => onChange({ phone: e.target.value })}
                  className="w-full rounded-xl border-2 border-blue-300 px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:border-gray-300"
                  placeholder="010-1234-5678"
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">생년월일(YYYY-MM-DD) *</label>
              <input
                value={form.birthDateYmd}
                onChange={(e) => onChange({ birthDateYmd: e.target.value })}
                className="w-full rounded-xl border-2 border-blue-300 px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:border-gray-300"
                placeholder="2004-03-21"
                disabled={saving}
              />
              <div className="mt-1 text-xs text-gray-600">한국나이 계산은 서버 기준입니다.</div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">사진 업로드 *</label>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={saving}
                />
                <div className="w-full rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span className="text-sm text-blue-700 font-medium">📷 파일 선택</span>
                </div>
              </label>
              {!form.photoUrl && (
                <div className="mt-1 text-xs text-gray-600">업로드 후 크롭 완료해야 저장 가능합니다.</div>
              )}
            </div>

            {form.photoUrl && (
              <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                <div className="text-xs font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <span>📷</span>
                  <span>사진 미리보기</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-xl border-2 border-white shadow-lg bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.photoUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white shadow-lg bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.photoUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 text-xs text-blue-700">
                    업로드 후 서버에서 webp(예: 512x512)로 저장된 URL이 들어갑니다.
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border-2 border-red-200 flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
                <span className="text-xl">❌</span>
                <div className="text-sm font-semibold text-red-700">{error}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-base font-bold text-gray-800 hover:bg-gray-50 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onClose}
                disabled={saving}
              >
                취소
              </button>
              <button
                type="button"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
                onClick={onSave}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    <span>저장 중...</span>
                  </span>
                ) : (
                  <span>✨ 저장</span>
                )}
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
