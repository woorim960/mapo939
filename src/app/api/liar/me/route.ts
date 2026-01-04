import { NextResponse } from "next/server";
import { prisma, getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const runtime = "nodejs";

type Body = { playerId: string };

function addPlayerIfMissing(state: GameState, playerId: string, nickname: string): GameState {
  const exists = state.players.some(p => p.playerId === playerId);
  if (exists) return state;

  const isFirst = state.players.length === 0;
  const hostPlayerId = state.hostPlayerId ?? (isFirst ? playerId : null);

  const players = [
    ...state.players,
    {
      playerId,
      nickname,
      isAlive: true,
      isHost: isFirst,
      joinedAt: Date.now(),
    },
  ];

  return {
    ...state,
    hostPlayerId: hostPlayerId ?? state.hostPlayerId,
    players,
    phase: players.length >= 3 ? "PREP" : "LOBBY",
  };
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as Body;
  const playerId = body.playerId?.trim();

  if (!playerId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const p = prisma();

  // 1) DB에 플레이어 존재 확인
  const player = await p.liarPlayer.findUnique({ where: { id: playerId } });
  if (!player) {
    return NextResponse.json({ error: "unknown_player" }, { status: 404 });
  }

  // 2) 게임 state 조회
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion } = await getOrCreateGame();

    // 3) state에 없으면(예: 새로고침 후) 재삽입
    const next = addPlayerIfMissing(state, playerId, player.nickname);

    // 변경이 없으면 그대로 반환
    if (next === state) {
      const me = next.players.find(x => x.playerId === playerId) ?? null;
      return NextResponse.json({ ok: true, player, me, state: next });
    }

    // 변경이 있으면 CAS 업데이트
    const res = await updateGameCAS(dbVersion, next);
    if (res.ok) {
      const me = next.players.find(x => x.playerId === playerId) ?? null;
      return NextResponse.json({ ok: true, player, me, state: next });
    }
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
