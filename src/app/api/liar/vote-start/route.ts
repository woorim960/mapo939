import { NextResponse } from "next/server";
import { getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const runtime = "nodejs";

type Body = { playerId: string };

function isAlive(state: GameState, playerId: string): boolean {
  return Boolean(state.players?.find(p => p.playerId === playerId)?.isAlive);
}

function canStartVoting(phase: GameState["phase"]): boolean {
  return phase === "REVEAL" || phase === "DISCUSS" || phase === "TIE_DISCUSS" || phase === "VOTING";
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Body | null;
  const playerId = body?.playerId?.trim();

  if (!playerId) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion } = await getOrCreateGame();

    if (!canStartVoting(state.phase)) {
      return NextResponse.json({ error: "not_allowed_phase", phase: state.phase }, { status: 400 });
    }

    if (state.phase === "VOTING") {
      return NextResponse.json({ ok: true, phase: "VOTING" });
    }

    const next: GameState = {
      ...state,
      phase: "VOTING",
      round: {
        ...state.round,
        discussEndsAt: null,
        tieDiscussEndsAt: null,
        // ✅ 핵심: 투표 재시작이면 무조건 초기화(안전)
        votesByVoterId: {},
      },
      version: (state.version ?? 0) + 1,
    };

    const res = await updateGameCAS(dbVersion, next);
    if (res.ok) return NextResponse.json({ ok: true, phase: "VOTING" });
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
