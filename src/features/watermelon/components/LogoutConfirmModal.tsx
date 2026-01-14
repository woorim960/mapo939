// 로그아웃 확인 모달 컴포넌트

"use client";

type LogoutConfirmModalProps = {
  open: boolean;
  playerNickname: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function LogoutConfirmModal({
  open,
  playerNickname,
  onConfirm,
  onCancel,
}: LogoutConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="로그아웃 확인"
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
        className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          // 모바일 safe area를 고려한 max-height 계산
          maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)',
        }}
      >
        <div className="flex items-center justify-between border-b-2 border-orange-200/50 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 px-5 py-4 rounded-t-2xl">
          <div className="text-xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
            <span className="text-2xl">🚪</span>
            <span>로그아웃</span>
          </div>
        </div>

        <div className="px-5 py-6 space-y-4">
          <div className="rounded-lg bg-yellow-50 border-2 border-yellow-200 p-3 space-y-1.5">
            <div className="text-xs font-semibold text-yellow-800 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>안내</span>
            </div>
            <div className="text-xs text-yellow-700 space-y-0.5">
              <div>• 언제든 같은 닉네임과 패스워드로 다시 로그인할 수 있습니다.</div>
              <div>• 게임 기록은 그대로 유지됩니다.</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl bg-gradient-to-r from-gray-400 to-gray-500 px-4 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              onClick={onCancel}
            >
              취소
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 px-4 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              onClick={onConfirm}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
