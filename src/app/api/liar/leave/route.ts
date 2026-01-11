import { NextResponse } from "next/server";
import { prisma, getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const runtime = "nodejs";

type Body = { playerId: string; roomId: string };

function removePlayerFromState(state: GameState, playerId: string): GameState {
  let players = (state.players ?? []).filter(p => p.playerId !== playerId);
  
  // 방장이 나가면 첫 번째 플레이어에게 방장 권한 이전
  let hostPlayerId = state.hostPlayerId;
  if (hostPlayerId === playerId && players.length > 0) {
    hostPlayerId = players[0].playerId;
    // 새 방장에게 isHost 플래그 설정, 기존 플레이어들의 isHost는 false로
    players = players.map((p, idx) => ({
      ...p,
      isHost: idx === 0,
    }));
  } else if (hostPlayerId === playerId && players.length === 0) {
    hostPlayerId = null;
  }

  // 플레이어가 모두 나가면 LOBBY로 전환
  const phase = players.length === 0 ? "LOBBY" : (players.length >= 3 ? state.phase : (state.phase === "LOBBY" || state.phase === "PREP" ? state.phase : "LOBBY"));

  return {
    ...state,
    hostPlayerId,
    players,
    phase,
    version: (state.version ?? 0) + 1,
  };
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Body | null;
  const playerId = body?.playerId?.trim();
  const roomId = body?.roomId?.trim();

  if (!playerId || !roomId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const p = prisma();

  // DB에서 플레이어 제거
  try {
    await p.liarPlayer.delete({
      where: { id: playerId, gameId: roomId },
    });
  } catch (err) {
    // DB에 없어도 게임 상태에서 제거는 시도
    console.error("Failed to delete player from DB:", err);
  }

  // 게임 상태에서 플레이어 제거 (CAS로 충돌 처리)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion } = await getOrCreateGame(roomId);
    
    // 플레이어가 게임 상태에 없으면 이미 나간 상태
    const playerExists = state.players?.some(p => p.playerId === playerId);
    if (!playerExists) {
      return NextResponse.json({ ok: true });
    }

    const next = removePlayerFromState(state, playerId);

    const res = await updateGameCAS(roomId, dbVersion, next);
    if (res.ok) return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
