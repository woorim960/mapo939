// 수박게임 플레이어 생성/조회 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";

    if (!nickname) {
      return NextResponse.json({ error: "nickname_required" }, { status: 400 });
    }

    if (nickname.length > 20) {
      return NextResponse.json({ error: "nickname_too_long" }, { status: 400 });
    }

    // 닉네임으로 플레이어 찾기 또는 생성
    const player = await prisma.watermelonPlayer.upsert({
      where: { nickname },
      update: {
        updatedAt: new Date(),
      },
      create: {
        nickname,
      },
      include: {
        scores: {
          orderBy: { score: "desc" },
          take: 1,
        },
        _count: {
          select: { scores: true },
        },
      },
    });

    // 통계 계산
    const bestScore = player.scores[0]?.score ?? 0;
    const playCount = player._count.scores;

    const allScores = await prisma.watermelonScore.findMany({
      where: { playerId: player.id },
      select: { score: true },
    });

    const averageScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length)
        : 0;

    return NextResponse.json({
      player: {
        id: player.id,
        nickname: player.nickname,
        bestScore,
        playCount,
        averageScore,
      },
    });
  } catch (error: any) {
    console.error("Watermelon player API error:", error);
    if (error.code === "P2002") {
      // Unique constraint violation - shouldn't happen with upsert, but just in case
      return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
