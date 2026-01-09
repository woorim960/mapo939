// 참가 폼 컴포넌트

import type { Phase } from "../types";
import { canJoinNow } from "../utils";

type JoinFormProps = {
  nickname: string;
  joinErr: string;
  busy: boolean;
  publicState: { phase: Phase } | null;
  onChangeNickname: (nick: string) => void;
  onJoin: () => void;
};

export function JoinForm({ nickname, joinErr, busy, publicState, onChangeNickname, onJoin }: JoinFormProps) {
  const canJoin = publicState ? canJoinNow(publicState.phase) : true;

  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2 mb-4">
        <span>🚪</span>
        <span>게임 참가</span>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">닉네임 입력</label>
        <input
          className="w-full rounded-xl border-2 border-blue-300 px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:border-gray-300"
          value={nickname}
          onChange={(e) => onChangeNickname(e.target.value)}
          placeholder="중복 불가한 닉네임을 입력하세요"
          disabled={busy || !canJoin}
        />
      </div>

      {joinErr ? (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border-2 border-red-200 flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
          <span className="text-xl">❌</span>
          <div className="text-sm font-semibold text-red-700">{joinErr}</div>
        </div>
      ) : null}

      <button
        className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
        onClick={onJoin}
        disabled={busy || !canJoin}
        title={!canJoin ? "진행 중에는 참가 불가" : "참가하기"}
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            <span>참가 중...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span>✨</span>
            <span>참가하기</span>
          </span>
        )}
      </button>

      {publicState && !canJoinNow(publicState.phase) && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border-2 border-amber-200 flex items-start gap-3">
          <span className="text-xl">⏸️</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-amber-800 mb-1">게임 진행 중</div>
            <div className="text-xs text-amber-700">
              지금은 게임이 진행 중이라 참가할 수 없어요. 잠시만 기다려주세요.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
