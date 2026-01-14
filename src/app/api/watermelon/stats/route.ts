// 수박게임 통계 조회 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getKstNow } from "@/lib/kst";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const playerId = url.searchParams.get("playerId")?.trim();
    const period = url.searchParams.get("period") || "all";

    // 날짜 필터 계산 (KST 기준)
    const kstNow = getKstNow();
    let startDate: Date | null = null;

    if (period === "today") {
      // KST 오늘 00:00 = UTC 전날 15:00
      const y = kstNow.getFullYear();
      const m = kstNow.getMonth();
      const d = kstNow.getDate();
      startDate = new Date(Date.UTC(y, m, d, -9, 0, 0));
    } else if (period === "week") {
      // KST 이번주 월요일 00:00
      const dayOfWeek = kstNow.getDay();
      const diff = kstNow.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // 월요일 기준
      const monday = new Date(kstNow.getFullYear(), kstNow.getMonth(), diff, 0, 0, 0, 0);
      const y = monday.getFullYear();
      const m = monday.getMonth();
      const d = monday.getDate();
      startDate = new Date(Date.UTC(y, m, d, -9, 0, 0));
    } else if (period === "month") {
      // KST 이번달 1일 00:00
      const y = kstNow.getFullYear();
      const m = kstNow.getMonth();
      startDate = new Date(Date.UTC(y, m, 1, -9, 0, 0));
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

      // 포인트 정보 조회
      const gamePoints = player.gamePoints ?? 1000;
      
      // 수박 게임 포인트 총 획득 및 사용 내역 계산
      const [paymentTotal, purchaseTotal] = await Promise.all([
        // 결제로 획득한 포인트 (완료된 결제만)
        prisma.watermelonPayment.aggregate({
          where: {
            playerId,
            status: "completed",
          },
          _sum: {
            amount: true,
          },
        }),
        // 게임 포인트로 구매한 내역 (사용 포인트)
        prisma.watermelonItemPurchase.aggregate({
          where: {
            playerId,
            pointType: "game",
            pointsUsed: { not: null },
          },
          _sum: {
            pointsUsed: true,
          },
        }),
      ]);
      
      const totalEarnedGamePoints = 1000 + (paymentTotal._sum.amount ?? 0); // 초기 1000 + 결제 획득
      const totalUsedGamePoints = purchaseTotal._sum.pointsUsed ?? 0;
      
      let attendancePoints = 0;
      
      if (player.memberId) {
        let usedPoints = { _sum: { pointsUsed: null as number | null } };
        try {
          usedPoints = await prisma.attendancePointsUsage.aggregate({
            where: { memberId: player.memberId },
            _sum: { pointsUsed: true },
          });
        } catch (err: any) {
          console.warn("Failed to get attendance points usage, assuming 0:", err?.message);
          usedPoints = { _sum: { pointsUsed: 0 } };
        }

        const [attendancePointsSum, bonusPointsSum] = await Promise.all([
          prisma.attendance.aggregate({
            where: {
              memberId: player.memberId,
              status: { in: ["PRESENT", "LATE"] },
            },
            _sum: { points: true },
          }),
          prisma.bonusPoints.aggregate({
            where: { memberId: player.memberId },
            _sum: { points: true },
          }),
        ]);
        
        const totalEarned = (attendancePointsSum._sum.points ?? 0) + (bonusPointsSum._sum.points ?? 0);
        const totalUsed = usedPoints._sum.pointsUsed ?? 0;
        attendancePoints = totalEarned - totalUsed;
      }

      const playerData: any = {
        id: player.id,
        nickname: player.nickname,
        bestScore,
        averageScore,
        playCount,
        recentScores,
        gamePoints,
        gamePointsTotalEarned: totalEarnedGamePoints,
        gamePointsTotalUsed: totalUsedGamePoints,
        attendancePoints,
        memberId: player.memberId,
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
