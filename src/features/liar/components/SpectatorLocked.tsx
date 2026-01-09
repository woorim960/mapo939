// 관전 잠금 안내 컴포넌트

import type { Phase } from "../types";
import { canJoinNow } from "../utils";

type SpectatorLockedProps = {
  publicState: { phase: Phase } | null;
  busy: boolean;
  joinErr: string;
  onJoin: () => void;
};

export function SpectatorLocked({ publicState, busy, joinErr, onJoin }: SpectatorLockedProps) {
  const canJoin = publicState ? canJoinNow(publicState.phase) : false;

  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-slate-500 flex items-center justify-center text-2xl shadow-lg">
          👁️
        </div>
        <div>
          <div className="text-lg font-bold text-gray-800">관전 모드</div>
          <div className="text-xs text-gray-600">참여 불가</div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="p-3 rounded-xl bg-gray-50 border-2 border-gray-200">
          <div className="text-sm text-gray-700">
            새로고침 등으로 인해 <span className="font-semibold text-gray-900">현재 게임 참가자에서 제외</span>됐어요.
          </div>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-200">
          <div className="text-xs text-amber-700">
            게임 진행 중에는 참가할 수 없고, <span className="font-semibold">새 게임(대기/준비)</span>가 되면 참가할 수 있어요.
          </div>
        </div>
      </div>

      <button
        className={[
          "w-full rounded-xl px-4 py-3 text-base font-bold text-white shadow-lg transition-all duration-200",
          (busy || !canJoin)
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
        ].join(" ")}
        onClick={onJoin}
        disabled={busy || !publicState || !canJoin}
        title={!publicState ? "상태 불러오는 중" : canJoin ? "참가 가능" : "새 게임에서 참가 가능"}
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            <span>처리 중...</span>
          </span>
        ) : canJoin ? (
          <span className="flex items-center justify-center gap-2">
            <span>✨</span>
            <span>다시 참가하기</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-pulse">⏳</span>
            <span>새 게임 대기 중…</span>
          </span>
        )}
      </button>

      {joinErr && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border-2 border-red-200 flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
          <span className="text-xl">❌</span>
          <div className="text-sm font-semibold text-red-700">{joinErr}</div>
        </div>
      )}
    </section>
  );
}
