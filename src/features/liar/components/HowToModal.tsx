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
      className="fixed z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="게임 방법"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // 모바일 safe area 적용
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      <div 
        className="w-full max-w-lg rounded-2xl border-2 border-white/50 bg-white/90 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          // 모바일 safe area를 고려한 max-height 계산
          maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)',
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b-2 border-purple-200/50 bg-gradient-to-r from-purple-50 to-pink-50 px-5 py-4 rounded-t-2xl">
          <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <span className="text-2xl">🎭</span>
            <span>라이어 게임 방법</span>
          </div>
          <button 
            className="text-lg text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 내용 */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5 space-y-4">
          {/* 슬로건 */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-gray-800 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-5 py-4 text-center shadow-lg">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="relative z-10 text-base font-extrabold tracking-wide text-white">
              잡거나, 숨거나, 일부러 죽거나
            </div>
          </div>

          {/* 게임 목표 */}
          <section className="rounded-xl border-2 border-purple-200/50 bg-gradient-to-br from-purple-50/80 to-pink-50/80 p-4 shadow-sm">
            <div className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span>게임 목표</span>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 shadow-sm">
                <div className="text-base font-bold text-blue-700 mb-1 flex items-center gap-2">
                  <span>👥</span>
                  <span>관객</span>
                </div>
                <div className="mt-2 text-sm text-gray-700 leading-relaxed">
                  수상한 답변을 골라 라이어를 잡아내세요
                </div>
              </div>

              <div className="rounded-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-4 shadow-sm">
                <div className="text-base font-bold text-red-700 mb-1 flex items-center gap-2">
                  <span>🎭</span>
                  <span>라이어</span>
                </div>
                <div className="mt-2 space-y-1 text-sm text-gray-700 leading-relaxed">
                  <div>→ 들키지 말고 버티세요</div>
                  <div>→ 라이어 중 한 명이라도 살아남으면 승리!</div>
                </div>
              </div>

              <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4 shadow-sm">
                <div className="text-base font-bold text-orange-700 mb-1 flex items-center gap-2">
                  <span>🤡</span>
                  <span>트롤</span>
                </div>
                <div className="mt-2 space-y-1 text-sm text-gray-700 leading-relaxed">
                  <div>→ 인생은 혼자, 열심히 눈에 띄세요</div>
                  <div>→ 투표로 죽으면 보너스 점수 획득!</div>
                </div>
              </div>

              <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4 shadow-sm">
                <div className="text-base font-bold text-purple-700 mb-1 flex items-center gap-2">
                  <span>👑</span>
                  <span>최종 목표</span>
                </div>
                <div className="mt-2 text-sm text-gray-700 leading-relaxed">
                  누가 먼저 300점을 찍느냐가 진짜 승자
                </div>
              </div>
            </div>
          </section>

          {/* 게임 진행 */}
          <section className="rounded-xl border-2 border-indigo-200/50 bg-gradient-to-br from-indigo-50/80 to-blue-50/80 p-4 shadow-sm">
            <div className="text-sm font-bold text-indigo-700 mb-3 flex items-center gap-2">
              <span className="text-lg">▶️</span>
              <span>게임 진행</span>
            </div>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700 leading-relaxed">
              <li className="pl-1">질문 공개</li>
              <li className="pl-1">답변 입력</li>
              <li className="pl-1">토론</li>
              <li className="pl-1">투표 → 1명 사망</li>
            </ol>
            <div className="mt-3 p-2 rounded-lg bg-indigo-100/50 border border-indigo-200 text-xs text-indigo-700 font-medium">
              💡 동점이면 재논의 후 재투표
            </div>
          </section>
        </div>

        {/* 푸터 */}
        <div className="border-t-2 border-purple-200/50 bg-gradient-to-r from-purple-50 to-pink-50 px-5 py-4 rounded-b-2xl">
          <button 
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200" 
            onClick={onClose}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
