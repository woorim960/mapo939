// 게임 오버 모달 컴포넌트

"use client";

import { useEffect, useState } from "react";
import { getPlayerStats, type WatermelonPlayer } from "../api";

type GameOverModalProps = {
  open: boolean;
  score: number;
  bestScore: number;
  isNewRecord: boolean;
  playerId?: string | null;
  onRestart: () => void;
  onClose: () => void;
};

type PeriodStats = {
  today: { bestScore: number; playCount: number };
  week: { bestScore: number; playCount: number };
  month: { bestScore: number; playCount: number };
  all: { bestScore: number; playCount: number };
};

export function GameOverModal({
  open,
  score,
  bestScore,
  isNewRecord,
  playerId,
  onRestart,
  onClose,
}: GameOverModalProps) {
  const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onRestart();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onRestart]);

  // 통계 데이터 로드
  useEffect(() => {
    if (!open || !playerId) return;

    const loadStats = async () => {
      setLoading(true);
      try {
        const periods: ("today" | "week" | "month" | "all")[] = ["today", "week", "month", "all"];
        const statsPromises = periods.map(async (period) => {
          const data = await fetch(`/api/watermelon/stats?playerId=${encodeURIComponent(playerId)}&period=${period}`);
          const json = await data.json();
          return { period, stats: json.player };
        });

        const results = await Promise.all(statsPromises);
        const stats: PeriodStats = {
          today: { bestScore: 0, playCount: 0 },
          week: { bestScore: 0, playCount: 0 },
          month: { bestScore: 0, playCount: 0 },
          all: { bestScore: 0, playCount: 0 },
        };

        results.forEach(({ period, stats: playerStats }) => {
          stats[period as keyof PeriodStats] = {
            bestScore: playerStats.bestScore || 0,
            playCount: playerStats.playCount || 0,
          };
        });

        setPeriodStats(stats);
      } catch (error) {
        console.error("Failed to load period stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [open, playerId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300"
      onMouseDown={onRestart}
      role="dialog"
      aria-modal="true"
      aria-label="게임 오버"
    >
      <div
        className="w-full max-w-md rounded-3xl border-2 border-white/20 bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-xl shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300 overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 - 더 예쁘게 */}
        <div className="relative bg-gradient-to-r from-red-500 via-pink-500 to-orange-500 px-6 py-5 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-white/30">
                <span className="text-2xl">💥</span>
              </div>
              <div>
                <div className="text-xl font-bold text-white drop-shadow-lg">게임 오버</div>
                <div className="text-xs text-white/80 font-medium">Game Over</div>
              </div>
            </div>
            <button
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all duration-200 text-white hover:scale-110 active:scale-95 shadow-lg border-2 border-white/30"
              onClick={() => {
                onRestart();
              }}
              aria-label="닫기 및 다시 시작"
            >
              <span className="text-lg font-bold">×</span>
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5 bg-gradient-to-b from-transparent to-gray-50/30">
          {isNewRecord && (
            <div className="relative rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 px-5 py-4 text-center shadow-xl border-2 border-yellow-300/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              <div className="relative text-lg font-bold text-white flex items-center justify-center gap-2 drop-shadow-md">
                <span className="text-2xl animate-bounce">🎉</span>
                <span>신기록 달성!</span>
                <span className="text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>🎉</span>
              </div>
            </div>
          )}

          {/* 현재 점수 */}
          <div className="relative rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 p-6 shadow-xl border-2 border-green-400/40 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative">
              <div className="text-xs font-semibold text-green-100 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <span>⭐</span>
                <span>현재 점수</span>
              </div>
              <div className="text-5xl font-extrabold text-white drop-shadow-lg">{score.toLocaleString()}</div>
            </div>
          </div>

          {/* 통계 카드 그리드 */}
          {loading ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-3 animate-spin">⏳</div>
              <div className="text-sm text-gray-500 font-medium">통계 로딩 중...</div>
            </div>
          ) : periodStats ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "today" as const, label: "오늘", emoji: "🌅", color: "from-blue-500 to-cyan-500", borderColor: "border-blue-400/40" },
                { key: "week" as const, label: "이번주", emoji: "📅", color: "from-purple-500 to-pink-500", borderColor: "border-purple-400/40" },
                { key: "month" as const, label: "이번달", emoji: "🗓️", color: "from-indigo-500 to-purple-500", borderColor: "border-indigo-400/40" },
                { key: "all" as const, label: "전체", emoji: "🏆", color: "from-amber-500 to-orange-500", borderColor: "border-amber-400/40" },
              ].map(({ key, label, emoji, color, borderColor }) => {
                const stats = periodStats[key];
                const isNewRecordForPeriod = score > stats.bestScore && stats.bestScore > 0;
                return (
                  <div
                    key={key}
                    className={`relative rounded-xl bg-gradient-to-br ${color} p-4 shadow-lg border-2 ${borderColor} overflow-hidden transition-transform hover:scale-105 ${
                      isNewRecordForPeriod ? "ring-2 ring-yellow-300 ring-offset-1 animate-pulse" : ""
                    }`}
                  >
                    {isNewRecordForPeriod && (
                      <div className="absolute top-1 right-1 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
                        NEW
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{emoji}</span>
                      <div className="text-xs font-semibold text-white/95">{label}</div>
                    </div>
                    <div className="text-2xl font-extrabold text-white drop-shadow-md">{stats.bestScore.toLocaleString()}</div>
                    <div className="text-[10px] text-white/75 mt-1.5 font-medium">플레이 {stats.playCount}회</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-amber-200/50 bg-gradient-to-br from-amber-50/80 to-orange-50/80 p-4 shadow-sm">
              <div className="text-sm font-bold text-amber-700 mb-2">최고 점수</div>
              <div className="text-3xl font-bold text-amber-600">{bestScore.toLocaleString()}</div>
            </div>
          )}
        </div>

        {/* 푸터 버튼 */}
        <div className="px-6 py-5 bg-gradient-to-b from-gray-50/50 to-white border-t border-gray-200/50">
          <button
            className="w-full rounded-xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 px-5 py-3.5 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-2 border-green-400/30"
            onClick={() => {
              onRestart();
              onClose();
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <span>🔄</span>
              <span>다시 시작</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
