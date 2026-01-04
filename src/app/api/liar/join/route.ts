import { NextResponse } from "next/server";
import { prisma, getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const runtime = "nodejs";

type Body = { playerId: string; nickname: string };

function now(): number {
  return Date.now();
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as Body;
  const playerId = body.playerId;
  const nickname = body.nickname?.trim();

  if (!playerId || !nickname) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // 닉네임 중복 불가 (DB unique)
  const p = prisma();
  const exists = await p.liarPlayer.findUnique({ where: { nickname } });
  if (exists) return NextResponse.json({ error: "nickname_taken" }, { status: 409 });

  // 플레이어 row 생성(점수 저장)
  await p.liarPlayer.create({ data: { id: playerId, nickname, score: 0 } });

  // 게임 state에 참가자로 추가 (CAS로 충돌 처리)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion } = await getOrCreateGame();
    const next = addPlayerToState(state, playerId, nickname);

    const res = await updateGameCAS(dbVersion, next);
    if (res.ok) return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}

function addPlayerToState(state: GameState, playerId: string, nickname: string): GameState {
  const already = state.players.some(p => p.playerId === playerId);
  if (already) return state;

  const isFirst = state.players.length === 0;
  const hostPlayerId = state.hostPlayerId ?? (isFirst ? playerId : null);

  const players = [
    ...state.players,
    {
      playerId,
      nickname,
      isAlive: true,
      isHost: isFirst,
      joinedAt: now(),
    },
  ];

  return {
    ...state,
    hostPlayerId: hostPlayerId ?? state.hostPlayerId,
    players,
    phase: players.length >= 3 ? "PREP" : "LOBBY",
  };
}
 