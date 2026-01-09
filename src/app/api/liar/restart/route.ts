import { NextResponse } from "next/server";
import { prisma, getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const runtime = "nodejs";

type Body = { playerId: string };

const FINAL_SCORE = 300;

function restartStateKeepPlayers(state: GameState): GameState {
  const now = Date.now();

  const players = (state.players ?? []).map(p => ({
    ...p,
    isAlive: true,
  }));

  const hostPlayerId = state.hostPlayerId ?? null;

  return {
    ...state,
    phase: players.length >= 3 ? "PREP" : "LOBBY",
    createdAt: state.createdAt ?? now,
    hostPlayerId,
    players,
    usedQuestionIds: [],
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
    winnerPlayerIds: [],
    trollDeathRewarded: false,
    autoRestartAt: null,
  };
}

async function buildScoreMap(playerIds: string[]): Promise<Record<string, number>> {
  if (playerIds.length === 0) return {};
  const p = prisma();
  const rows = await p.liarPlayer.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, score: true },
  });
  const map: Record<string, number> = {};
  for (const r of rows) map[r.id] = r.score ?? 0;
  return map;
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Body | null;
  const playerId = body?.playerId?.trim();

  if (!playerId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion } = await getOrCreateGame();

    if (!state.hostPlayerId || state.hostPlayerId !== playerId) {
      return NextResponse.json({ error: "only_host" }, { status: 403 });
    }

    if ((state.players ?? []).length === 0) {
      return NextResponse.json({ ok: true });
    }

    // ✅ 300점 달성자가 있으면 점수 전원 0
    const ids = (state.players ?? []).map(p => p.playerId);
    const scoreMap = await buildScoreMap(ids);
    const shouldResetScores = ids.some(id => (scoreMap[id] ?? 0) >= FINAL_SCORE);

    if (shouldResetScores && ids.length > 0) {
      const p = prisma();
      await p.liarPlayer.updateMany({
        where: { id: { in: ids } },
        data: { score: 0 },
      });
    }

    const next = restartStateKeepPlayers(state);
    next.version = (state.version ?? 0) + 1;

    const res = await updateGameCAS(dbVersion, next);
    if (res.ok) return NextResponse.json({ ok: true, scoreReset: shouldResetScores });
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
