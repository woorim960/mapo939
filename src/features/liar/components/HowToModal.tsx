// 게임 방법 모달 컴포넌트

import { useEffect } from "react";

type HowToModalProps = {
  open: boolean;
  onClose: () => void;
};

export function HowToModal({ open, onClose }: HowToModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="게임 방법"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-bold">🕵️‍♂️ 라이어 게임 방법</div>
          <button className="text-xs underline text-gray-600" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-4 py-4 space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-gray-900 bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 text-center">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="relative z-10 text-sm font-extrabold tracking-wide text-white">
              잡거나, 숨거나, 일부러 죽거나
            </div>
          </div>

          <section className="rounded-xl border bg-gray-50 p-3">
            <div className="text-xs font-semibold text-gray-700 mb-2">🎯 게임 목표</div>

            <div className="space-y-3">
              <div className="rounded-lg border bg-white p-3">
                <div className="text-sm font-semibold">관객</div>
                <div className="mt-1 text-sm text-gray-700">→ 수상한 답변을 골라 라이어를 잡아내세요</div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="text-sm font-semibold">라이어</div>
                <div className="mt-1 text-sm text-gray-700">→ 들키지 말고 버티세요</div>
                <div className="mt-1 text-sm text-gray-700">→ 라이어 중 한 명이라도 살아남으면 승리!</div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="text-sm font-semibold">트롤</div>
                <div className="mt-1 text-sm text-gray-700">→ 인생은 혼자, 열심히 눈에 띄세요</div>
                <div className="mt-1 text-sm text-gray-700">→ 투표로 죽으면 보너스 점수 획득!</div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="text-sm font-semibold">최종 목표</div>
                <div className="mt-1 text-sm text-gray-700">누가 먼저 300점을 찍느냐가 진짜 승자</div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border p-3">
            <div className="text-xs font-semibold text-gray-700 mb-2">▶️ 게임 진행</div>
            <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
              <li>질문 공개</li>
              <li>답변 입력</li>
              <li>토론</li>
              <li>투표 → 1명 탈락</li>
            </ol>
            <div className="mt-2 text-xs text-gray-500">동점이면 재논의 후 재투표</div>
          </section>
        </div>

        <div className="border-t px-4 py-3">
          <button className="w-full rounded-lg bg-black px-3 py-2 text-sm font-semibold !text-white" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
