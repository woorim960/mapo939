import { NextResponse } from "next/server";
import { getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";
import { QUESTIONS } from "@/lib/liar/questions";

export const runtime = "nodejs";

type Body = {
  playerId: string;
  roomId: string;

  // ✅ 프론트 입력(선택)
  liarCount?: number;
  trollCount?: number;
  audienceCount?: number;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestion(state: GameState) {
  const used = state.usedQuestionIds ?? [];
  const unused = QUESTIONS.filter(q => !used.includes(q.id));
  const list = unused.length > 0 ? unused : QUESTIONS;
  return list[Math.floor(Math.random() * list.length)];
}

/** ✅ 네가 제시한 기본 배치(무한대까지) */
function defaultRoleCounts(n: number): { liar: number; troll: number; audience: number } {
  if (n < 3) return { liar: 0, troll: 0, audience: n };

  // liar: 3~6 ->1, 7~10 ->2, 11~14 ->3 ...
  const liar = Math.max(1, Math.floor((n + 1) / 4));

  let troll = 0;
  if (n === 3) {
    troll = 0;
  } else {
    const r = n % 4;
    if (r === 0 || r === 1) troll = liar;
    else if (r === 2) troll = liar + 1;
    else troll = Math.max(0, liar - 1); // r === 3
  }

  const audience = n - liar - troll;
  return { liar, troll, audience };
}

function isNonNegInt(x: unknown): x is number {
  return typeof x === "number" && Number.isInteger(x) && x >= 0;
}

function buildNextState(state: GameState, counts: { liar: number; troll: number }): GameState {
  const alive = (state.players ?? []).filter(p => p.isAlive);
  const aliveCount = alive.length;

  if (aliveCount < 3) return state;

  const liarCount = counts.liar;
  const trollCount = counts.troll;
  const audienceCount = aliveCount - liarCount - trollCount;

  // ✅ 최소 조건
  if (liarCount < 1) return state;
  if (liarCount + trollCount > aliveCount) return state;
  if (audienceCount < 1) return state;

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
  const used = state.usedQuestionIds ?? [];

  return {
    ...state,
    version: (state.version ?? 0) + 1,
    phase: "ANSWERING",
    usedQuestionIds: used.includes(q.id) ? used : [...used, q.id],
    round: {
      index: (state.round?.index ?? 0) + 1,
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
  const body = (await req.json().catch(() => null)) as Body | null;

  const playerId = body?.playerId?.trim();
  const roomId = body?.roomId?.trim();
  if (!playerId || !roomId) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  // ✅ 입력(선택)
  const liarInput = body?.liarCount;
  const trollInput = body?.trollCount;
  const audienceInput = body?.audienceCount;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion } = await getOrCreateGame(roomId);

    // 방장만 시작 가능
    if (!state.hostPlayerId || state.hostPlayerId !== playerId) {
      return NextResponse.json({ error: "only_host" }, { status: 403 });
    }

    // 이미 시작된 경우
    if (state.phase !== "PREP") {
      return NextResponse.json({ ok: true });
    }

    const aliveCount = (state.players ?? []).filter(p => p.isAlive).length;
    if (aliveCount < 3) {
      return NextResponse.json({ error: "not_enough_players" }, { status: 400 });
    }

    const base = defaultRoleCounts(aliveCount);

    const anyRoleProvided =
      liarInput !== undefined || trollInput !== undefined || audienceInput !== undefined;

    // ✅ 1) 아무 입력 없으면 기본값 그대로
    // ✅ 2) 하나라도 입력 있으면:
    //    - 빈 값(undef)은 기본값(또는 0)으로 처리하지 않고 "기본"으로 유지
    //    - 대신 검증은 liar+troll+audienceInput <= aliveCount 만 수행
    const liar = liarInput === undefined ? base.liar : liarInput;
    const troll = trollInput === undefined ? base.troll : trollInput;

    // audienceInput은 "최소로 확보하고 싶은 관객 수"처럼 취급
    // (남는 인원은 자동으로 관객에 추가됨)
    const audMin = audienceInput === undefined ? 0 : audienceInput;

    // 타입/값 검증
    if (!isNonNegInt(liar) || !isNonNegInt(troll) || !isNonNegInt(audMin)) {
      return NextResponse.json({ error: "invalid_role_counts" }, { status: 400 });
    }

    // ✅ 필수 조건
    if (liar < 1) {
      return NextResponse.json({ error: "liar_must_be_at_least_1" }, { status: 400 });
    }
    if (liar + troll > aliveCount) {
      return NextResponse.json({ error: "role_counts_exceed_players" }, { status: 400 });
    }

    const finalAudience = aliveCount - liar - troll;
    if (finalAudience < 1) {
      return NextResponse.json({ error: "audience_must_be_at_least_1" }, { status: 400 });
    }

    // ✅ 네 요구: liar+troll+audience <= 전체 인원수 이하만 검증
    // audienceInput이 주어졌다면, audMin <= finalAudience (동치로 sum <= aliveCount)
    if (anyRoleProvided) {
      if (liar + troll + audMin > aliveCount) {
        return NextResponse.json({ error: "role_sum_exceed_players" }, { status: 400 });
      }
      // audMin이 너무 크면 finalAudience가 못 맞추니까 여기서도 걸러짐(위 조건으로 충분)
    }

    const next = buildNextState(state, { liar, troll });
    if (next === state) {
      return NextResponse.json({ error: "cannot_build_state" }, { status: 400 });
    }

    const res = await updateGameCAS(roomId, dbVersion, next);
    if (res.ok) {
      return NextResponse.json({
        ok: true,
        applied: { liar, troll, audience: finalAudience },
      });
    }
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
