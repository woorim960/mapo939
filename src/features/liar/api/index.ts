// 라이어 게임 API 클라이언트

import { apiGet, apiPost } from "@/shared/api/client";
import { ApiError } from "@/shared/utils/error";
import type { PublicState, MeState } from "../types";

export async function fetchGameState(version?: number): Promise<PublicState | null> {
  try {
    const url = version !== undefined ? `/api/liar/state?v=${version}` : "/api/liar/state";
    const res = await fetch(url, { method: "GET" });
    if (res.status === 204) return null; // no change
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Failed to fetch game state" }));
      throw new ApiError(error.error || "잠시 후 다시 시도해주세요", res.status);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("잠시 후 다시 시도해주세요", 0);
  }
}

export async function fetchMe(playerId: string): Promise<MeState> {
  return await apiPost<MeState>("/api/liar/me", { playerId });
}

export async function joinGame(playerId: string, nickname: string): Promise<void> {
  await apiPost("/api/liar/join", { playerId, nickname });
}

export async function startGame(
  playerId: string,
  roleCounts?: {
    liarCount?: number;
    trollCount?: number;
    audienceCount?: number;
  }
): Promise<void> {
  await apiPost("/api/liar/start", { playerId, ...roleCounts });
}

export async function restartRound(playerId: string): Promise<void> {
  await apiPost("/api/liar/restart", { playerId });
}

export async function goToVoting(playerId: string): Promise<void> {
  await apiPost("/api/liar/vote-start", { playerId });
}

export async function submitVote(playerId: string, targetPlayerId: string): Promise<void> {
  await apiPost("/api/liar/vote", { playerId, targetPlayerId });
}

export async function submitAnswer(playerId: string, value: number): Promise<void> {
  await apiPost("/api/liar/submit-answer", { playerId, value });
}

export async function finalizeResult(playerId: string): Promise<void> {
  await apiPost("/api/liar/finalize", { playerId });
}

export async function resetGame(playerId: string): Promise<void> {
  await apiPost("/api/liar/reset", { playerId });
}
