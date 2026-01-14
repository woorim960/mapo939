// 저장 확인 모달 컴포넌트

"use client";

type SaveConfirmModalProps = {
  open: boolean;
  score: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export function SaveConfirmModal({
  open,
  score,
  onConfirm,
  onCancel,
}: SaveConfirmModalProps) {
  if (!open) return null;

  const isScoreTooLow = score < 200;

  return (
    <div
      className="fixed z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300"
      onMouseDown={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="점수 저장 확인"
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
        className="w-full max-w-md rounded-3xl border-2 border-white/20 bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-xl shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300 overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          // 모바일 safe area를 고려한 max-height 계산
          maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)',
        }}
      >
        {/* 헤더 */}
        <div className="relative bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-6 py-5 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-white/30">
                <span className="text-2xl">💾</span>
              </div>
              <div>
                <div className="text-xl font-bold text-white drop-shadow-lg">점수 저장</div>
                <div className="text-xs text-white/80 font-medium">Save Score</div>
              </div>
            </div>
            <button
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all duration-200 text-white hover:scale-110 active:scale-95 shadow-lg border-2 border-white/30"
              onClick={onCancel}
              aria-label="닫기"
            >
              <span className="text-lg font-bold">×</span>
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-4 bg-gradient-to-b from-transparent to-gray-50/30">
          {/* 현재 점수 표시 */}
          <div className="relative rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-6 shadow-xl border-2 border-blue-400/40 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative">
              <div className="text-xs font-semibold text-blue-100 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <span>⭐</span>
                <span>현재 점수</span>
              </div>
              <div className="text-5xl font-extrabold text-white drop-shadow-lg">{score.toLocaleString()}</div>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="space-y-3">
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-4 border-2 border-green-200/50">
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-green-800 mb-1">게임은 계속 이어서 할 수 있습니다!</div>
                  <div className="text-xs text-green-700">점수를 저장해도 게임이 종료되지 않으며, 계속 플레이할 수 있습니다.</div>
                </div>
              </div>
            </div>

            {isScoreTooLow && (
              <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 border-2 border-amber-300/50">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-amber-800 mb-1">200점 미만은 저장되지 않습니다</div>
                    <div className="text-xs text-amber-700">현재 점수가 200점 미만이므로 저장되지 않습니다. 더 높은 점수를 달성해보세요!</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 푸터 버튼 */}
        <div className="px-6 py-5 bg-gradient-to-b from-gray-50/50 to-white border-t border-gray-200/50 flex gap-3">
          <button
            className="flex-1 rounded-xl bg-gradient-to-r from-gray-400 to-gray-500 px-5 py-3.5 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-2 border-gray-300/30"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            className={`flex-1 rounded-xl px-5 py-3.5 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-2 ${
              isScoreTooLow
                ? "bg-gradient-to-r from-gray-400 to-gray-500 border-gray-300/30 cursor-not-allowed opacity-60"
                : "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 border-blue-400/30"
            }`}
            onClick={onConfirm}
            disabled={isScoreTooLow}
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}
