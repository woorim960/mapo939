import { NextResponse } from "next/server";
import { prisma, getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const runtime = "nodejs";

const FINAL_SCORE = 300;

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
  score: number;
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

  winnerPlayerIds: string[];
  finalChampionPlayerIds: string[];

  // ✅ 자동 새게임 시작 시간(프론트 카운트다운용)
  autoRestartAt: number | null;
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

function computeFinalChampions(state: GameState, scoreById: Record<string, number>): string[] {
  const ids = (state.players ?? []).map(p => p.playerId);
  return ids.filter(id => (scoreById[id] ?? 0) >= FINAL_SCORE);
}

function toPublicState(state: GameState, scoreById: Record<string, number>): PublicState {
  const voteCounts = computeVoteCounts((state.round as any)?.votesByVoterId);
  const questionChangeCount = (state.round as any)?.questionChangeByPlayerId
    ? Object.keys((state.round as any).questionChangeByPlayerId).length
    : 0;

  const finalChampionPlayerIds = computeFinalChampions(state, scoreById);

  return {
    version: state.version ?? 0,
    phase: (state.phase ?? "LOBBY") as Phase,
    hostPlayerId: state.hostPlayerId ?? null,
    players: (state.players ?? []).map(p => ({
      playerId: p.playerId,
      nickname: p.nickname,
      isAlive: Boolean((p as any).isAlive),
      isHost: Boolean((p as any).isHost),
      score: scoreById[p.playerId] ?? 0,
    })),
    round: {
      index: (state.round as any)?.index ?? 0,
      questionId: (state.round as any)?.questionId ?? null,
      min: (state.round as any)?.min ?? 0,
      max: (state.round as any)?.max ?? 0,
      answersByPlayerId: (state.round as any)?.answersByPlayerId ?? {},
      voteCounts,
      questionChangeCount,
      answeringEndsAt: (state.round as any)?.answeringEndsAt ?? null,
      discussEndsAt: (state.round as any)?.discussEndsAt ?? null,
      tieDiscussEndsAt: (state.round as any)?.tieDiscussEndsAt ?? null,
    },
    lastEliminatedPlayerId: (state as any).lastEliminatedPlayerId ?? null,
    lastEliminatedWasTroll: Boolean((state as any).lastEliminatedWasTroll),
    championPlayerId: (state as any).championPlayerId ?? null,
    winnerPlayerIds: (state as any).winnerPlayerIds ?? [],
    finalChampionPlayerIds,
    autoRestartAt: (state as any).autoRestartAt ?? null,
  };
}

function shouldAutoAdvanceToVoting(state: GameState, now: number): boolean {
  const phase = state.phase;

  if (phase === "VOTING" || phase === "RESULT" || phase === "GAME_OVER") return false;

  const round = state.round as any;

  if (phase === "DISCUSS") {
    const endsAt: number | null = round?.discussEndsAt ?? null;
    return Boolean(endsAt && now >= endsAt);
  }

  if (phase === "TIE_DISCUSS") {
    const endsAt: number | null = round?.tieDiscussEndsAt ?? null;
    return Boolean(endsAt && now >= endsAt);
  }

  return false;
}

function advanceToVoting(state: GameState): GameState {
  const round = (state.round ?? ({} as any)) as any;

  if (state.phase === "VOTING") return state;

  return {
    ...state,
    phase: "VOTING",
    version: (state.version ?? 0) + 1,
    round: {
      ...round,
      votesByVoterId: {},
      discussEndsAt: null,
      tieDiscussEndsAt: null,
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

function restartStateKeepPlayersAndResetRound(state: GameState): GameState {
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

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const v = Number(url.searchParams.get("v") ?? "0") || 0;
  const now = Date.now();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion } = await getOrCreateGame();
    const ids = (state.players ?? []).map(p => p.playerId);

    // 점수는 매번 DB에서
    const scoreMap = await buildScoreMap(ids);

    // ✅ GAME_OVER 자동 리셋 처리
    if (state.phase === "GAME_OVER") {
      const finalChampions = computeFinalChampions(state, scoreMap);
      const autoRestartAt = (state as any).autoRestartAt as number | null | undefined;

      // 1) autoRestartAt이 없으면(과거 상태/예외) 지금부터 4.5초 예약을 박아줌
      if (!autoRestartAt) {
        const nextSetTimer: GameState = {
          ...state,
          version: (state.version ?? 0) + 1,
          autoRestartAt: now + 4500,
        };

        const r = await updateGameCAS(dbVersion, nextSetTimer);
        if (!r.ok) continue;

        // 예약 박은 상태 반환
        return NextResponse.json(toPublicState(nextSetTimer, scoreMap));
      }

      // 2) 예약 시간이 지났고, 최종 우승자가 있다면 → 점수 0 + 새 게임으로 리셋
      if (finalChampions.length > 0 && now >= autoRestartAt) {
        const p = prisma();

        // 점수 전원 0 리셋(현재 방 참가자)
        if (ids.length > 0) {
          await p.liarPlayer.updateMany({
            where: { id: { in: ids } },
            data: { score: 0 },
          });
        }

        const next = restartStateKeepPlayersAndResetRound(state);
        next.version = (state.version ?? 0) + 1;

        const r = await updateGameCAS(dbVersion, next);
        if (!r.ok) continue;

        const scoreMapAfter = await buildScoreMap(ids);
        return NextResponse.json(toPublicState(next, scoreMapAfter));
      }

      // 아직 시간 전이면 그냥 GAME_OVER 상태 반환(프론트가 축하 UI 띄움)
      return NextResponse.json(toPublicState(state, scoreMap));
    }

    // ✅ 버전이 변하지 않았고 + 자동 전환 조건도 아니면 204
    if ((state.version ?? 0) <= v) {
      if (!shouldAutoAdvanceToVoting(state, now)) {
        return new Response(null, { status: 204 });
      }
    }

    // ✅ 자동 전환 조건이면: VOTING으로 CAS 업데이트 후 그 상태 반환
    if (shouldAutoAdvanceToVoting(state, now)) {
      const next = advanceToVoting(state);
      const res = await updateGameCAS(dbVersion, next);
      if (!res.ok) continue;

      const scoreMap2 = await buildScoreMap((next.players ?? []).map(p => p.playerId));
      return NextResponse.json(toPublicState(next, scoreMap2));
    }

    // ✅ 그 외엔 현재 state 그대로 반환
    return NextResponse.json(toPublicState(state, scoreMap));
  }

  // CAS 충돌 fallback
  const { state } = await getOrCreateGame();
  const ids = (state.players ?? []).map(p => p.playerId);
  const scoreMap = await buildScoreMap(ids);
  return NextResponse.json(toPublicState(state, scoreMap));
}
