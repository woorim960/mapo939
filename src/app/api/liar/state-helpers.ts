// state/route.ts에서 사용하는 헬퍼 함수들을 공유하기 위한 파일

import { prisma, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const FINAL_SCORE = 300;

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

export type PublicState = {
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
  autoRestartAt: number | null;
};

export function computeVoteCounts(votesByVoterId: Record<string, string> | undefined): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!votesByVoterId) return counts;

  for (const voterId of Object.keys(votesByVoterId)) {
    const targetId = votesByVoterId[voterId];
    if (!targetId) continue;
    counts[targetId] = (counts[targetId] ?? 0) + 1;
  }
  return counts;
}

export function computeFinalChampions(state: GameState, scoreById: Record<string, number>): string[] {
  const ids = (state.players ?? []).map((p) => p.playerId);
  return ids.filter((id) => (scoreById[id] ?? 0) >= FINAL_SCORE);
}

export function toPublicState(state: GameState, scoreById: Record<string, number>): PublicState {
  const voteCounts = computeVoteCounts((state.round as any)?.votesByVoterId);
  const questionChangeCount = (state.round as any)?.questionChangeByPlayerId
    ? Object.keys((state.round as any).questionChangeByPlayerId).length
    : 0;

  const finalChampionPlayerIds = computeFinalChampions(state, scoreById);

  return {
    version: state.version ?? 0,
    phase: (state.phase ?? "LOBBY") as Phase,
    hostPlayerId: state.hostPlayerId ?? null,
    players: (state.players ?? []).map((p) => ({
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

export function shouldAutoAdvanceToVoting(state: GameState, now: number): boolean {
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

export function advanceToVoting(state: GameState): GameState {
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

export function restartStateKeepPlayersAndResetRound(state: GameState): GameState {
  const now = Date.now();

  const players = (state.players ?? []).map((p) => ({
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

export async function buildScoreMap(playerIds: string[]): Promise<Record<string, number>> {
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
