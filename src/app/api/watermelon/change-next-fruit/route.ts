// 다음 과일 변경 API (랜덤/지정)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getItemById } from "@/features/watermelon/utils/items";

type PointType = "game" | "attendance";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
    const changeType = typeof body.changeType === "string" ? body.changeType : ""; // "random" | "select"
    const selectedTier = typeof body.selectedTier === "number" ? body.selectedTier : undefined; // 지정 변경용
    const pointType: PointType = body.pointType === "attendance" ? "attendance" : "game";

    if (!playerId || !changeType || (changeType === "select" && selectedTier === undefined)) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 플레이어 찾기
      const player = await tx.watermelonPlayer.findUnique({
        where: { id: playerId },
        select: { id: true, gamePoints: true, memberId: true },
      });

      if (!player) {
        throw new Error("player_not_found");
      }

      let totalPrice = 0;
      let newTier: number;

      if (changeType === "random") {
        // 랜덤 변경: 5P
        totalPrice = 5;
        // 클라이언트에서 maxUnlockedTier를 전달받아야 하지만, 일단은 0-10 랜덤
        // 실제로는 클라이언트에서 계산한 랜덤 tier를 받거나, 여기서 계산
        const maxTier = typeof body.maxTier === "number" ? body.maxTier : 10;
        newTier = Math.floor(Math.random() * (maxTier + 1));
      } else if (changeType === "select") {
        // 지정 변경: 레벨 × 10P
        if (selectedTier === undefined || selectedTier < 0 || selectedTier > 10) {
          throw new Error("invalid_tier");
        }
        totalPrice = selectedTier * 10;
        newTier = selectedTier;
      } else {
        throw new Error("invalid_change_type");
      }

      // 포인트 확인 및 차감
      if (pointType === "game") {
        const currentPoints = player.gamePoints ?? 1000;
        if (currentPoints < totalPrice) {
          throw new Error("insufficient_points");
        }

        // 포인트 차감
        await tx.watermelonPlayer.update({
          where: { id: playerId },
          data: { gamePoints: { decrement: totalPrice } },
        });
      } else {
        // 출석 포인트 사용
        if (!player.memberId) {
          throw new Error("not_connected");
        }

        // 출석 포인트 계산
        let usedPoints = { _sum: { pointsUsed: null as number | null } };
        try {
          usedPoints = await tx.attendancePointsUsage.aggregate({
            where: { memberId: player.memberId },
            _sum: { pointsUsed: true },
          });
        } catch (err: any) {
          console.warn("Failed to get attendance points usage, assuming 0:", err?.message);
          usedPoints = { _sum: { pointsUsed: 0 } };
        }

        const [attendancePoints, bonusPoints] = await Promise.all([
          tx.attendance.aggregate({
            where: {
              memberId: player.memberId,
              status: { in: ["PRESENT", "LATE"] },
            },
            _sum: { points: true },
          }),
          tx.bonusPoints.aggregate({
            where: { memberId: player.memberId },
            _sum: { points: true },
          }),
        ]);

        const totalEarned =
          (attendancePoints._sum.points ?? 0) + (bonusPoints._sum.points ?? 0);
        const totalUsed = usedPoints._sum.pointsUsed ?? 0;
        const availablePoints = totalEarned - totalUsed;

        if (availablePoints < totalPrice) {
          throw new Error("insufficient_points");
        }
      }

      // 업데이트된 플레이어 정보 가져오기
      const updatedPlayer = await tx.watermelonPlayer.findUnique({
        where: { id: playerId },
        select: { gamePoints: true },
      });

      return { newTier, totalPrice, newGamePoints: updatedPlayer?.gamePoints ?? player.gamePoints ?? 1000 };
    }, {
      timeout: 10000,
    });

    return NextResponse.json({
      success: true,
      newTier: result.newTier,
      newGamePoints: result.newGamePoints,
    });
  } catch (error: any) {
    console.error("Change next fruit API error:", error);
    
    const errorMessage = error.message || "internal_error";
    if (errorMessage === "player_not_found") {
      return NextResponse.json({ error: "player_not_found" }, { status: 404 });
    }
    if (errorMessage === "insufficient_points") {
      return NextResponse.json({ error: "insufficient_points" }, { status: 400 });
    }
    if (errorMessage === "not_connected") {
      return NextResponse.json({ error: "not_connected" }, { status: 400 });
    }
    if (errorMessage === "invalid_tier") {
      return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
    }
    if (errorMessage === "invalid_change_type") {
      return NextResponse.json({ error: "invalid_change_type" }, { status: 400 });
    }
    
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
