// 라이어 게임 API 클라이언트

import { apiGet, apiPost, apiDelete, apiPatch } from "@/shared/api/client";
import { ApiError } from "@/shared/utils/error";
import type { PublicState, MeState } from "../types";

export type RoomInfo = {
  id: string;
  name: string | null;
  phase: string;
  playerCount: number;
  createdAt: string;
  updatedAt: string;
};

// 방 목록 조회
export async function listRooms(): Promise<RoomInfo[]> {
  const data = await apiGet<{ rooms: RoomInfo[] }>("/api/liar/rooms");
  return data.rooms ?? [];
}

// 방 생성
export async function createRoom(name?: string): Promise<{ roomId: string; name: string | null }> {
  return await apiPost<{ roomId: string; name: string | null }>("/api/liar/rooms", { name });
}

// 방 정보 조회
export async function getRoom(roomId: string): Promise<RoomInfo> {
  return await apiGet<RoomInfo>(`/api/liar/rooms/${roomId}`);
}

// 방 제목 수정
export async function updateRoomName(roomId: string, playerId: string, name: string): Promise<{ ok: boolean; name: string }> {
  return await apiPatch<{ ok: boolean; name: string }>(`/api/liar/rooms/${roomId}`, { name, playerId });
}

// 방 나가기
export async function leaveRoom(roomId: string, playerId: string): Promise<void> {
  await apiPost("/api/liar/leave", { roomId, playerId });
}

// 시간 연장
export async function extendGracePeriod(roomId: string, playerId: string): Promise<void> {
  await apiPost("/api/liar/extend-grace-period", { roomId, playerId });
}

// 방 삭제
export async function deleteRoom(roomId: string): Promise<void> {
  await apiDelete(`/api/liar/rooms/${roomId}`);
}

export async function fetchGameState(roomId: string, version?: number): Promise<PublicState | null> {
  try {
    const url = version !== undefined 
      ? `/api/liar/state?roomId=${encodeURIComponent(roomId)}&v=${version}` 
      : `/api/liar/state?roomId=${encodeURIComponent(roomId)}`;
    const res = await fetch(url, { method: "GET" });
    if (res.status === 204) return null; // no change
    if (!res.ok) {
      // 404 에러는 방이 삭제된 것으로 간주
      if (res.status === 404) {
        return {
          version: 0,
          phase: "LOBBY",
          hostPlayerId: null,
          players: [],
          roomName: null,
          roomDeleted: true,
          round: {
            index: 0,
            questionId: null,
            min: 0,
            max: 0,
            answersByPlayerId: {},
            voteCounts: {},
            questionChangeCount: 0,
            answeringEndsAt: null,
            discussEndsAt: null,
            tieDiscussEndsAt: null,
          },
          lastEliminatedPlayerId: null,
          lastEliminatedWasTroll: false,
          lastEliminatedRole: null,
          championPlayerId: null,
          winnerPlayerIds: [],
          finalChampionPlayerIds: [],
          autoRestartAt: null,
        };
      }
      const error = await res.json().catch(() => ({ error: "Failed to fetch game state" }));
      throw new ApiError(error.error || "잠시 후 다시 시도해주세요", res.status);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("잠시 후 다시 시도해주세요", 0);
  }
}

export async function fetchMe(playerId: string, roomId: string): Promise<MeState> {
  return await apiPost<MeState>("/api/liar/me", { playerId, roomId });
}

export async function joinGame(playerId: string, roomId: string, nickname: string): Promise<void> {
  await apiPost("/api/liar/join", { playerId, roomId, nickname });
}

export async function startGame(
  playerId: string,
  roomId: string,
  roleCounts?: {
    liarCount?: number;
    trollCount?: number;
    audienceCount?: number;
  }
): Promise<void> {
  await apiPost("/api/liar/start", { playerId, roomId, ...roleCounts });
}

export async function restartRound(playerId: string, roomId: string): Promise<void> {
  await apiPost("/api/liar/restart", { playerId, roomId });
}

export async function goToVoting(playerId: string, roomId: string): Promise<void> {
  await apiPost("/api/liar/vote-start", { playerId, roomId });
}

export async function submitVote(playerId: string, roomId: string, targetPlayerId: string): Promise<void> {
  await apiPost("/api/liar/vote", { playerId, roomId, targetPlayerId });
}

export async function submitAnswer(playerId: string, roomId: string, value: number): Promise<void> {
  await apiPost("/api/liar/submit-answer", { playerId, roomId, value });
}

export async function finalizeResult(playerId: string, roomId: string): Promise<void> {
  await apiPost("/api/liar/finalize", { playerId, roomId });
}

export async function resetGame(playerId: string, roomId: string): Promise<void> {
  await apiPost("/api/liar/reset", { playerId, roomId });
}
