// 라이어 게임 API 클라이언트

import type { PublicState, MeState } from "../types";

export async function fetchGameState(version?: number): Promise<PublicState | null> {
  const url = version !== undefined ? `/api/liar/state?v=${version}` : "/api/liar/state";
  const res = await fetch(url, { method: "GET" });
  if (res.status === 204) return null; // no change
  if (!res.ok) throw new Error("Failed to fetch game state");
  return await res.json();
}

export async function fetchMe(playerId: string): Promise<MeState> {
  const res = await fetch("/api/liar/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId }),
  });
  if (!res.ok) throw new Error("Failed to fetch me");
  return await res.json();
}

export async function joinGame(playerId: string, nickname: string): Promise<Response> {
  return fetch("/api/liar/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, nickname }),
  });
}

export async function startGame(playerId: string, roleCounts?: {
  liarCount?: number;
  trollCount?: number;
  audienceCount?: number;
}): Promise<Response> {
  return fetch("/api/liar/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, ...roleCounts }),
  });
}

export async function restartRound(playerId: string): Promise<Response> {
  return fetch("/api/liar/restart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId }),
  });
}

export async function goToVoting(playerId: string): Promise<Response> {
  return fetch("/api/liar/vote-start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId }),
  });
}

export async function submitVote(playerId: string, targetPlayerId: string): Promise<Response> {
  return fetch("/api/liar/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, targetPlayerId }),
  });
}

export async function submitAnswer(playerId: string, value: number): Promise<Response> {
  return fetch("/api/liar/submit-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, value }),
  });
}

export async function finalizeResult(playerId: string): Promise<Response> {
  return fetch("/api/liar/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId }),
  });
}

export async function resetGame(playerId: string): Promise<Response> {
  return fetch("/api/liar/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId }),
  });
}
