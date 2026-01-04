import { NextResponse } from "next/server";
import { getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const runtime = "nodejs";

type Body = { playerId: string };

function restartStateKeepPlayers(state: GameState): GameState {
  const now = Date.now();

  // 플레이어는 유지, 다만 라운드 관련 상태만 초기화
  const players = state.players.map(p => ({
    ...p,
    isAlive: true, // 재시작이면 전원 생존으로 복구
    // isHost는 유지
  }));

  // 방장 아이디 유지(없으면 null)
  const hostPlayerId = state.hostPlayerId ?? null;

  return {
    ...state,
    phase: players.length >= 3 ? "PREP" : "LOBBY",
    createdAt: state.createdAt ?? now,
    hostPlayerId,
    players,
    usedQuestionIds: [], // ✅ 한 게임(최종승리 전) 중복 금지였는데 "재시작"은 새 게임으로 치니 초기화
    round: {
      index: 0,
      questionId: null,
      min: 0,
      max: 0,
      rolesByPlayerId: {},
      answersByPlayerId: {},
      votesByVoterId: {},
      questionChangeByPlayerId: {},
      answeringEndsAt: null,
      discussEndsAt: null,
      tieDiscussEndsAt: null,
    },
    lastEliminatedPlayerId: null,
    lastEliminatedWasTroll: false,
    championPlayerId: null,
  };
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as Body;
  const playerId = body.playerId?.trim();

  if (!playerId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion } = await getOrCreateGame();

    // ✅ 방장만 가능
    if (!state.hostPlayerId || state.hostPlayerId !== playerId) {
      return NextResponse.json({ error: "only_host" }, { status: 403 });
    }

    // 플레이어 없으면 의미 없음
    if (state.players.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const next = restartStateKeepPlayers(state);
    const res = await updateGameCAS(dbVersion, next);
    if (res.ok) return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
