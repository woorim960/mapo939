// 통계 모달 컴포넌트

"use client";

import { useState, useEffect } from "react";
import { Leaderboard } from "./Leaderboard";
import { getLeaderboard, type LeaderboardEntry } from "../api";

type StatsModalProps = {
  open: boolean;
  onClose: () => void;
  currentPlayerId?: string | null;
};

type Period = "today" | "week" | "month" | "all";

export function StatsModal({ open, onClose, currentPlayerId }: StatsModalProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("all");

  useEffect(() => {
    if (!open) return;

    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const data = await getLeaderboard(selectedPeriod);
        setLeaderboard(data);
      } catch (error) {
        console.error("Failed to load leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [open, selectedPeriod]);

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
      aria-label="통계"
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
        className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/90 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          // 모바일 safe area를 고려한 max-height 계산
          maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)',
        }}
      >
        <div className="flex items-center justify-between border-b-2 border-green-200/50 bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-4 rounded-t-2xl">
          <div className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <span>리더보드</span>
          </div>
          <button
            className="text-lg text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex border-b-2 border-gray-200 bg-gray-50/50">
          {[
            { key: "today" as Period, label: "오늘" },
            { key: "week" as Period, label: "이번주" },
            { key: "month" as Period, label: "이번달" },
            { key: "all" as Period, label: "전체" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedPeriod(tab.key)}
              className={`flex-1 px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                selectedPeriod === tab.key
                  ? "text-green-600 border-b-2 border-green-600 bg-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2 animate-spin">⏳</div>
              <div className="text-sm text-gray-500">로딩 중...</div>
            </div>
          ) : (
            <Leaderboard leaderboard={leaderboard} currentPlayerId={currentPlayerId} />
          )}
        </div>
      </div>
    </div>
  );
}
