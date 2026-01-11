// 수박게임 점수 저장 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerId = typeof body.playerId === "string" ? body.playerId : "";
    const score = typeof body.score === "number" ? body.score : 0;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
    const maxTier = typeof body.maxTier === "number" ? body.maxTier : null;

    if (!playerId) {
      return NextResponse.json({ error: "player_id_required" }, { status: 400 });
    }

    if (score < 0 || !Number.isFinite(score)) {
      return NextResponse.json({ error: "invalid_score" }, { status: 400 });
    }

    // 플레이어 존재 확인
    const player = await prisma.watermelonPlayer.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return NextResponse.json({ error: "player_not_found" }, { status: 404 });
    }

    // 세션 ID가 있으면 같은 세션의 기존 레코드를 찾아서 업데이트
    if (sessionId) {
      // 같은 세션의 가장 최근 레코드를 찾기 (5분 이내 생성된 것만)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existingScore = await prisma.watermelonScore.findFirst({
        where: {
          playerId,
          createdAt: {
            gte: fiveMinutesAgo,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // 같은 세션의 기존 레코드가 있고, 새 점수가 더 높으면 업데이트
      if (existingScore && score > existingScore.score) {
        await prisma.watermelonScore.update({
          where: { id: existingScore.id },
          data: { 
            score,
            maxTier: maxTier !== null ? maxTier : undefined,
          },
        });
        return NextResponse.json({ success: true, updated: true });
      }

      // 같은 세션의 기존 레코드가 있고, 새 점수가 같거나 낮으면 무시
      if (existingScore && score <= existingScore.score) {
        return NextResponse.json({ success: true, skipped: true });
      }
    }

    // 새로운 레코드 생성 (세션 ID가 없거나, 같은 세션의 레코드가 없는 경우)
    await prisma.watermelonScore.create({
      data: {
        playerId,
        score,
        maxTier: maxTier !== null ? maxTier : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Watermelon score API error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ 
      error: "internal_error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
