import { NextResponse } from "next/server";
import { getOrCreateGame, updateGameCAS, prisma } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const runtime = "nodejs";

type Body = { playerId: string; roomId: string; value: number };

function isInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}

function canSubmit(state: GameState, playerId: string): { ok: true } | { ok: false; error: string } {
  if (state.phase !== "ANSWERING") return { ok: false, error: "not_answering" };

  const p = state.players.find(x => x.playerId === playerId);
  if (!p) return { ok: false, error: "not_in_game" };
  if (!p.isAlive) return { ok: false, error: "not_alive" };

  const already = Object.prototype.hasOwnProperty.call(state.round.answersByPlayerId, playerId);
  if (already) return { ok: false, error: "already_submitted" };

  return { ok: true };
}

function applyAnswer(state: GameState, playerId: string, value: number): GameState {
  return {
    ...state,
    round: {
      ...state.round,
      answersByPlayerId: {
        ...state.round.answersByPlayerId,
        [playerId]: value,
      },
    },
  };
}

function maybeAdvanceToReveal(state: GameState): GameState {
  // 생존자 전원이 제출하면 REVEAL로 전환
  const aliveIds = state.players.filter(p => p.isAlive).map(p => p.playerId);
  const answeredCount = aliveIds.filter(id => Object.prototype.hasOwnProperty.call(state.round.answersByPlayerId, id)).length;

  if (answeredCount !== aliveIds.length) return state;

  // REVEAL(답변 공개)로 전환하고, 곧바로 DISCUSS로 넘어가도 되지만
  // 현재 UI는 REVEAL을 렌더링하니 phase를 REVEAL로 둠.
  return {
    ...state,
    phase: "REVEAL",
    round: {
      ...state.round,
      answeringEndsAt: null,
      discussEndsAt: Date.now() + 3 * 60_000, // 3분 토론 타이머(원하면 REVEAL->DISCUSS API로 분리 가능)
    },
  };
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as Body;
  const playerId = body.playerId?.trim();
  const roomId = body.roomId?.trim();
  const value = body.value;

  if (!playerId || !roomId || !isInt(value)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // DB에 플레이어 존재 확인(유령 playerId 방지)
  try {
    const p = prisma();
    const player = await p.liarPlayer.findUnique({
      where: { id: playerId, gameId: roomId },
    });
    if (!player) return NextResponse.json({ error: "unknown_player" }, { status: 404 });
  } catch {
    // prisma 이슈여도 게임 진행은 막아야 하므로 500
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion } = await getOrCreateGame(roomId);

    const check = canSubmit(state, playerId);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    // 범위 체크 (서버에서도 다시)
    const min = state.round.min;
    const max = state.round.max;
    if (value < min || value > max) {
      return NextResponse.json({ error: "out_of_range" }, { status: 400 });
    }

    let next = applyAnswer(state, playerId, value);
    next = maybeAdvanceToReveal(next);

    const res = await updateGameCAS(roomId, dbVersion, next);
    if (res.ok) return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
