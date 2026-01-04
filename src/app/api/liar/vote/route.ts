import { NextResponse } from "next/server";
import { getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const runtime = "nodejs";

type Body = { playerId: string; targetPlayerId: string };

function isAlive(state: GameState, playerId: string): boolean {
  return Boolean(state.players?.find(p => p.playerId === playerId)?.isAlive);
}

function existsPlayer(state: GameState, playerId: string): boolean {
  return Boolean(state.players?.some(p => p.playerId === playerId));
}

function isAliveTarget(state: GameState, targetPlayerId: string): boolean {
  const t = state.players?.find(p => p.playerId === targetPlayerId);
  return Boolean(t && t.isAlive);
}

function allAliveVoted(state: GameState, votesByVoterId: Record<string, string>): boolean {
  const aliveIds = (state.players ?? []).filter(p => p.isAlive).map(p => p.playerId);
  if (aliveIds.length === 0) return false;
  return aliveIds.every(id => Object.prototype.hasOwnProperty.call(votesByVoterId, id));
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Body | null;
  const playerId = body?.playerId?.trim();
  const targetPlayerId = body?.targetPlayerId?.trim();

  if (!playerId || !targetPlayerId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion } = await getOrCreateGame();

    // phase 체크
    if (state.phase !== "VOTING") {
      return NextResponse.json({ error: "not_voting", phase: state.phase }, { status: 400 });
    }

    // 투표자 검증
    if (!existsPlayer(state, playerId)) {
      return NextResponse.json({ error: "not_in_game" }, { status: 404 });
    }
    if (!isAlive(state, playerId)) {
      return NextResponse.json({ error: "not_alive" }, { status: 403 });
    }

    // 타겟 검증
    if (playerId === targetPlayerId) {
      return NextResponse.json({ error: "cannot_vote_self" }, { status: 400 });
    }
    if (!existsPlayer(state, targetPlayerId)) {
      return NextResponse.json({ error: "invalid_target" }, { status: 404 });
    }
    if (!isAliveTarget(state, targetPlayerId)) {
      return NextResponse.json({ error: "target_not_alive" }, { status: 400 });
    }

    const prevVotes = state.round?.votesByVoterId ?? {};
    if (Object.prototype.hasOwnProperty.call(prevVotes, playerId)) {
      return NextResponse.json({ error: "already_voted" }, { status: 409 });
    }

    const nextVotes = {
      ...prevVotes,
      [playerId]: targetPlayerId,
    };

    // ✅ 핵심: 전원 투표 완료면 RESULT로 phase 전환
    const shouldGoResult = allAliveVoted(state, nextVotes);

    const next: GameState = {
      ...state,
      phase: shouldGoResult ? "RESULT" : state.phase,
      round: {
        ...state.round,
        votesByVoterId: nextVotes,
      },
      version: (state.version ?? 0) + 1,
    };

    const res = await updateGameCAS(dbVersion, next);
    if (res.ok) {
      return NextResponse.json({ ok: true, phase: next.phase });
    }
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
