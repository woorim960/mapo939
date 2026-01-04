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

  return { role, min, max, question };
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Body | null;
  const playerId = body?.playerId?.trim();

  if (!playerId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const p = prisma();

  // DB에 player 존재 확인(닉네임/점수)
  const player = await p.liarPlayer.findUnique({ where: { id: playerId } });
  if (!player) {
    return NextResponse.json({ error: "unknown_player" }, { status: 404 });
  }

  // state에 없으면 복구(addPlayerIfMissing) + CAS
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion } = await getOrCreateGame();
    const next = addPlayerIfMissing(state, playerId, player.nickname);

    if (next === state) {
      return NextResponse.json(toMeState(next, playerId));
    }

    const res = await updateGameCAS(dbVersion, next);
    if (res.ok) {
      return NextResponse.json(toMeState(next, playerId));
    }
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
