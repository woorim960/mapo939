// 투표 패널 컴포넌트

import type { PublicState, PublicPlayer } from "../types";
import { phaseLabel } from "../utils";

type VotingPanelProps = {
  publicState: PublicState | null;
  phaseKo: string;
  joined: boolean;
  isAliveMe: boolean;
  voteTargets: PublicPlayer[];
  selectedVoteTargetId: string;
  myVotedTargetId: string;
  canVoteNow: boolean;
  busy: boolean;
  onSelectTarget: (playerId: string) => void;
  onSubmitVote: () => void;
};

export function VotingPanel({
  publicState,
  phaseKo,
  joined,
  isAliveMe,
  voteTargets,
  selectedVoteTargetId,
  myVotedTargetId,
  canVoteNow,
  busy,
  onSelectTarget,
  onSubmitVote,
}: VotingPanelProps) {
  const phase = publicState?.phase ?? "LOBBY";

  // 투표 진행 상황 계산
  const aliveCount = publicState?.players.filter((p) => p.isAlive).length ?? 0;
  const voteCounts = publicState?.round.voteCounts ?? {};
  const votedCount = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
  const remainingCount = Math.max(0, aliveCount - votedCount);

  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
          <span>🗳️</span>
          <span>투표</span>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">{phaseKo}</div>
      </div>

      {/* 투표 진행 상황 표시 */}
      {phase === "VOTING" && aliveCount > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-rose-100 to-pink-100 border-2 border-rose-300">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-rose-800 flex items-center gap-2">
              <span>📊</span>
              <span>투표 진행 상황</span>
            </div>
            <div className="text-sm font-bold text-rose-700">
              {votedCount} / {aliveCount}
            </div>
          </div>
          <div className="mt-2 w-full bg-rose-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-rose-500 to-pink-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${aliveCount > 0 ? (votedCount / aliveCount) * 100 : 0}%` }}
            />
          </div>
          {remainingCount > 0 && (
            <div className="mt-1.5 text-xs text-rose-600 text-right">
              {remainingCount}명 남음
            </div>
          )}
        </div>
      )}

      <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200">
        <div className="text-sm font-semibold text-rose-800 flex items-center gap-2">
          <span>💡</span>
          <span>{phase === "VOTING" ? "대상 선택 후 투표하세요" : "투표 단계가 아닐 수 있어요"}</span>
        </div>
      </div>

      {!joined ? (
        <div className="mb-4 p-4 rounded-xl border-2 border-gray-300 bg-gray-50 flex items-center gap-3">
          <span className="text-2xl">👁️</span>
          <div className="text-sm text-gray-700 font-medium">관전 중에는 투표할 수 없어요</div>
        </div>
      ) : null}

      <div className="space-y-2.5 mb-4">
        {voteTargets.map((p, index) => {
          const selected = p.playerId === selectedVoteTargetId;
          const count = publicState?.round.voteCounts?.[p.playerId] ?? 0;
          const isDisabled = !joined || !isAliveMe || busy || !!myVotedTargetId;

          return (
            <button
              key={p.playerId}
              type="button"
              className={[
                "w-full rounded-xl border-2 px-4 py-3 text-left transition-all duration-200",
                selected
                  ? "border-rose-500 bg-gradient-to-r from-rose-100 to-pink-100 shadow-lg scale-[1.02] ring-2 ring-rose-300"
                  : isDisabled
                    ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                    : "border-gray-300 bg-white hover:border-rose-300 hover:bg-rose-50 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
              ].join(" ")}
              onClick={() => !isDisabled && onSelectTarget(p.playerId)}
              disabled={isDisabled}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-all",
                      selected
                        ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white scale-110"
                        : "bg-gray-200 text-gray-700",
                    ].join(" ")}
                  >
                    {selected ? "✓" : index + 1}
                  </div>
                  <span className="font-semibold text-base text-gray-800">{p.nickname}</span>
                </div>
                <div className="flex items-center gap-2">
                  {count > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-bold shadow-md animate-in zoom-in duration-200">
                      {count}표
                    </span>
                  )}
                  {selected && (
                    <span className="text-xl animate-in zoom-in duration-200">👉</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {voteTargets.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">👤</div>
            <div className="text-sm">투표할 대상이 없습니다</div>
          </div>
        )}
      </div>

      <button
        className={[
          "w-full rounded-xl px-4 py-3 text-base font-bold text-white shadow-lg transition-all duration-200",
          myVotedTargetId || (busy || !canVoteNow || !selectedVoteTargetId)
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-rose-500 to-pink-500 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
        ].join(" ")}
        onClick={onSubmitVote}
        disabled={busy || !canVoteNow || !selectedVoteTargetId || !!myVotedTargetId}
      >
        {myVotedTargetId ? (
          <span className="flex items-center justify-center gap-2">
            <span>✅</span>
            <span>투표 완료</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span>🗳️</span>
            <span>투표하기</span>
          </span>
        )}
      </button>

      {myVotedTargetId && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-50 border-2 border-emerald-200 flex items-center gap-2 animate-in slide-in-from-bottom-1 duration-200">
          <span className="text-xl">✅</span>
          <div className="text-sm font-semibold text-emerald-800">투표가 완료되었습니다</div>
        </div>
      )}

      {!canVoteNow && joined && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 border-2 border-red-200 flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          <div className="text-sm font-semibold text-red-700">
            {phase !== "VOTING" ? "투표 단계가 아닙니다" : "사망자는 투표할 수 없습니다"}
          </div>
        </div>
      )}
    </section>
  );
}
