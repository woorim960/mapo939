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

// 아이템 타입 정의
export type WatermelonItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  effectType: string;
  effectValue: any;
  icon: string | null;
};

export type InventoryItem = {
  itemId: string;
  quantity: number;
  item: WatermelonItem;
};

// 아이템 목록 조회
export async function getItems(): Promise<WatermelonItem[]> {
  const data = await apiGet<{ items: WatermelonItem[] }>("/api/watermelon/items");
  return data.items;
}

// 플레이어 인벤토리 조회
export async function getInventory(playerId: string): Promise<InventoryItem[]> {
  const data = await apiGet<{ inventory: InventoryItem[] }>(
    `/api/watermelon/items/inventory?playerId=${encodeURIComponent(playerId)}`
  );
  return data.inventory;
}

// 결제 요청 (주문 생성)
export async function requestPayment(playerId: string, itemId: string, quantity: number = 1): Promise<{ orderId: string; amount: number; paymentId: string }> {
  const data = await apiPost<{ orderId: string; amount: number; paymentId: string }>("/api/watermelon/payments/request", {
    playerId,
    itemId,
    quantity,
  });
  return data;
}

// 결제 승인
export async function approvePayment(paymentKey: string, orderId: string, amount: number): Promise<{ success: boolean; purchaseId: string; item: WatermelonItem; quantity: number }> {
  const data = await apiPost<{ success: boolean; purchaseId: string; item: WatermelonItem; quantity: number }>("/api/watermelon/payments/approve", {
    paymentKey,
    orderId,
    amount,
  });
  return data;
}
