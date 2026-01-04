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

// ✅ 언제 "자동으로 VOTING으로 넘어가야 하는가?"
function shouldAutoAdvanceToVoting(state: GameState, now: number): boolean {
  const phase = state.phase;

  // 이미 VOTING 이상이면 자동 전환 필요 없음
  if (phase === "VOTING" || phase === "RESULT" || phase === "GAME_OVER") return false;

  const round = state.round as any;

  // DISCUSS 끝나면 자동으로 VOTING
  if (phase === "DISCUSS") {
    const endsAt: number | null = round?.discussEndsAt ?? null;
    return Boolean(endsAt && now >= endsAt);
  }

  // TIE_DISCUSS 끝나면 자동으로 VOTING
  if (phase === "TIE_DISCUSS") {
    const endsAt: number | null = round?.tieDiscussEndsAt ?? null;
    return Boolean(endsAt && now >= endsAt);
  }

  return false;
}

// ✅ VOTING으로 상태 전환 (CAS 저장용 next state 생성)
function advanceToVoting(state: GameState): GameState {
  const round = (state.round ?? ({} as any)) as any;

  // 이미 VOTING이면 그대로 반환
  if (state.phase === "VOTING") return state;

  return {
    ...state,
    phase: "VOTING",
    version: (state.version ?? 0) + 1,
    round: {
      ...round,

      // ✅ 투표 시작 시 투표기록 초기화 (재논의/재투표 케이스 포함)
      votesByVoterId: {},

      // (선택) 토론 타이머 값은 남겨도 되고 null로 지워도 됨. 혼동 방지로 null 권장
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

function autoAdvance(state: GameState): GameState {
  const now = Date.now();
  const round = state.round ?? ({} as any);

  // DISCUSS 끝 -> VOTING
  if (state.phase === "DISCUSS" && round.discussEndsAt && now >= round.discussEndsAt) {
    return {
      ...state,
      phase: "VOTING",
      version: (state.version ?? 0) + 1,
      round: {
        ...round,
        votesByVoterId: round.votesByVoterId ?? {}, // 이미 있으면 유지
      },
    };
  }

  // TIE_DISCUSS 끝 -> VOTING
  if (state.phase === "TIE_DISCUSS" && round.tieDiscussEndsAt && now >= round.tieDiscussEndsAt) {
    return {
      ...state,
      phase: "VOTING",
      version: (state.version ?? 0) + 1,
      round: {
        ...round,
        votesByVoterId: round.votesByVoterId ?? {}, // 동점 재투표라면 보통 {}
      },
    };
  }

  return state;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const v = Number(url.searchParams.get("v") ?? "0") || 0;
  const now = Date.now();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion } = await getOrCreateGame();

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

      const ids = (next.players ?? []).map(p => p.playerId);
      const scoreMap = await buildScoreMap(ids);
      return NextResponse.json(toPublicState(next, scoreMap));
    }

    // ✅ 그 외엔 현재 state 그대로 반환
    const ids = (state.players ?? []).map(p => p.playerId);
    const scoreMap = await buildScoreMap(ids);
    return NextResponse.json(toPublicState(state, scoreMap));
  }

  // ✅ CAS 충돌이 계속 나면 그냥 최신 상태 1번 더 읽어서 반환
  const { state } = await getOrCreateGame();
  const ids = (state.players ?? []).map(p => p.playerId);
  const scoreMap = await buildScoreMap(ids);
  return NextResponse.json(toPublicState(state, scoreMap));
}
