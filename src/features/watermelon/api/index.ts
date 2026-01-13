// 수박게임 API 클라이언트

import { apiGet, apiPost } from "@/shared/api/client";

export type WatermelonPlayer = {
  id: string;
  nickname: string;
  bestScore: number;
  playCount: number;
  averageScore: number;
  averageMaxTier?: number;
  recentScores?: number[];
};

export type LeaderboardEntry = {
  id: string;
  nickname: string;
  bestScore: number;
  averageScore: number;
  playCount: number;
};

// 플레이어 생성/조회
export async function createOrGetPlayer(nickname: string, password: string): Promise<WatermelonPlayer> {
  const data = await apiPost<{ player: WatermelonPlayer }>("/api/watermelon/player", {
    nickname,
    password,
  });
  return data.player;
}

// 점수 저장
export async function saveScore(playerId: string, score: number, sessionId?: string, maxTier?: number): Promise<void> {
  await apiPost<{ success: boolean }>("/api/watermelon/score", {
    playerId,
    score,
    sessionId,
    maxTier,
  });
}

// 플레이어 통계 조회
export async function getPlayerStats(playerId: string): Promise<WatermelonPlayer> {
  const data = await apiGet<{ player: WatermelonPlayer }>(
    `/api/watermelon/stats?playerId=${encodeURIComponent(playerId)}`
  );
  return data.player;
}

// 리더보드 조회
export async function getLeaderboard(period: "today" | "week" | "month" | "all" = "all"): Promise<LeaderboardEntry[]> {
  const data = await apiGet<{ leaderboard: LeaderboardEntry[] }>(
    `/api/watermelon/stats?period=${encodeURIComponent(period)}`
  );
  return data.leaderboard;
}
