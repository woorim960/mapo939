import { NextResponse } from "next/server";
import { getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";
import { QUESTIONS } from "@/lib/liar/questions"; // 질문 50개 배열 [{id, text, min, max}]

export const runtime = "nodejs";

type Body = { playerId: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestion(state: GameState) {
  const unused = QUESTIONS.filter(q => !state.usedQuestionIds.includes(q.id));
  const list = unused.length > 0 ? unused : QUESTIONS; // 50개 소진 시 리셋
  return list[Math.floor(Math.random() * list.length)];
}

function buildNextState(state: GameState): GameState {
  const alive = state.players.filter(p => p.isAlive);
  const aliveCount = alive.length;

  // 안전장치
  if (aliveCount < 3) return state;

  // 역할 수 계산
  const liarCount = Math.max(1, Math.floor(aliveCount / 4));
  const trollCount = liarCount;

  const shuffled = shuffle(alive.map(p => p.playerId));
  const liars = new Set(shuffled.slice(0, liarCount));
  const trolls = new Set(shuffled.slice(liarCount, liarCount + trollCount));

  const rolesByPlayerId: GameState["round"]["rolesByPlayerId"] = {};
  for (const p of alive) {
    if (liars.has(p.playerId)) rolesByPlayerId[p.playerId] = "LIAR";
    else if (trolls.has(p.playerId)) rolesByPlayerId[p.playerId] = "TROLL";
    else rolesByPlayerId[p.playerId] = "AUDIENCE";
  }

  const q = pickQuestion(state);
  const now = Date.now();

  return {
    ...state,
    phase: "ANSWERING",
    usedQuestionIds: state.usedQuestionIds.includes(q.id)
      ? state.usedQuestionIds
      : [...state.usedQuestionIds, q.id],
    round: {
      index: state.round.index + 1,
      questionId: q.id,
      min: q.min,
      max: q.max,
      rolesByPlayerId,
      answersByPlayerId: {},
      votesByVoterId: {},
      questionChangeByPlayerId: {},
      answeringEndsAt: now + 60_000,
      discussEndsAt: null,
      tieDiscussEndsAt: null,
    },
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

    // 방장만 시작 가능
    if (!state.hostPlayerId || state.hostPlayerId !== playerId) {
      return NextResponse.json({ error: "only_host" }, { status: 403 });
    }

    // 이미 시작된 경우
    if (state.phase !== "PREP") {
      return NextResponse.json({ ok: true });
    }

    const aliveCount = state.players.filter(p => p.isAlive).length;
    if (aliveCount < 3) {
      return NextResponse.json({ error: "not_enough_players" }, { status: 400 });
    }

    const next = buildNextState(state);
    const res = await updateGameCAS(dbVersion, next);
    if (res.ok) {
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
