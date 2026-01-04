import { NextResponse } from "next/server";
import { getOrCreateGame } from "@/lib/liar/db";

// Node runtime
export const runtime = "nodejs";

function asInt(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const clientV = asInt(url.searchParams.get("v"));

  const { state, dbVersion } = await getOrCreateGame();

  if (clientV !== null && clientV === dbVersion) {
    return new Response(null, { status: 204 });
  }

  // 여기서는 “공용 상태”만 보냄 (역할/질문 비공개 정보는 절대 포함 X)
  const publicState = {
    version: dbVersion,
    phase: state.phase,
    hostPlayerId: state.hostPlayerId,
    players: state.players.map(p => ({
      playerId: p.playerId,
      nickname: p.nickname,
      isAlive: p.isAlive,
      isHost: p.isHost,
    })),
    round: {
      index: state.round.index,
      questionId: state.round.questionId, // 질문 텍스트는 공개해도 되지만, 라이어에게는 안 보여야 하므로 클라에서 “내 role”에 따라 숨김 처리할 것
      min: state.round.min,
      max: state.round.max,
      answersByPlayerId: state.round.answersByPlayerId, // REVEAL 이후만 채우게 만들면 됨
      voteCounts: countVotes(state.round.votesByVoterId),
      questionChangeCount: Object.values(state.round.questionChangeByPlayerId).filter(Boolean).length,
      answeringEndsAt: state.round.answeringEndsAt,
      discussEndsAt: state.round.discussEndsAt,
      tieDiscussEndsAt: state.round.tieDiscussEndsAt,
    },
    lastEliminatedPlayerId: state.lastEliminatedPlayerId,
    lastEliminatedWasTroll: state.lastEliminatedWasTroll,
    championPlayerId: state.championPlayerId,
  };

  return NextResponse.json(publicState);
}

function countVotes(votesByVoterId: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const targetId of Object.values(votesByVoterId)) {
    out[targetId] = (out[targetId] ?? 0) + 1;
  }
  return out;
}
