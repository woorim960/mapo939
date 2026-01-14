// 수박게임 플레이어 대시보드 컴포넌트

"use client";

import { useState, useEffect } from "react";
import { getPlayerStats, getAttendancePoints } from "../api";
import { Modal } from "@/shared/components/Modal";
import { ChangeMemberModal } from "./ChangeMemberModal";

type PlayerDashboardProps = {
  open: boolean;
  onClose: () => void;
  playerId: string;
  onToast?: (message: string) => void;
};

type Period = "today" | "week" | "month" | "all";

export function PlayerDashboard({ open, onClose, playerId, onToast }: PlayerDashboardProps) {
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
    gamePointsTotalEarned?: number;
    gamePointsTotalUsed?: number;
    attendancePoints?: number;
    memberId?: string;
  } | null>(null);
  const [attendancePointsData, setAttendancePointsData] = useState<{
    attendancePoints: number;
    connected: boolean;
    memberId?: string;
    memberName?: string | null;
    totalEarned?: number;
    totalUsed?: number;
    pendingRequest?: {
      memberId: string;
      memberName: string | null;
      createdAt: string;
    } | null;
  } | null>(null);
  const [showChangeMember, setShowChangeMember] = useState(false);

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
              <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🍉</span>
                  <div className="text-xs text-gray-600 font-semibold">수박게임 포인트</div>
                </div>
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {(stats.gamePoints ?? 1000).toLocaleString()}P
                </div>
                {/* 연결된 멤버 정보와 같은 높이를 위한 빈 공간 */}
                <div className="text-xs text-transparent mb-1" style={{ minHeight: '1.25rem' }}>
                  {/* 높이 맞추기용 빈 공간 */}
                </div>
                {stats.gamePointsTotalEarned !== undefined && (
                  <div className="text-xs text-gray-500 mt-auto">
                    총 {stats.gamePointsTotalEarned.toLocaleString()}P (사용: {stats.gamePointsTotalUsed?.toLocaleString() || 0}P)
                  </div>
                )}
              </div>

              {stats.memberId && attendancePointsData?.connected ? (
                <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📋</span>
                    <div className="text-xs text-gray-600 font-semibold">출석 포인트</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {attendancePointsData.attendancePoints.toLocaleString()}P
                  </div>
                  {attendancePointsData.memberName && (
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-blue-700 font-medium">
                        연결된 멤버: {attendancePointsData.memberName}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowChangeMember(true)}
                        className="text-xs px-2 py-1 rounded-md bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition-colors"
                      >
                        변경
                      </button>
                    </div>
                  )}
                  {attendancePointsData.totalEarned !== undefined && (
                    <div className="text-xs text-gray-500 mt-auto">
                      총 {attendancePointsData.totalEarned.toLocaleString()}P (사용: {attendancePointsData.totalUsed?.toLocaleString() || 0}P)
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📋</span>
                    <div className="text-xs text-gray-600 font-semibold">출석 포인트</div>
                  </div>
                  {attendancePointsData?.pendingRequest ? (
                    <>
                      <div className="text-sm text-amber-600 font-semibold mb-1">
                        승인 대기중
                      </div>
                      <div className="text-xs text-gray-600 mb-3">
                        {attendancePointsData.pendingRequest.memberName} 멤버 연결 요청 중
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowChangeMember(true)}
                        className="text-xs px-3 py-1.5 rounded-md bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors mt-auto"
                      >
                        다른 멤버와 연동하기
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-gray-500 mb-3">연동 안 됨</div>
                      <button
                        type="button"
                        onClick={() => setShowChangeMember(true)}
                        className="text-xs px-3 py-1.5 rounded-md bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors mt-auto"
                      >
                        멤버 연결하기
                      </button>
                    </>
                  )}
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

          </>
        )}
      </div>

      {/* 멤버 변경 모달 */}
      {stats && (
        <ChangeMemberModal
          open={showChangeMember}
          onClose={() => setShowChangeMember(false)}
          currentMemberName={attendancePointsData?.memberName || null}
          currentMemberId={stats.memberId}
          playerId={playerId}
          playerNickname={stats.nickname}
          onSuccess={() => {
            // 데이터 다시 로드
            loadInitialData();
          }}
          onToast={(message) => {
            if (onToast) {
              onToast(message);
            } else {
              console.log(message);
            }
          }}
        />
      )}
    </Modal>
  );
}
