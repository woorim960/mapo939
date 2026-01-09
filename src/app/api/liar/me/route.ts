import { NextResponse } from "next/server";
import { prisma, getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";
import { QUESTIONS } from "@/lib/liar/questions"; // 너가 만든 questions.ts

export const runtime = "nodejs";

type Body = { playerId: string };

type MeState = {
  role: "AUDIENCE" | "LIAR" | "TROLL" | null;
  min: number;
  max: number;
  question: string | null;
  votedTargetId?: string | null;
};

function addPlayerIfMissing(state: GameState, playerId: string, nickname: string): GameState {
  const exists = state.players?.some(p => p.playerId === playerId);
  if (exists) return state;

  const players = [...(state.players ?? [])];

  const isFirst = players.length === 0;
  players.push({
    playerId,
    nickname,
    isAlive: true,
    isHost: isFirst,
    joinedAt: Date.now(),
  });

  return {
    ...state,
    hostPlayerId: state.hostPlayerId ?? (isFirst ? playerId : null),
    players,
    phase: players.length >= 3 ? "PREP" : "LOBBY",
  };
}

function findQuestionText(questionId: string | null | undefined): string | null {
  if (!questionId) return null;
  const q = QUESTIONS.find(x => x.id === questionId);
  return q?.text ?? null;
}

function toMeState(state: GameState, playerId: string): MeState {
  const role = (state.round?.rolesByPlayerId?.[playerId] ?? null) as MeState["role"];

  const min = state.round?.min ?? 0;
  const max = state.round?.max ?? 0;

  const text = findQuestionText(state.round?.questionId);

  // ✅ REVEAL 이후엔 라이어도 질문 공개
  const revealOrLater =
    state.phase === "REVEAL" ||
    state.phase === "DISCUSS" ||
    state.phase === "VOTING" ||
    state.phase === "TIE_DISCUSS" ||
    state.phase === "RESULT" ||
    state.phase === "GAME_OVER";

  // ✅ 라이어는 REVEAL 전까지만 질문 숨김
  const question = role === "LIAR" && !revealOrLater ? null : text;

  // ✅ 투표 정보 포함
  const votesByVoterId = (state.round as any)?.votesByVoterId ?? {};
  const votedTargetId = votesByVoterId[playerId] ?? null;

  return { role, min, max, question, votedTargetId };
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Body | null;
  const playerId = body?.playerId?.trim();

  if (!playerId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // ✅ 먼저 게임 상태 확인
  const { state } = await getOrCreateGame();
  const phase = state.phase ?? "LOBBY";
  const canJoinNow = phase === "LOBBY" || phase === "PREP";

  // ✅ 게임 상태의 players에서 playerId 찾기
  const playerInState = (state.players ?? []).find(p => p.playerId === playerId);

  // ✅ 게임 상태에 이미 있으면 바로 반환 (DB 체크 불필요)
  if (playerInState) {
    return NextResponse.json(toMeState(state, playerId));
  }

  const p = prisma();

  // ✅ LOBBY나 PREP 상태에서는 DB에 player가 없어도 허용
  if (canJoinNow) {
    // DB에 있으면 게임 상태에 추가 시도
    const player = await p.liarPlayer.findUnique({ where: { id: playerId } });
    
    if (player) {
      // DB에 있으면 게임 상태에 추가
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { state: currentState, dbVersion } = await getOrCreateGame();
        const next = addPlayerIfMissing(currentState, playerId, player.nickname);

        if (next === currentState) {
          return NextResponse.json(toMeState(next, playerId));
        }

        const res = await updateGameCAS(dbVersion, next);
        if (res.ok) {
          return NextResponse.json(toMeState(next, playerId));
        }
      }

      return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
    }

    // ✅ DB에 없지만 LOBBY/PREP 상태면 기본 MeState 반환 (아직 참가 전)
    return NextResponse.json(toMeState(state, playerId));
  }

  // ✅ 게임이 시작된 후(ANSWERING 이후)에는 DB에 player가 반드시 있어야 함
  const player = await p.liarPlayer.findUnique({ where: { id: playerId } });
  if (!player) {
    return NextResponse.json({ error: "unknown_player" }, { status: 404 });
  }

  // state에 없으면 복구(addPlayerIfMissing) + CAS
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state: currentState, dbVersion } = await getOrCreateGame();
    const next = addPlayerIfMissing(currentState, playerId, player.nickname);

    if (next === currentState) {
      return NextResponse.json(toMeState(next, playerId));
    }

    const res = await updateGameCAS(dbVersion, next);
    if (res.ok) {
      return NextResponse.json(toMeState(next, playerId));
    }
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
