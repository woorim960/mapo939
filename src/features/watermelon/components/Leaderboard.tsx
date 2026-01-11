// 리더보드 컴포넌트

"use client";

import type { LeaderboardEntry } from "../api";

type LeaderboardProps = {
  leaderboard: LeaderboardEntry[];
  currentPlayerId?: string | null;
};

export function Leaderboard({ leaderboard, currentPlayerId }: LeaderboardProps) {
  if (leaderboard.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        아직 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {leaderboard.map((entry, index) => {
        const isCurrentPlayer = entry.id === currentPlayerId;
        const rank = index + 1;
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;

        return (
          <div
            key={entry.id}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border-2 transition-all ${
              isCurrentPlayer
                ? "bg-green-100 border-green-300 shadow-md"
                : "bg-white/50 border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-bold text-gray-700 w-8">{medal}</span>
              <span
                className={`text-sm font-semibold truncate ${
                  isCurrentPlayer ? "text-green-700" : "text-gray-800"
                }`}
              >
                {entry.nickname}
                {isCurrentPlayer && <span className="ml-1 text-xs">(나)</span>}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="text-right">
                <div className="text-gray-500">최고</div>
                <div className="font-bold text-amber-600">{entry.bestScore.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-gray-500">평균</div>
                <div className="font-bold text-blue-600">{entry.averageScore.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-gray-500">플레이</div>
                <div className="font-bold text-purple-600">{entry.playCount}회</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
