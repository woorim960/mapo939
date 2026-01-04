import { NextResponse } from "next/server";
import { getOrCreateGame } from "@/lib/liar/db";
import { QUESTIONS } from "@/lib/liar/questions";
import type { Role } from "@/lib/liar/types";

export const runtime = "nodejs";

type Body = { playerId: string };

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as Body;
  const playerId = body.playerId;

  if (!playerId) return NextResponse.json({ error: "playerId_required" }, { status: 400 });

  const { state } = await getOrCreateGame();

  const role: Role | null = state.round.rolesByPlayerId[playerId] ?? null;

  // 질문 텍스트는 role에 따라 다르게
  const q = state.round.questionId
    ? QUESTIONS.find(x => x.id === state.round.questionId) ?? null
    : null;

  const payload =
    role === "LIAR"
      ? { role, min: state.round.min, max: state.round.max, question: null }
      : { role, min: state.round.min, max: state.round.max, question: q?.text ?? null };

  return NextResponse.json(payload);
}
