// 플레이어 목록 컴포넌트

import { useEffect, useState } from "react";
import type { PublicPlayer } from "../types";
import { getScoreColor } from "../utils";

type PlayerListProps = {
  players: PublicPlayer[];
  currentPlayerId: string;
  roundWinners: string[];
  finalChampionIds: string[];
  deadTrollId: string | null;
  compact?: boolean;
};

export function PlayerList({
  players,
  currentPlayerId,
  roundWinners,
  finalChampionIds,
  deadTrollId,
  compact = false,
}: PlayerListProps) {
  const sortedPlayers = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const finalChampionSet = new Set(finalChampionIds);
  const [displayedScores, setDisplayedScores] = useState<Record<string, number>>({});
  const [isExpanded, setIsExpanded] = useState(false);

  // 점수 동기화
  useEffect(() => {
    const initial: Record<string, number> = {};
    sortedPlayers.forEach((p) => {
      initial[p.playerId] = p.score ?? 0;
    });
    setDisplayedScores(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.map((p) => `${p.playerId}:${p.score ?? 0}`).join(",")]);

  // 컴팩트 모드에서는 최대 3명만 표시, 나머지는 확장 버튼으로
  const displayPlayers = compact && !isExpanded ? sortedPlayers.slice(0, 3) : sortedPlayers;
  const hasMore = compact && sortedPlayers.length > 3 && !isExpanded;

  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          👥 참여자 {compact && `(${sortedPlayers.length}명)`}
        </div>
        {compact && sortedPlayers.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-600 hover:text-gray-800 font-medium underline"
          >
            {isExpanded ? "접기" : "전체보기"}
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {displayPlayers.map((p) => {
          const score = p.score ?? 0;
          const displayScore = displayedScores[p.playerId] ?? score;
          const isMe = p.playerId === currentPlayerId;
          const isFinalChampion = finalChampionSet.has(p.playerId);
          const isRoundWinner = roundWinners.includes(p.playerId);
          const isDeadTroll = deadTrollId === p.playerId;
          const scoreColor = getScoreColor(score);
          // 실제 순위 계산 (sortedPlayers 기준)
          const actualRank = sortedPlayers.findIndex(sp => sp.playerId === p.playerId) + 1;

          return (
            <div
              key={p.playerId}
              className={[
                "group flex items-center justify-between rounded-lg border-2 px-3 py-2 transition-all duration-200",
                compact ? "" : "hover:scale-[1.02] hover:shadow-lg",
                isFinalChampion
                  ? "bg-gradient-to-r from-purple-100 to-pink-100 border-purple-400 ring-2 ring-purple-300/50 shadow-lg shadow-purple-200/50 animate-pulse"
                  : isMe
                    ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300 shadow-md"
                    : !p.isAlive
                      ? "bg-gray-100 border-gray-300 opacity-60"
                      : "bg-white border-gray-200 hover:border-gray-300 shadow-sm",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={[
                  "flex-shrink-0 rounded-full flex items-center justify-center font-bold",
                  compact ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm",
                  isFinalChampion
                    ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg"
                    : actualRank <= 3
                      ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
                      : "bg-gray-300 text-gray-700",
                ].join(" ")}>
                  {actualRank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={[
                      "font-bold truncate",
                      compact ? "text-sm" : "text-base",
                      isFinalChampion ? "text-purple-800" : isMe ? "text-blue-700" : "text-gray-800",
                    ].join(" ")}>
                      {p.nickname}
                    </span>
                    {isMe && (
                      <span className={[
                        "px-1.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500 text-white",
                        compact ? "" : "animate-pulse",
                      ].join(" ")}>
                        나
                      </span>
                    )}
                    {p.isHost && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-600 text-white">
                        👑
                      </span>
                    )}
                    {!p.isAlive && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-600 text-white">
                        💀
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isFinalChampion && !compact && (
                  <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold shadow-lg animate-pulse">
                    🏆 최종 우승
                  </span>
                )}
                {isRoundWinner && !isFinalChampion && !compact && (
                  <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold shadow-md animate-bounce">
                    ⭐ WIN
                  </span>
                )}
                {isDeadTroll && !compact && (
                  <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold shadow-md">
                    🎭 트롤
                  </span>
                )}
                <span
                  className={[
                    "rounded-full font-bold text-white shadow-md transition-all duration-300",
                    compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
                    scoreColor.bg,
                    scoreColor.glow,
                  ].join(" ")}
                >
                  {Math.round(displayScore)}점
                </span>
              </div>
            </div>
          );
        })}
        {hasMore && (
          <div className="text-center py-2 text-xs text-gray-500">
            +{sortedPlayers.length - 3}명 더...
          </div>
        )}
        {sortedPlayers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">👤</div>
            <div className="text-sm">참여자가 없습니다</div>
          </div>
        )}
      </div>
    </section>
  );
}