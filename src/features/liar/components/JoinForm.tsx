// 참가 폼 컴포넌트

import { useEffect, useState } from "react";
import type { Phase, PublicState } from "../types";
import { canJoinNow } from "../utils";

type JoinFormProps = {
  nickname: string;
  joinErr: string;
  busy: boolean;
  publicState: PublicState | null;
  onChangeNickname: (nick: string) => void;
  onJoin: () => void;
  onExtendTime?: () => void;
};

export function JoinForm({ nickname, joinErr, busy, publicState, onChangeNickname, onJoin, onExtendTime }: JoinFormProps) {
  const canJoin = publicState ? canJoinNow(publicState.phase) : true;
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isFirstVisitor, setIsFirstVisitor] = useState(false);

  const GRACE_PERIOD_MS = 60 * 1000; // 1분

  useEffect(() => {
    if (!publicState?.roomCreatedAt) {
      setRemainingSeconds(null);
      setIsFirstVisitor(false);
      return;
    }

    // 플레이어가 없으면 첫 방문자로 간주
    const hasPlayers = publicState.players && publicState.players.length > 0;
    setIsFirstVisitor(!hasPlayers && canJoin);

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - publicState.roomCreatedAt!;
      const remaining = Math.max(0, GRACE_PERIOD_MS - elapsed);
      const seconds = Math.ceil(remaining / 1000);
      setRemainingSeconds(seconds);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [publicState?.roomCreatedAt, publicState?.players, canJoin]);

  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2 mb-4">
        <span>🚪</span>
        <span>게임 참가</span>
      </div>
      
      {/* 첫 방문자 타이머 알림 */}
      {isFirstVisitor && remainingSeconds !== null && remainingSeconds > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 shadow-lg animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⏰</span>
              <div>
                <div className="text-sm font-bold text-orange-800">방 생성 후 1분 내 참가 필요</div>
                <div className="text-xs text-orange-700">시간이 지나면 자동으로 방에서 나가집니다</div>
              </div>
            </div>
            {onExtendTime && (
              <button
                onClick={onExtendTime}
                className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors shadow-md"
              >
                +1분 연장
              </button>
            )}
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-orange-700">{remainingSeconds}초</span>
              <div className="flex-1 h-2 bg-orange-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-100"
                  style={{ width: `${(remainingSeconds / 60) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
