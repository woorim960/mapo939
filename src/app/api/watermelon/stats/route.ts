// 수박게임 통계 조회 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const playerId = url.searchParams.get("playerId")?.trim();
    const period = url.searchParams.get("period") || "all";

    // 날짜 필터 계산
    const now = new Date();
    let startDate: Date | null = null;

    if (period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (period === "week") {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // 월요일 기준
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    if (playerId) {
      // 특정 플레이어 통계
      const player = await prisma.watermelonPlayer.findUnique({
        where: { id: playerId },
        include: {
          scores: {
            where: startDate
              ? {
                  createdAt: {
                    gte: startDate,
                  },
                }
              : undefined,
          },
        },
      });

      if (!player) {
        return NextResponse.json({ error: "player_not_found" }, { status: 404 });
      }

      const scores = player.scores.map((s) => s.score);
      const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const averageScore =
        scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0;
      const playCount = player.scores.length;
      const recentScores = scores.slice(-10).reverse();
      
      // 최대 과일 레벨 평균 계산
      const maxTiers = player.scores
        .map((s) => s.maxTier)
        .filter((tier): tier is number => tier !== null && tier !== undefined);
      const averageMaxTier =
        maxTiers.length > 0
          ? Math.round((maxTiers.reduce((sum, t) => sum + t, 0) / maxTiers.length) * 10) / 10
          : null;

      const playerData: any = {
        id: player.id,
        nickname: player.nickname,
        bestScore,
        averageScore,
        playCount,
        recentScores,
      };
      
      if (averageMaxTier !== null) {
        playerData.averageMaxTier = averageMaxTier;
      }

      return NextResponse.json({
        player: playerData,
      });
    } else {
      // 전체 통계 (리더보드)
      const whereClause = startDate
        ? {
            createdAt: {
              gte: startDate,
            },
          }
        : undefined;

      const topPlayers = await prisma.watermelonScore.groupBy({
        by: ["playerId"],
        where: whereClause,
        _max: {
          score: true,
        },
        orderBy: {
          _max: {
            score: "desc",
          },
        },
        take: 10,
      });

      const playerIds = topPlayers.map((p) => p.playerId);
      const players = await prisma.watermelonPlayer.findMany({
        where: { id: { in: playerIds } },
        include: {
          scores: {
            where: whereClause,
          },
        },
      });

      const leaderboard = players
        .map((player) => {
          const scores = player.scores.map((s) => s.score);
          const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
          const averageScore =
            scores.length > 0
              ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
              : 0;
          const playCount = player.scores.length;

          return {
            id: player.id,
            nickname: player.nickname,
            bestScore,
            averageScore,
            playCount,
          };
        })
        .sort((a, b) => b.bestScore - a.bestScore);

      return NextResponse.json({ leaderboard });
    }
  } catch (error) {
    console.error("Watermelon stats API error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
