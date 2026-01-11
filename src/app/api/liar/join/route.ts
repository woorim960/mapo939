import { NextResponse } from "next/server";
import { prisma, getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const runtime = "nodejs";

type Body = { playerId: string; nickname: string; roomId: string };

function now(): number {
  return Date.now();
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as Body;
  const playerId = body.playerId;
  const nickname = body.nickname?.trim();
  const roomId = body.roomId?.trim();

  // 입력값 검증
  if (!playerId || !roomId) {
    return NextResponse.json({ error: "invalid_input", message: "필수 정보가 누락되었습니다" }, { status: 400 });
  }

  if (!nickname) {
    return NextResponse.json({ error: "nickname_required", message: "닉네임을 입력해주세요" }, { status: 400 });
  }

  if (nickname.length < 1) {
    return NextResponse.json({ error: "nickname_too_short", message: "닉네임은 최소 1자 이상이어야 합니다" }, { status: 400 });
  }

  if (nickname.length > 20) {
    return NextResponse.json({ error: "nickname_too_long", message: "닉네임은 20자 이하여야 합니다" }, { status: 400 });
  }

  // 공백만 있는 경우는 이미 trim으로 처리되지만, 추가 검증
  if (nickname.length === 0 || /^\s+$/.test(nickname)) {
    return NextResponse.json({ error: "nickname_invalid", message: "닉네임은 공백만으로 구성될 수 없습니다" }, { status: 400 });
  }

  // 방 존재 확인
  const p = prisma();
  const game = await p.liarGame.findUnique({ where: { id: roomId } });
  if (!game) {
    return NextResponse.json({ 
      error: "room_not_found", 
      message: "방이 존재하지 않거나 삭제되었습니다." 
    }, { status: 404 });
  }

  // 닉네임 중복 불가 (방별 unique)
  const exists = await p.liarPlayer.findUnique({
    where: { gameId_nickname: { gameId: roomId, nickname } },
  });
  if (exists) {
    return NextResponse.json({ 
      error: "nickname_taken", 
      message: `"${nickname}"은(는) 이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.` 
    }, { status: 409 });
  }

  // 플레이어 row 생성(점수 저장)
  await p.liarPlayer.create({
    data: { id: playerId, gameId: roomId, nickname, score: 0 },
  });

  // 게임 state에 참가자로 추가 (CAS로 충돌 처리)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let state: GameState;
    let dbVersion: number;
    try {
      const result = await getOrCreateGame(roomId);
      state = result.state;
      dbVersion = result.dbVersion;
    } catch (err) {
      // 방이 없으면 404 반환
      if (err instanceof Error && err.message.includes("Room not found")) {
        return NextResponse.json({ 
          error: "room_not_found", 
          message: "방이 존재하지 않거나 삭제되었습니다." 
        }, { status: 404 });
      }
      continue;
    }
    const next = addPlayerToState(state, playerId, nickname);

    const res = await updateGameCAS(roomId, dbVersion, next);
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
 