// 게임 방법 모달 컴포넌트

"use client";

import { useEffect } from "react";
import { FruitEmoji } from "./FruitEmoji";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200"
      style={{ height: '100dvh' }}
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="게임 방법"
    >
      <div
        className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/90 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300 flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 1rem)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-green-200/50 bg-gradient-to-r from-green-50 to-emerald-50 px-4 sm:px-5 py-3 sm:py-4 rounded-t-2xl flex-shrink-0">
          <div className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
            <span className="text-2xl">🍉</span>
            <span>수박게임 방법</span>
          </div>
          <button
            className="text-lg text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-5 py-4 sm:py-5 space-y-3 sm:space-y-4">
          <section className="rounded-xl border-2 border-green-200/50 bg-gradient-to-br from-green-50/80 to-emerald-50/80 p-4 shadow-sm">
            <div className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span>목표</span>
            </div>
            <p className="text-sm text-gray-700">
              같은 과일 2개를 합쳐서 최종 목표인 수박 🍉을 만드세요!
            </p>
          </section>

          <section className="rounded-xl border-2 border-blue-200/50 bg-gradient-to-br from-blue-50/80 to-cyan-50/80 p-4 shadow-sm">
            <div className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span>규칙</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-700 ml-2">
              <li>화면을 터치하거나 드래그하여 과일을 떨어뜨립니다</li>
              <li>같은 레벨의 과일 2개가 접촉하면 자동으로 합쳐집니다</li>
              <li>합치면 다음 레벨의 과일이 됩니다</li>
              <li>빨간 선을 넘으면 게임 오버입니다</li>
            </ul>
            <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-300/50 shadow-sm">
              <div className="flex items-start gap-2">
                <span className="text-lg flex-shrink-0">✨</span>
                <div className="text-sm font-semibold text-blue-900">
                  레벨 10 수박 <FruitEmoji tier={10} /> 을 클릭하면 주변 과일들이 터지면서 추가 점수를 획득합니다!
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border-2 border-purple-200/50 bg-gradient-to-br from-purple-50/80 to-pink-50/80 p-4 shadow-sm">
            <div className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
              <span className="text-lg">🔢</span>
              <span>과일 순서</span>
            </div>
            <div className="text-sm text-gray-700 space-y-2">
              <div className="text-center p-2 rounded-lg bg-white/50 font-semibold space-y-1.5">
                <div>🍒 → 🍓 → 🍇 → 🍊 → 🍋 → 🥝</div>
                <div className="flex items-center justify-center gap-1">
                  <span>🍍 → 🍑 → 🍈 →</span>
                  <FruitEmoji tier={9} />
                  <span> → <FruitEmoji tier={10} /></span>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200/50">
                <div className="text-xs font-bold text-orange-800 mb-1.5 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>중요한 팁!</span>
                </div>
                <div className="text-xs text-orange-700 space-y-1">
                  <div>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <span>• 수박 반쪽</span>
                      <FruitEmoji tier={9} />
                    </span>
                    <span className="inline"> 2개를 합쳐야만 전체 수박 </span>
                    <FruitEmoji tier={10} />
                    <span className="inline"> 을 만들 수 있습니다</span>
                  </div>
                  <div>• 전체 수박은 랜덤으로 생성되지 않으며, 반드시 수박 반쪽 2개를 합쳐야만 얻을 수 있습니다</div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border-2 border-orange-200/50 bg-gradient-to-br from-orange-50/80 to-amber-50/80 p-4 shadow-sm">
            <div className="text-sm font-bold text-orange-700 mb-3 flex items-center gap-2">
              <span className="text-lg">⭐</span>
              <span>점수</span>
            </div>
            <p className="text-sm text-gray-700">
              과일을 합칠 때마다 레벨 × 10점을 획득합니다!
            </p>
          </section>
        </div>

        <div className="border-t-2 border-green-200/50 bg-gradient-to-r from-green-50 to-emerald-50 px-4 sm:px-5 py-3 sm:py-4 rounded-b-2xl flex-shrink-0">
          <button
            className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            onClick={onClose}
          >
            시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
