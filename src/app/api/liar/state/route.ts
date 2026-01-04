import { NextResponse } from "next/server";
import { prisma, getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const runtime = "nodejs";

type Phase =
  | "LOBBY"
  | "PREP"
  | "ANSWERING"
  | "REVEAL"
  | "DISCUSS"
  | "VOTING"
  | "TIE_DISCUSS"
  | "RESULT"
  | "GAME_OVER";

type PublicPlayer = {
  playerId: string;
  nickname: string;
  isAlive: boolean;
  isHost: boolean;
  score: number; // ✅ 추가
};

type PublicState = {
  version: number;
  phase: Phase;
  hostPlayerId: string | null;
  players: PublicPlayer[];
  round: {
    index: number;
    questionId: string | null;
    min: number;
    max: number;
    answersByPlayerId: Record<string, number>;
    voteCounts: Record<string, number>;
    questionChangeCount: number;
    answeringEndsAt: number | null;
    discussEndsAt: number | null;
    tieDiscussEndsAt: number | null;
  };
  lastEliminatedPlayerId: string | null;
  lastEliminatedWasTroll: boolean;
  championPlayerId: string | null;

  // ✅ 승리자 전체 표시용 (GameState에 winnerPlayerIds 저장한다고 가정)
  winnerPlayerIds: string[];
};

function computeVoteCounts(votesByVoterId: Record<string, string> | undefined): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!votesByVoterId) return counts;
  for (const voterId of Object.keys(votesByVoterId)) {
    const targetId = votesByVoterId[voterId];
    if (!targetId) continue;
    counts[targetId] = (counts[targetId] ?? 0) + 1;
  }
  return counts;
}

function toPublicState(state: GameState, scoreById: Record<string, number>): PublicState {
  const voteCounts = computeVoteCounts(state.round?.votesByVoterId);
  const questionChangeCount = state.round?.questionChangeByPlayerId
    ? Object.keys(state.round.questionChangeByPlayerId).length
    : 0;

  return {
    version: state.version ?? 0,
    phase: (state.phase ?? "LOBBY") as Phase,
    hostPlayerId: state.hostPlayerId ?? null,
    players: (state.players ?? []).map(p => ({
      playerId: p.playerId,
      nickname: p.nickname,
      isAlive: Boolean(p.isAlive),
      isHost: Boolean(p.isHost),
      score: scoreById[p.playerId] ?? 0,
    })),
    round: {
      index: state.round?.index ?? 0,
      questionId: state.round?.questionId ?? null,
      min: state.round?.min ?? 0,
      max: state.round?.max ?? 0,
      answersByPlayerId: state.round?.answersByPlayerId ?? {},
      voteCounts,
      questionChangeCount,
      answeringEndsAt: state.round?.answeringEndsAt ?? null,
      discussEndsAt: state.round?.discussEndsAt ?? null,
      tieDiscussEndsAt: state.round?.tieDiscussEndsAt ?? null,
    },
    lastEliminatedPlayerId: state.lastEliminatedPlayerId ?? null,
    lastEliminatedWasTroll: Boolean(state.lastEliminatedWasTroll),
    championPlayerId: state.championPlayerId ?? null,
    winnerPlayerIds: state.winnerPlayerIds ?? [],
  };
}

function shouldAutoAdvanceToVoting(state: GameState, now: number): boolean {
  if (state.phase === "DISCUSS") {
    const endsAt = state.round?.discussEndsAt ?? null;
    return Boolean(endsAt && endsAt <= now);
  }
  if (state.phase === "TIE_DISCUSS") {
    const endsAt = state.round?.tieDiscussEndsAt ?? null;
    return Boolean(endsAt && endsAt <= now);
  }
  return false;
}

function advanceToVoting(state: GameState): GameState {
  return {
    ...state,
    phase: "VOTING",
    round: {
      ...state.round,
      discussEndsAt: null,
      tieDiscussEndsAt: null,
      // ✅ 자동으로 투표 넘어갈 때도 재논의 이후면 남은 투표 제거가 안전
      votesByVoterId: {},
    },
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

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const v = Number(url.searchParams.get("v") ?? "0") || 0;
  const now = Date.now();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion } = await getOrCreateGame();

    if ((state.version ?? 0) <= v) {
      if (!shouldAutoAdvanceToVoting(state, now)) {
        return new Response(null, { status: 204 });
      }
    }

    if (shouldAutoAdvanceToVoting(state, now)) {
      const next = advanceToVoting(state);
      const res = await updateGameCAS(dbVersion, next);
      if (!res.ok) continue;

      const ids = (next.players ?? []).map(p => p.playerId);
      const scoreMap = await buildScoreMap(ids);
      return NextResponse.json(toPublicState(next, scoreMap));
    }

    const ids = (state.players ?? []).map(p => p.playerId);
    const scoreMap = await buildScoreMap(ids);
    return NextResponse.json(toPublicState(state, scoreMap));
  }

  const { state } = await getOrCreateGame();
  const ids = (state.players ?? []).map(p => p.playerId);
  const scoreMap = await buildScoreMap(ids);
  return NextResponse.json(toPublicState(state, scoreMap));
}
