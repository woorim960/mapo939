// 수박게임 플레이어 대시보드 컴포넌트

"use client";

import { useState, useEffect } from "react";
import { getPlayerStats, getAttendancePoints } from "../api";
import { Modal } from "@/shared/components/Modal";

type PlayerDashboardProps = {
  open: boolean;
  onClose: () => void;
  playerId: string;
};

type Period = "today" | "week" | "month" | "all";

export function PlayerDashboard({ open, onClose, playerId }: PlayerDashboardProps) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("all");
  const [stats, setStats] = useState<{
    nickname: string;
    bestScore: number;
    averageScore: number;
    playCount: number;
    averageMaxTier?: number | null;
    gamePoints?: number;
    attendancePoints?: number;
    memberId?: string;
  } | null>(null);
  const [attendancePointsData, setAttendancePointsData] = useState<{
    attendancePoints: number;
    connected: boolean;
    totalEarned?: number;
    totalUsed?: number;
  } | null>(null);

  // 초기 로드 (모달 열릴 때)
  useEffect(() => {
    if (open && playerId) {
      loadInitialData();
    }
  }, [open, playerId]);

  // 기간 변경 시 통계만 다시 로드 (초기 로드 완료 후에만)
  useEffect(() => {
    if (open && playerId && stats && !initialLoading) {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);
      // 초기 로드는 항상 "all"로 시작
      // 출석 포인트는 실패해도 계속 진행 (null 반환)
      const [playerStats, attendanceData] = await Promise.all([
        getPlayerStats(playerId, "all"),
        getAttendancePoints(playerId),
      ]);

      setStats(playerStats);
      setAttendancePointsData(attendanceData);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      // 에러가 발생해도 기본값 설정
      setStats(null);
      setAttendancePointsData(null);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadStats = async () => {
    if (!playerId) return;
    try {
      setStatsLoading(true);
      const playerStats = await getPlayerStats(playerId, period);
      setStats(playerStats);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: Period) => {
    if (newPeriod !== period) {
      setPeriod(newPeriod);
    }
  };

  if (!open) return null;

  return (
    <Modal onClose={onClose}>
      <div className="space-y-4 min-h-[500px]">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
            <span>📊</span>
            <span>개인 대시보드</span>
          </div>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded-md text-gray-600 hover:bg-white/50 hover:text-gray-800 transition-colors"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕ 닫기
          </button>
        </div>

        {initialLoading || !stats ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="text-4xl animate-spin">⏳</span>
              <p className="text-sm font-medium text-gray-600">불러오는 중...</p>
            </div>
          </div>
        ) : (
          <>
            {/* 닉네임 */}
            <div className="rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🍉</span>
                <div>
                  <div className="text-lg font-bold text-gray-800">{stats.nickname}</div>
                  <div className="text-xs text-gray-600">수박게임 플레이어</div>
                </div>
              </div>
            </div>

            {/* 포인트 정보 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🍉</span>
                  <div className="text-xs text-gray-600 font-semibold">수박게임 포인트</div>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {(stats.gamePoints ?? 1000).toLocaleString()}P
                </div>
              </div>

              {stats.memberId && attendancePointsData?.connected ? (
                <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📋</span>
                    <div className="text-xs text-gray-600 font-semibold">출석 포인트</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {attendancePointsData.attendancePoints.toLocaleString()}P
                  </div>
                  {attendancePointsData.totalEarned !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      총 {attendancePointsData.totalEarned.toLocaleString()}P (사용: {attendancePointsData.totalUsed?.toLocaleString() || 0}P)
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📋</span>
                    <div className="text-xs text-gray-600 font-semibold">출석 포인트</div>
                  </div>
                  <div className="text-sm text-gray-500">연동 안 됨</div>
                </div>
              )}
            </div>

            {/* 게임 통계 */}
            <div className="rounded-xl border-2 border-white/50 bg-white/80 backdrop-blur-sm p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="text-base font-bold text-gray-800">게임 통계</div>
                {/* 기간 선택 */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => handlePeriodChange("today")}
                    disabled={statsLoading}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                      period === "today"
                        ? "bg-white text-purple-600 shadow-sm font-bold"
                        : "text-gray-600 hover:text-gray-800"
                    } ${statsLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    오늘
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePeriodChange("week")}
                    disabled={statsLoading}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                      period === "week"
                        ? "bg-white text-purple-600 shadow-sm font-bold"
                        : "text-gray-600 hover:text-gray-800"
                    } ${statsLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    이번주
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePeriodChange("month")}
                    disabled={statsLoading}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                      period === "month"
                        ? "bg-white text-purple-600 shadow-sm font-bold"
                        : "text-gray-600 hover:text-gray-800"
                    } ${statsLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    이번달
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePeriodChange("all")}
                    disabled={statsLoading}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                      period === "all"
                        ? "bg-white text-purple-600 shadow-sm font-bold"
                        : "text-gray-600 hover:text-gray-800"
                    } ${statsLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    전체
                  </button>
                </div>
              </div>
              
              {/* 통계 영역 - 로딩 중일 때만 오버레이 표시, 높이 고정 */}
              <div className="relative min-h-[120px]">
                {statsLoading && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center border-2 border-gray-200">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl animate-spin">⏳</span>
                      <p className="text-xs text-gray-600 font-medium">통계 불러오는 중...</p>
                    </div>
                  </div>
                )}
                
                <div className={statsLoading ? "opacity-30" : ""}>
                  {stats.playCount === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      {period === "today" && "오늘 플레이 기록이 없습니다."}
                      {period === "week" && "이번 주 플레이 기록이 없습니다."}
                      {period === "month" && "이번 달 플레이 기록이 없습니다."}
                      {period === "all" && "플레이 기록이 없습니다."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">최고 점수</div>
                        <div className="text-xl font-bold text-green-600">{stats.bestScore.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">평균 점수</div>
                        <div className="text-xl font-bold text-blue-600">{stats.averageScore.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">플레이 횟수</div>
                        <div className="text-xl font-bold text-purple-600">{stats.playCount}회</div>
                      </div>
                      {stats.averageMaxTier !== null && stats.averageMaxTier !== undefined && (
                        <div>
                          <div className="text-xs text-gray-600 mb-1">평균 최대 레벨</div>
                          <div className="text-xl font-bold text-orange-600">{stats.averageMaxTier.toFixed(1)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 출석부 연동 안내 */}
            {!stats.memberId && (
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                <div className="text-sm text-blue-700">
                  💡 출석부 계정과 연동하면 출석 포인트를 사용할 수 있습니다.
                  <br />
                  출석부의 멤버 상세 페이지에서 연결할 수 있습니다.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
